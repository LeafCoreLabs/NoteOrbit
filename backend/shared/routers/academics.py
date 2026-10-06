from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from shared.database import get_db
from shared.email_utils import send_professional_email
from shared.helpers import search_open_library
from shared.models import (
    Attendance,
    Book,
    FacultyAllocation,
    Feedback,
    Mark,
    Note,
    Notice,
    User,
)
from shared.security import get_current_user, get_token_payload
from shared.storage import allowed_file, presigned_get, upload_to_minio

router = APIRouter(tags=["academics"])


class MarksUploadBody(BaseModel):
    subject: str | None = None
    exam_type: str | None = None
    srn: str | None = None
    marks_obtained: float | int | None = None
    max_marks: float | int | None = None


class FeedbackBody(BaseModel):
    srn: str | None = None
    subject: str | None = None
    text: str | None = None


class AttendanceMarkBody(BaseModel):
    data: list[dict] | None = None
    degree: str | None = None
    semester: int | str | None = None
    section: str | None = None
    subject: str | None = None
    date: str | None = None


def _fail(message: str, status: int = 400) -> JSONResponse:
    return JSONResponse({"success": False, "message": message}, status_code=status)


@router.post("/upload-note")
def upload_note(
    title: str = Form(...),
    degree: str = Form(...),
    semester: str = Form(...),
    section: str = Form(...),
    subject: str = Form(...),
    document_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    payload: Annotated[dict, Depends(get_token_payload)] = None,
    db: Session = Depends(get_db),
):
    role = payload.get("role")
    if role not in ["professor", "admin"]:
        return _fail("Insufficient permissions", 403)

    if not allowed_file(file.filename or ""):
        return _fail("File type not allowed", 400)

    ext = file.filename.rsplit(".", 1)[1].lower()
    filename = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex}.{ext}"
    key = f"notes/{filename}"
    upload_to_minio(file.file, key, file.content_type or "application/octet-stream")

    note = Note(
        title=title,
        degree=degree,
        semester=int(semester),
        section=section,
        subject=subject,
        document_type=document_type,
        file_path=key,
        uploaded_by=current_user.id,
    )
    db.add(note)
    db.commit()

    students = (
        db.query(User)
        .filter_by(role="student", degree=degree, semester=int(semester), section=section, status="APPROVED")
        .all()
    )
    for s in students:
        send_professional_email(
            s.email,
            f"New Note: {subject}",
            "New Study Material Uploaded",
            {"Subject": subject, "Title": title, "Type": document_type, "Faculty": current_user.name},
            f"New study material has been uploaded for <strong>{subject}</strong>.",
        )
    return {"success": True, "message": "Note uploaded"}


@router.get("/notes")
def get_notes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    degree: str | None = None,
    semester: str | None = None,
    section: str | None = None,
    subject: str | None = None,
    document_type: str | None = None,
):
    degree = degree or current_user.degree
    semester = semester or current_user.semester
    section = section or current_user.section

    if not degree or not semester:
        return _fail("degree and semester are required", 400)
    try:
        sem = int(semester)
    except Exception:
        return _fail("Invalid semester", 400)

    q = db.query(Note).filter_by(degree=degree, semester=sem)
    if section:
        q = q.filter(or_(Note.section == section, Note.section == "ALL"))
    if subject:
        q = q.filter_by(subject=subject)
    if document_type:
        q = q.filter_by(document_type=document_type)

    out = []
    for n in q.order_by(Note.timestamp.desc()).all():
        out.append(
            {
                "id": n.id,
                "title": n.title,
                "degree": n.degree,
                "semester": n.semester,
                "section": n.section,
                "subject": n.subject,
                "document_type": n.document_type,
                "file_url": presigned_get(n.file_path) if n.file_path else None,
                "uploaded_by": n.uploaded_by,
                "timestamp": n.timestamp.isoformat() if n.timestamp else None,
            }
        )
    return {"success": True, "notes": out}


@router.post("/api/admin/library/book")
def upload_book(
    title: str = Form(...),
    author: str = Form(...),
    degree: str = Form(...),
    semester: str = Form(...),
    isbn: str | None = Form(None),
    file: UploadFile = File(...),
    payload: Annotated[dict, Depends(get_token_payload)] = None,
    db: Session = Depends(get_db),
):
    if payload.get("role") not in ["admin"]:
        return _fail("Insufficient permissions", 403)

    if not allowed_file(file.filename or ""):
        return _fail("File type not allowed", 400)

    ext = file.filename.rsplit(".", 1)[1].lower()
    filename = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex}.{ext}"
    key = f"books/{filename}"
    upload_to_minio(file.file, key, file.content_type or "application/octet-stream")

    book = Book(
        title=title,
        author=author,
        isbn=isbn,
        degree=degree,
        semester=int(semester),
        file_path=key,
        uploaded_by=int(payload.get("sub")),
    )
    db.add(book)
    db.commit()
    return {"success": True, "message": f"Book '{title}' uploaded to Internal Library."}


@router.get("/api/library/search")
def search_library(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    q: str = "",
    source: str = "internal",
):
    if not q:
        return {"success": True, "books": []}

    out = []
    if source.lower() == "internal":
        books = (
            db.query(Book)
            .filter(
                or_(
                    Book.title.ilike(f"%{q}%"),
                    Book.author.ilike(f"%{q}%"),
                    Book.isbn.ilike(f"%{q}%"),
                )
            )
            .limit(20)
            .all()
        )
        for b in books:
            out.append(
                {
                    "id": b.id,
                    "title": b.title,
                    "author": b.author,
                    "source": "Internal",
                    "degree": b.degree,
                    "semester": b.semester,
                    "file_url": presigned_get(b.file_path),
                    "isbn": b.isbn,
                    "cover_url": None,
                }
            )
    elif source.lower() == "openlibrary":
        out = search_open_library(q)
    else:
        return _fail("Invalid source parameter. Must be 'internal' or 'openlibrary'.", 400)

    return {"success": True, "books": out}


@router.post("/create-notice")
def create_notice(
    title: str = Form(...),
    message: str = Form(...),
    degree: str = Form(...),
    semester: str = Form(...),
    section: str = Form(...),
    subject: str = Form(...),
    deadline: str | None = Form(None),
    attachment: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
    payload: Annotated[dict, Depends(get_token_payload)] = None,
    db: Session = Depends(get_db),
):
    if payload.get("role") not in ["professor", "admin"]:
        return _fail("Insufficient permissions", 403)

    attachment_key = None
    if attachment and attachment.filename:
        if not allowed_file(attachment.filename):
            return _fail("Attachment type not allowed", 400)
        ext = attachment.filename.rsplit(".", 1)[1].lower()
        fname = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex}.{ext}"
        attachment_key = f"notices/{fname}"
        upload_to_minio(attachment.file, attachment_key, attachment.content_type or "application/octet-stream")

    deadline_dt = None
    if deadline:
        try:
            deadline_dt = datetime.strptime(deadline, "%Y-%m-%d")
        except Exception:
            return _fail("Invalid deadline format (YYYY-MM-DD)", 400)

    notice = Notice(
        title=title,
        message=message,
        degree=degree,
        semester=int(semester),
        section=section,
        subject=subject,
        deadline=deadline_dt,
        attachment=attachment_key,
        professor_id=current_user.id,
        professor_name=current_user.name,
    )
    db.add(notice)
    db.commit()

    try:
        sections_list = [s.strip().upper() for s in section.split(",")] if section else []
        q = db.query(User).filter_by(role="student", degree=degree, semester=int(semester), status="APPROVED")
        if sections_list:
            q = q.filter(User.section.in_(sections_list))
        for s in q.all():
            details = {
                "Subject": subject,
                "Posted By": current_user.name,
                "Deadline": str(deadline_dt) if deadline_dt else "N/A",
            }
            send_professional_email(
                s.email,
                f"New Notice: {title}",
                "Important Notice",
                details,
                f"{message[:200]}..." if len(message) > 200 else message,
            )
    except Exception as e:
        print(f"Error sending notice emails: {e}")

    return {"success": True, "message": "Notice created"}


@router.get("/notices")
def get_notices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    degree: str | None = None,
    semester: str | None = None,
    section: str | None = None,
    subject: str | None = None,
):
    q = db.query(Notice)
    if current_user.role == "student":
        q = q.filter_by(degree=current_user.degree, semester=current_user.semester)
        items = q.order_by(Notice.created_at.desc()).all()
        results = []
        for n in items:
            sections = [s.strip().upper() for s in n.section.split(",")] if n.section else []
            if current_user.section and current_user.section.upper() in sections and (
                not subject or n.subject == subject
            ):
                results.append(n)
    else:
        if degree:
            q = q.filter_by(degree=degree)
        if semester:
            try:
                q = q.filter_by(semester=int(semester))
            except Exception:
                return _fail("Invalid semester parameter.", 400)
        if section:
            q = q.filter(Notice.section.ilike(f"%{section}%"))
        if subject:
            q = q.filter_by(subject=subject)
        results = q.order_by(Notice.created_at.desc()).all()

    out = []
    for n in results:
        out.append(
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "degree": n.degree,
                "semester": n.semester,
                "section": n.section,
                "subject": n.subject,
                "deadline": n.deadline.isoformat() if n.deadline else None,
                "attachment_url": presigned_get(n.attachment) if n.attachment else None,
                "professor_id": n.professor_id,
                "professor_name": n.professor_name,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
        )
    return {"success": True, "notices": out}


@router.post("/faculty/marks/upload")
def faculty_upload_marks(
    body: MarksUploadBody,
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    if payload.get("role") not in ["professor", "admin"]:
        return _fail("Insufficient permissions", 403)

    if not all(
        [body.subject, body.exam_type, body.srn, body.marks_obtained is not None, body.max_marks is not None]
    ):
        return _fail("subject, exam_type, srn, marks_obtained, and max_marks required", 400)

    user = db.query(User).filter_by(srn=body.srn).first()
    if not user:
        return _fail(f"Student with SRN {body.srn} not found.", 404)

    try:
        marks = float(body.marks_obtained)
        max_m = float(body.max_marks)
        if marks < 0 or max_m <= 0 or marks > max_m:
            return _fail(
                "Invalid mark values (marks must be >= 0 and <= max_marks, max_marks > 0).",
                400,
            )
    except ValueError:
        return _fail("Marks must be numeric.", 400)

    uploader_id = int(payload.get("sub"))
    db.add(
        Mark(
            student_id=user.id,
            subject=body.subject,
            exam_type=body.exam_type,
            marks_obtained=marks,
            max_marks=max_m,
            uploaded_by=uploader_id,
        )
    )
    db.commit()

    details = {
        "Subject": body.subject,
        "Exam Type": body.exam_type,
        "Score": f"{marks}/{max_m}",
        "Percentage": f"{(marks / max_m) * 100:.1f}%",
    }
    send_professional_email(
        user.email,
        f"Marks Released: {body.subject}",
        "New Assessment Score",
        details,
        "Your marks for the recent assessment have been published.",
    )
    if user.parent_email:
        send_professional_email(
            user.parent_email,
            f"Academic Alert: {user.name} - {body.subject}",
            f"Marks Published for {user.name}",
            details,
            f"New marks have been uploaded for your ward, <strong>{user.name}</strong>.",
        )
    return {"success": True, "message": f"Marks uploaded for {user.name}."}


@router.get("/student/marks")
def student_get_marks(
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    if payload.get("role") not in ["student", "parent"]:
        return _fail("Insufficient permissions", 403)

    uid = int(payload.get("sub"))
    rows = db.query(Mark).filter_by(student_id=uid).order_by(Mark.created_at.desc()).all()
    out: dict = {}
    for r in rows:
        out.setdefault(r.subject, []).append(
            {
                "exam_type": r.exam_type,
                "marks_obtained": r.marks_obtained,
                "max_marks": r.max_marks,
                "uploaded_at": r.created_at.isoformat() if r.created_at else None,
            }
        )
    return {"success": True, "marks": out}


@router.post("/faculty/feedback")
def faculty_add_feedback(
    body: FeedbackBody,
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    if payload.get("role") not in ["professor", "admin"]:
        return _fail("Insufficient permissions", 403)

    if not body.srn or not body.subject or not body.text:
        return _fail("srn, subject and text required", 400)

    student = db.query(User).filter_by(srn=body.srn).first()
    if not student:
        return _fail("student not found", 404)

    faculty_id = int(payload.get("sub"))
    db.add(
        Feedback(student_id=student.id, subject=body.subject, faculty_id=faculty_id, text=body.text)
    )
    db.commit()

    faculty = db.query(User).get(faculty_id)
    details = {"Subject": body.subject, "Faculty": faculty.name if faculty else "Faculty", "Feedback": body.text}
    send_professional_email(
        student.email,
        f"New Feedback: {body.subject}",
        "Faculty Feedback Received",
        details,
        "You have received new feedback from your professor.",
    )
    if student.parent_email:
        send_professional_email(
            student.parent_email,
            f"Feedback: {student.name} - {body.subject}",
            f"Faculty Feedback for {student.name}",
            details,
            f"Faculty has provided feedback for your ward, <strong>{student.name}</strong>.",
        )
    return {"success": True, "message": "Feedback saved"}


@router.get("/student/feedback")
def student_get_feedback(
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    if payload.get("role") not in ["student", "parent"]:
        return _fail("Insufficient permissions", 403)

    uid = int(payload.get("sub"))
    rows = db.query(Feedback).filter_by(student_id=uid).order_by(Feedback.created_at.desc()).all()
    out = [
        {
            "subject": r.subject,
            "text": r.text,
            "faculty_id": r.faculty_id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]
    return {"success": True, "feedback": out}


@router.get("/faculty/allocations")
def get_faculty_allocations(
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    if payload.get("role") not in ["professor", "admin"]:
        return _fail("Insufficient permissions", 403)

    fid = int(payload.get("sub"))
    allocs = db.query(FacultyAllocation).filter_by(faculty_id=fid).all()
    out = [
        {"id": a.id, "degree": a.degree, "semester": a.semester, "section": a.section, "subject": a.subject}
        for a in allocs
    ]
    return {"success": True, "allocations": out}


@router.get("/faculty/students")
def get_students_for_marking(
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
    degree: str | None = None,
    semester: str | None = None,
    section: str | None = None,
    subject: str | None = None,
    date: str | None = None,
):
    if payload.get("role") not in ["professor", "admin"]:
        return _fail("Insufficient permissions", 403)

    if not (degree and semester and section):
        return _fail("Missing params", 400)

    students = (
        db.query(User)
        .filter_by(role="student", degree=degree, semester=int(semester), section=section, status="APPROVED")
        .order_by(User.srn.asc())
        .all()
    )

    att_map = {}
    if subject and date:
        try:
            d = datetime.strptime(date, "%Y-%m-%d").date()
            rows = db.query(Attendance).filter_by(subject=subject, date=d).all()
            for r in rows:
                att_map[r.student_id] = {"status": r.status, "timestamp": r.timestamp}
        except ValueError:
            pass

    out = []
    for s in students:
        att = att_map.get(s.id)
        out.append(
            {
                "id": s.id,
                "srn": s.srn,
                "name": s.name,
                "status": att["status"] if att else None,
                "marked_at": att["timestamp"].isoformat() if att else None,
            }
        )
    return {"success": True, "students": out}


@router.post("/faculty/attendance")
def mark_faculty_attendance_post(
    body: AttendanceMarkBody,
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    if payload.get("role") not in ["professor", "admin"]:
        return _fail("Insufficient permissions", 403)

    fid = int(payload.get("sub"))
    items = body.data
    if not (items and body.degree and body.semester and body.section and body.subject and body.date):
        return _fail("Missing fields", 400)

    try:
        date_obj = datetime.strptime(body.date, "%Y-%m-%d").date()
    except ValueError:
        return _fail("Invalid date format", 400)

    count = 0
    for item in items:
        sid = item.get("student_id")
        status = item.get("status")
        exist = db.query(Attendance).filter_by(student_id=sid, subject=body.subject, date=date_obj).first()
        if exist:
            window = datetime.utcnow() - exist.timestamp
            if window.total_seconds() > 1800:
                continue
            exist.status = status
        else:
            db.add(
                Attendance(
                    student_id=sid,
                    faculty_id=fid,
                    degree=body.degree,
                    semester=int(body.semester),
                    section=body.section,
                    subject=body.subject,
                    date=date_obj,
                    status=status,
                )
            )

        if status == "Absent":
            stu = db.query(User).get(sid)
            if stu:
                details = {"Subject": body.subject, "Date": body.date, "Status": "Absent"}
                send_professional_email(
                    stu.email,
                    f"Attendance Alert: Absent for {body.subject}",
                    "Absence Recorded",
                    details,
                    f"You have been marked <strong>Absent</strong> for {body.subject} on {body.date}.",
                )
                if stu.parent_email:
                    send_professional_email(
                        stu.parent_email,
                        f"Attendance Alert: {stu.name} Absent",
                        f"Absence Alert for {stu.name}",
                        details,
                        f"Your ward <strong>{stu.name}</strong> was marked Absent for {body.subject} on {body.date}.",
                    )
        count += 1

    db.commit()
    return {"success": True, "message": f"Attendance marked for {count} students."}


@router.put("/faculty/attendance")
def mark_faculty_attendance_put():
    return _fail("Use POST to mark or update.", 400)


@router.get("/student/attendance")
def get_my_attendance(
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    if payload.get("role") not in ["student", "parent"]:
        return _fail("Insufficient permissions", 403)

    uid = int(payload.get("sub"))
    rows = db.query(Attendance).filter_by(student_id=uid).order_by(Attendance.date.desc()).all()
    out = [{"date": r.date.isoformat(), "subject": r.subject, "status": r.status} for r in rows]
    return {"success": True, "attendance": out}
