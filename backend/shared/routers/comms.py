from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from shared.database import get_db
from shared.email_utils import send_email
from shared.models import FacultyAllocation, Message, User
from shared.security import get_token_payload

router = APIRouter(tags=["comms"])


class ContactProfessorBody(BaseModel):
    professor_id: int | None = None
    subject: str = "Parent Inquiry"
    message: str = ""


class FacultyReplyBody(BaseModel):
    student_id: int | None = None
    reply_body: str | None = None


class ParentReplyBody(BaseModel):
    faculty_id: int | None = None
    reply_body: str | None = None


def _fail(message: str, status: int = 400) -> JSONResponse:
    return JSONResponse({"success": False, "message": message}, status_code=status)


def _require_roles(payload: dict, roles: list[str]) -> JSONResponse | None:
    if payload.get("role") not in roles:
        return _fail("Insufficient permissions", 403)
    return None


@router.get("/parent/professors")
def parent_get_professors(
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    err = _require_roles(payload, ["parent", "student"])
    if err:
        return err

    user = db.query(User).get(int(payload.get("sub")))
    if not user:
        return _fail("User not found", 404)

    allocations = (
        db.query(FacultyAllocation)
        .filter_by(degree=user.degree, semester=user.semester, section=user.section)
        .all()
    )

    professors = []
    seen_ids: set[int] = set()
    for alloc in allocations:
        prof = db.query(User).get(alloc.faculty_id)
        if prof and prof.id not in seen_ids:
            professors.append(
                {
                    "id": prof.id,
                    "name": prof.name,
                    "email": prof.email,
                    "subject": alloc.subject,
                    "allocations": [a.subject for a in allocations if a.faculty_id == prof.id],
                }
            )
            seen_ids.add(prof.id)

    return {"success": True, "professors": professors}


@router.post("/parent/contact-professor")
def parent_contact_professor(
    body: ContactProfessorBody,
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    err = _require_roles(payload, ["parent"])
    if err:
        return err

    student = db.query(User).get(int(payload.get("sub")))
    if not student:
        return _fail("Student record not found", 404)

    if not body.professor_id or not body.message:
        return _fail("Professor and message are required", 400)

    prof = db.query(User).get(body.professor_id)
    if not prof:
        return _fail("Professor not found", 404)

    reply_to = student.parent_email or f"parent_of_{student.srn}@noteorbit.com"
    email_subject = f"[NoteOrbit] Parent Query: {student.name} ({student.srn})"
    html_content = f"""
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #3b82f6; padding: 20px; color: white;">
            <h2 style="margin: 0;">Parent Communication</h2>
            <p style="margin: 5px 0 0; opacity: 0.9;">From the desk of {student.name}'s Guardian</p>
        </div>
        <div style="padding: 30px;">
            <p><strong>To:</strong> Prof. {prof.name}</p>
            <p><strong>Regarding Student:</strong> {student.name} ({student.srn})</p>
            <p><strong>Class:</strong> {student.degree} - Sem {student.semester} (Sec {student.section})</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <h3 style="color: #3b82f6; margin-top: 0;">{body.subject}</h3>
            <p style="background-color: #f9fafb; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">
                "{body.message}"
            </p>
            <p style="margin-top: 30px; font-size: 13px; color: #666;">
                You can reply directly to this email to contact the parent at <a href="mailto:{reply_to}">{reply_to}</a>.
            </p>
        </div>
         <div style="background-color: #f4f4f9; padding: 15px; text-align: center; font-size: 12px; color: #999;">
            NoteOrbit Academic Portal
        </div>
    </div>
    """

    try:
        db.add(
            Message(
                sender="parent",
                student_id=student.id,
                faculty_id=prof.id,
                subject=body.subject,
                body=body.message,
            )
        )
        db.commit()
    except Exception as e:
        print(f"Error saving message to DB: {e}")

    send_email(prof.email, email_subject, html_content)
    return {"success": True, "message": f"Message sent to Prof. {prof.name}"}


@router.get("/faculty/conversations")
def get_faculty_conversations(
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    err = _require_roles(payload, ["professor"])
    if err:
        return err

    prof_id = int(payload.get("sub"))
    msgs = db.query(Message).filter_by(faculty_id=prof_id).order_by(Message.created_at.desc()).all()

    students_map: dict = {}
    for m in msgs:
        if m.student_id not in students_map:
            s_obj = db.query(User).get(m.student_id)
            if not s_obj:
                continue
            students_map[m.student_id] = {
                "student_id": s_obj.id,
                "student_name": s_obj.name,
                "student_srn": s_obj.srn,
                "last_message": m.body[:50] + "..." if len(m.body or "") > 50 else m.body,
                "last_timestamp": m.created_at.isoformat(),
                "unread_count": 0,
            }
        if m.sender == "parent" and not m.is_read:
            students_map[m.student_id]["unread_count"] += 1

    return {"success": True, "conversations": list(students_map.values())}


@router.get("/faculty/messages/{student_id}")
def get_conversation_thread(
    student_id: int,
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    err = _require_roles(payload, ["professor"])
    if err:
        return err

    prof_id = int(payload.get("sub"))
    msgs = (
        db.query(Message)
        .filter_by(faculty_id=prof_id, student_id=student_id)
        .order_by(Message.created_at.asc())
        .all()
    )

    for m in msgs:
        if m.sender == "parent" and not m.is_read:
            m.is_read = True
    db.commit()

    out = [
        {
            "id": m.id,
            "sender": m.sender,
            "body": m.body,
            "subject": m.subject,
            "timestamp": m.created_at.isoformat(),
        }
        for m in msgs
    ]
    return {"success": True, "messages": out}


@router.post("/faculty/messages/reply")
def reply_to_parent(
    body: FacultyReplyBody,
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    err = _require_roles(payload, ["professor"])
    if err:
        return err

    prof = db.query(User).get(int(payload.get("sub")))
    if not body.student_id or not body.reply_body:
        return _fail("Student ID and reply body required", 400)

    student = db.query(User).get(body.student_id)
    if not student or not student.parent_email:
        return _fail("Parent email not found", 404)

    try:
        db.add(
            Message(
                sender="faculty",
                student_id=student.id,
                faculty_id=prof.id,
                subject=f"Reply: Parent Query ({student.name})",
                body=body.reply_body,
                is_read=True,
            )
        )
        db.commit()
    except Exception as e:
        print("DB Save Error:", e)

    subject = f"Re: Query regarding {student.name} - [Prof. {prof.name}]"
    html_content = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px;">
        <p><strong>From:</strong> Prof. {prof.name}</p>
        <hr/>
        <p>{body.reply_body}</p>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
           Reply strictly via email or check the portal.
        </p>
    </div>
    """
    send_email(student.parent_email, subject, html_content)
    return {"success": True, "message": "Reply sent"}


@router.get("/parent/conversations")
def get_parent_conversations(
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    err = _require_roles(payload, ["parent", "student"])
    if err:
        return err

    student = db.query(User).get(int(payload.get("sub")))
    msgs = db.query(Message).filter_by(student_id=student.id).order_by(Message.created_at.desc()).all()

    faculty_map: dict = {}
    for m in msgs:
        if m.faculty_id not in faculty_map:
            prof = db.query(User).get(m.faculty_id)
            if not prof:
                continue
            faculty_map[m.faculty_id] = {
                "faculty_id": prof.id,
                "faculty_name": prof.name,
                "last_message": m.body[:50] + "..." if len(m.body or "") > 50 else m.body,
                "last_timestamp": m.created_at.isoformat(),
                "unread_count": 0,
            }
        if m.sender == "faculty" and not m.is_read:
            faculty_map[m.faculty_id]["unread_count"] += 1

    return {"success": True, "conversations": list(faculty_map.values())}


@router.get("/parent/messages/{faculty_id}")
def get_parent_thread(
    faculty_id: int,
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    err = _require_roles(payload, ["parent", "student"])
    if err:
        return err

    student_id = int(payload.get("sub"))
    msgs = (
        db.query(Message)
        .filter_by(student_id=student_id, faculty_id=faculty_id)
        .order_by(Message.created_at.asc())
        .all()
    )

    for m in msgs:
        if m.sender == "faculty" and not m.is_read:
            m.is_read = True
    db.commit()

    out = [
        {
            "id": m.id,
            "sender": m.sender,
            "body": m.body,
            "subject": m.subject,
            "timestamp": m.created_at.isoformat(),
        }
        for m in msgs
    ]
    return {"success": True, "messages": out}


@router.post("/parent/messages/reply")
def parent_reply(
    body: ParentReplyBody,
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    err = _require_roles(payload, ["parent"])
    if err:
        return err

    student = db.query(User).get(int(payload.get("sub")))
    if not body.faculty_id or not body.reply_body:
        return _fail("Faculty ID and reply body required", 400)

    prof = db.query(User).get(body.faculty_id)
    if not prof:
        return _fail("Professor not found", 404)

    try:
        db.add(
            Message(
                sender="parent",
                student_id=student.id,
                faculty_id=prof.id,
                subject=f"Reply from Parent of {student.name}",
                body=body.reply_body,
                is_read=False,
            )
        )
        db.commit()
    except Exception as e:
        print("DB Save Error:", e)

    subject = f"New Message from Parent of {student.name}"
    html_content = f"""
    <div style="padding: 20px;">
        <p><strong>Parent Reply:</strong></p>
        <p>{body.reply_body}</p>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">Login to portal to reply.</p>
    </div>
    """
    send_email(prof.email, subject, html_content)
    return {"success": True, "message": "Reply sent"}
