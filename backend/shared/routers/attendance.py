from __future__ import annotations

import base64
import io
import json
from datetime import datetime
from typing import Annotated

import requests
from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from shared.config import settings
from shared.database import get_db
from shared.helpers import create_daily_message_with_ai
from shared.models import StudentAttendanceLog, StudentRoutine, User
from shared.security import get_current_user, get_token_payload

router = APIRouter(prefix="/attendance", tags=["attendance"])


class MarkAttendanceBody(BaseModel):
    type: str | None = None
    data: dict | None = None


def _fail(message: str, status: int = 400) -> JSONResponse:
    return JSONResponse({"success": False, "message": message}, status_code=status)


def _secure_filename(filename: str) -> str:
    return "".join(c for c in filename if c.isalnum() or c in "._-").lower()


@router.post("/routine/upload")
def upload_routine(
    routine_text: str = Form(""),
    file: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    raw_text = routine_text

    if file and file.filename:
        try:
            filename = _secure_filename(file.filename)
            content = file.file.read()
            if filename.endswith(".txt"):
                raw_text = content.decode("utf-8")
            elif filename.endswith(".pdf"):
                try:
                    import pypdf

                    pdf = pypdf.PdfReader(io.BytesIO(content))
                    raw_text = " ".join([page.extract_text() or "" for page in pdf.pages])
                except ImportError:
                    return _fail("Server missing 'pypdf' library", 500)
            elif filename.endswith((".png", ".jpg", ".jpeg", ".webp")):
                image_data = base64.b64encode(content).decode("utf-8")
                try:
                    vision_resp = requests.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {settings.groq_api_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": "llama-3.2-11b-vision-preview",
                            "messages": [
                                {
                                    "role": "user",
                                    "content": [
                                        {
                                            "type": "text",
                                            "text": (
                                                "Analyze this image of a class schedule. Extract every single piece of text "
                                                "visible, maintaining the structure as much as possible to help identify which "
                                                "classes belong to which days and times. Output only the raw text content."
                                            ),
                                        },
                                        {
                                            "type": "image_url",
                                            "image_url": {"url": f"data:image/jpeg;base64,{image_data}"},
                                        },
                                    ],
                                }
                            ],
                        },
                        timeout=60,
                    )
                    if vision_resp.status_code != 200:
                        raise Exception(f"Groq Vision API Error ({vision_resp.status_code}): {vision_resp.text}")
                    raw_text = vision_resp.json()["choices"][0]["message"]["content"]
                except Exception as e:
                    return _fail(f"Vision AI Failed: {str(e)}", 500)
        except Exception as e:
            return _fail(f"File processing failed: {str(e)}", 400)

    if not raw_text:
        return _fail("No routine content found", 400)

    sys_prompt = """You are a strict JSON data extraction assistant. Your task is to extract a weekly class routine from the provided unstructured text (which may contain OCR errors).
    1. Identify days of the week (Monday, Tuesday, etc.).
    2. For each day, list the classes in chronological order.
    3. Format each class as simple text: 'SubjectName (Time)'. Example: 'Mathematics (10:00 AM)'.
    4. Return ONLY a valid JSON object. Keys must be full English day names (e.g., 'Monday'). Values must be Lists of strings.
    5. Ignore unrelated text, headers, or footers.
    6. If a day has no classes, do not include it in the JSON.
    7. Do not wrap the output in markdown code blocks.
    8. Use standard full day names: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.
        """
    try:
        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama3-70b-8192",
                "messages": [
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": f"Extract routine from this text:\n\n{raw_text}"},
                ],
                "response_format": {"type": "json_object"},
            },
            timeout=60,
        )
        if resp.status_code != 200:
            raise Exception(f"Groq Parsing API Error ({resp.status_code}): {resp.text}")
        parsed_routine = json.loads(resp.json()["choices"][0]["message"]["content"])
    except Exception as e:
        return _fail(f"AI Parsing Failed: {str(e)}", 500)

    try:
        db.query(StudentRoutine).filter_by(user_id=current_user.id).delete()
        for day, subs in parsed_routine.items():
            if isinstance(subs, list) and subs:
                db.add(StudentRoutine(user_id=current_user.id, day_of_week=day, subjects=json.dumps(subs)))
        db.commit()
        return {"success": True, "message": "Routine updated from file/text", "routine": parsed_routine}
    except Exception as e:
        db.rollback()
        return _fail(str(e), 500)


@router.get("/routine")
def get_routine(
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    user_id = int(payload.get("sub"))
    routines = db.query(StudentRoutine).filter_by(user_id=user_id).all()
    out = {r.day_of_week: json.loads(r.subjects) for r in routines}
    return {"success": True, "routine": out}


@router.delete("/routine")
def delete_routine(
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    user_id = int(payload.get("sub"))
    db.query(StudentRoutine).filter_by(user_id=user_id).delete()
    db.commit()
    return {"success": True, "message": "Routine deleted"}


@router.get("/today")
def get_today_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = datetime.utcnow().date()
    day_name = today.strftime("%A")

    if day_name == "Sunday":
        msg = create_daily_message_with_ai("sunday", current_user.name)
        return {"status": "holiday", "message": msg, "can_mark": False}

    logs = db.query(StudentAttendanceLog).filter_by(user_id=current_user.id, date=today).all()
    if logs:
        if len(logs) == 1 and logs[0].status == "No Class":
            msg = create_daily_message_with_ai("no_class", current_user.name)
            return {"status": "marked_no_class", "can_mark": False, "fun_message": msg}

        log_data = [{"subject": l.subject, "status": l.status} for l in logs]
        present_count = sum(1 for l in logs if l.status == "Present")
        total = len(logs)
        mood = "good" if (total > 0 and (present_count / total) > 0.75) else "bad"
        msg = create_daily_message_with_ai(mood, current_user.name)
        return {"status": "marked", "logs": log_data, "can_mark": False, "fun_message": msg}

    routine = db.query(StudentRoutine).filter_by(user_id=current_user.id, day_of_week=day_name).first()
    if not routine:
        return {
            "status": "pending",
            "subjects": [],
            "message": "No routine found for today. Add one first?",
            "can_mark": False,
        }

    subjects = json.loads(routine.subjects)
    return {"status": "pending", "subjects": subjects, "can_mark": True}


@router.post("/mark")
def mark_attendance(
    body: MarkAttendanceBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = datetime.utcnow().date()
    if db.query(StudentAttendanceLog).filter_by(user_id=current_user.id, date=today).first():
        return _fail("Already marked for today", 400)

    mark_type = body.type
    try:
        if mark_type == "no_class":
            db.add(
                StudentAttendanceLog(
                    user_id=current_user.id,
                    date=today,
                    subject=None,
                    status="No Class",
                )
            )
            msg = create_daily_message_with_ai("no_class", current_user.name)
            db.commit()
            return {"success": True, "message": "Enjoy your day!", "fun_message": msg}

        if mark_type == "classes":
            attendance_map = body.data or {}
            present_count = 0
            total_count = 0
            for sub, status in attendance_map.items():
                db.add(
                    StudentAttendanceLog(
                        user_id=current_user.id,
                        date=today,
                        subject=sub,
                        status=status,
                    )
                )
                if status == "Present":
                    present_count += 1
                total_count += 1
            db.commit()
            mood = "good" if (total_count > 0 and (present_count / total_count) > 0.75) else "bad"
            msg = create_daily_message_with_ai(mood, current_user.name)
            return {"success": True, "message": "Attendance Saved", "fun_message": msg}

        return _fail("Invalid type", 400)
    except Exception as e:
        db.rollback()
        return _fail(str(e), 500)


@router.delete("/today")
def reset_today(
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    user_id = int(payload.get("sub"))
    today = datetime.utcnow().date()
    try:
        db.query(StudentAttendanceLog).filter_by(user_id=user_id, date=today).delete()
        db.commit()
        return {"success": True, "message": "Today's attendance reset."}
    except Exception as e:
        db.rollback()
        return _fail(str(e), 500)


@router.get("/stats")
def get_stats(
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    user_id = int(payload.get("sub"))
    logs = (
        db.query(StudentAttendanceLog)
        .filter(
            StudentAttendanceLog.user_id == user_id,
            StudentAttendanceLog.status.in_(["Present", "Absent"]),
        )
        .all()
    )

    total_classes = len(logs)
    if total_classes == 0:
        return {"success": True, "overall": 0, "subject_wise": []}

    present_count = sum(1 for l in logs if l.status == "Present")
    overall = (present_count / total_classes) * 100

    sub_stats: dict = {}
    for l in logs:
        if l.subject not in sub_stats:
            sub_stats[l.subject] = {"present": 0, "total": 0}
        sub_stats[l.subject]["total"] += 1
        if l.status == "Present":
            sub_stats[l.subject]["present"] += 1

    final_subs = []
    for sub, dat in sub_stats.items():
        pct = (dat["present"] / dat["total"]) * 100
        final_subs.append(
            {
                "subject": sub,
                "present": dat["present"],
                "total": dat["total"],
                "percentage": round(pct, 1),
            }
        )

    return {"success": True, "overall": round(overall, 1), "subject_wise": final_subs, "history": []}
