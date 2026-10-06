from __future__ import annotations

import random
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from shared.database import get_db
from shared.email_utils import send_email, send_professional_email
from shared.models import Degree, FacultyAllocation, Hostel, HostelAllocation, Note, Room, Section, Subject, User
from shared.storage import delete_object
from shared.security import get_token_payload, legacy_hash_password, require_admin

router = APIRouter(tags=["admin"])


class ApproveStudentBody(BaseModel):
    student_id: int | str | None = None
    action: str = "approve"


class UpdateStudentBody(BaseModel):
    student_id: int | None = None
    name: str | None = None
    srn: str | None = None
    degree: str | None = None
    semester: int | str | None = None
    section: str | None = None
    parent_email: str | None = None


class GenerateParentPasswordBody(BaseModel):
    student_id: int | None = None


class AddFacultyBody(BaseModel):
    name: str | None = None
    email: str | None = None
    password: str | None = None
    emp_id: str | None = None


class AllocateFacultyBody(BaseModel):
    faculty_id: int | None = None
    degree: str | None = None
    semester: int | str | None = None
    section: str | None = None
    subject: str | None = None


class DeallocateFacultyBody(BaseModel):
    allocation_id: int | None = None


class DegreeBody(BaseModel):
    name: str | None = None


class SectionBody(BaseModel):
    degree: str | None = None
    semester: int | str | None = None
    name: str | None = None


class SubjectBody(BaseModel):
    degree: str | None = None
    semester: int | str | None = None
    name: str | None = None


def _fail(message: str, status: int = 400) -> JSONResponse:
    return JSONResponse({"success": False, "message": message}, status_code=status)


def _require_admin_for_write(payload: dict, db: Session) -> JSONResponse | None:
    user_id = payload.get("sub")
    if not user_id:
        return _fail("Authentication required", 401)
    user = db.query(User).get(int(user_id))
    if not user or user.role.lower() != "admin":
        return _fail("Admin access required", 403)
    return None


def _require_admin_or_prof_for_write(payload: dict) -> JSONResponse | None:
    role = payload.get("role")
    if role not in ["admin", "professor"]:
        return _fail("Admin/Professor access required to modify subjects", 403)
    return None


@router.get("/admin/pending-students")
def pending_students(
    _: Annotated[str, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    students = (
        db.query(User)
        .filter_by(role="student", status="PENDING")
        .order_by(User.created_at.asc())
        .all()
    )
    out = [
        {
            "id": s.id,
            "srn": s.srn,
            "name": s.name,
            "email": s.email,
            "degree": s.degree,
            "semester": s.semester,
            "section": s.section,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in students
    ]
    return {"success": True, "students": out}


@router.post("/admin/approve-student")
def approve_student(
    body: ApproveStudentBody,
    _: Annotated[str, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    action = body.action
    try:
        sid = int(body.student_id)
    except Exception:
        return _fail("Invalid student_id", 400)

    s = db.query(User).filter_by(id=sid, role="student").first()
    if not s:
        return _fail("Student not found", 404)

    s.status = "APPROVED" if action == "approve" else "REJECTED"
    db.commit()

    try:
        if action == "approve":
            send_professional_email(
                s.email,
                "NoteOrbit - Account Approved",
                "Account Access Granted",
                {
                    "Name": s.name,
                    "SRN": s.srn or "N/A",
                    "Degree": s.degree or "N/A",
                    "Semester": str(s.semester) if s.semester else "N/A",
                    "Status": "Approved",
                },
                "Your account registration for NoteOrbit has been approved by the administrator. "
                "You can now log in to the portal and access all features.",
            )
        elif action == "reject":
            send_professional_email(
                s.email,
                "NoteOrbit - Account Rejected",
                "Account Registration Failed",
                {"Name": s.name, "SRN": s.srn or "N/A", "Status": "Rejected"},
                "Your account registration for NoteOrbit has been declined by the administrator. "
                "Please contact the administration if you believe this is an error.",
            )
    except Exception as e:
        print(f"Error sending approval/rejection email: {e}")

    return {"success": True, "message": f"Student {action}d (Email notification sent)"}


@router.post("/admin/update-student")
def update_student(
    body: UpdateStudentBody,
    _: Annotated[str, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    if not body.student_id:
        return _fail("Student ID required", 400)

    s = db.query(User).get(body.student_id)
    if not s or s.role != "student":
        return _fail("Student not found", 404)

    if body.name is not None:
        s.name = body.name
    if body.srn is not None:
        s.srn = body.srn
    if body.degree is not None:
        s.degree = body.degree
    if body.semester is not None:
        s.semester = int(body.semester)
    if body.section is not None:
        s.section = body.section
    if body.parent_email is not None:
        s.parent_email = body.parent_email

    db.commit()
    return {"success": True, "message": "Student updated successfully"}


@router.post("/admin/generate-parent-password")
def generate_parent_password(
    body: GenerateParentPasswordBody,
    _: Annotated[str, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    if not body.student_id:
        return _fail("Student ID required", 400)

    s = db.query(User).get(body.student_id)
    if not s or s.role != "student":
        return _fail("Student not found", 404)
    if not s.parent_email:
        return _fail("Parent email not set for this student. Update student first.", 400)

    raw_password = f"P{random.randint(10000, 99999)}!"
    s.parent_password_hash = legacy_hash_password(raw_password)
    db.commit()

    subject = f"NoteOrbit - Parent Portal Access for {s.name}"
    html = f"""
    <h2>Parent Portal Access Granted</h2>
    <p>Dear Parent,</p>
    <p>You have been granted access to the NoteOrbit Parent Portal to view the academic progress of your ward, <strong>{s.name}</strong> (SRN: {s.srn}).</p>
    <p><strong>Login Credentials:</strong></p>
    <ul>
        <li><strong>Ward SRN:</strong> {s.srn}</li>
        <li><strong>Password:</strong> {raw_password}</li>
    </ul>
    <p>Please login and change your password immediately.</p>
    <p><em>Access Link: <a href="http://localhost:5173/login">NoteOrbit Portal</a></em></p>
    """
    success = send_email(s.parent_email, subject, html)
    if success:
        return {
            "success": True,
            "message": f"Password sent to {s.parent_email}",
            "password": raw_password,
        }
    return JSONResponse(
        {"success": False, "message": "Failed to send email", "password": raw_password},
        status_code=500,
    )


@router.get("/admin/students")
def get_students_list_filtered(
    _: Annotated[str, Depends(require_admin)],
    db: Session = Depends(get_db),
    degree: str | None = None,
    semester: str | None = None,
    section: str | None = None,
):
    q = db.query(User).filter_by(role="student").order_by(User.name.asc())
    if degree:
        q = q.filter_by(degree=degree)
    if semester:
        try:
            q = q.filter_by(semester=int(semester))
        except ValueError:
            return _fail("Invalid semester parameter.", 400)
    if section:
        q = q.filter_by(section=section)

    out = []
    for s in q.all():
        allocation = db.query(HostelAllocation).filter_by(student_id=s.id).first()
        hostel_info = None
        if allocation:
            hostel = db.query(Hostel).get(allocation.hostel_id)
            room = db.query(Room).get(allocation.room_id)
            if hostel and room:
                hostel_info = f"{hostel.name} (Room: {room.room_number})"
        out.append(
            {
                "id": s.id,
                "srn": s.srn,
                "name": s.name,
                "email": s.email,
                "degree": s.degree,
                "semester": s.semester,
                "section": s.section,
                "status": s.status,
                "hostel_info": hostel_info,
                "parent_email": s.parent_email,
                "parent_access": bool(s.parent_password_hash),
            }
        )
    return {"success": True, "students": out}


@router.post("/admin/add-faculty")
def add_faculty(
    body: AddFacultyBody,
    _: Annotated[str, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    data = body.model_dump()
    for r in ["name", "email", "password", "emp_id"]:
        if not data.get(r):
            return _fail(f"Missing field {r}", 400)

    if (
        db.query(User)
        .filter((User.email == body.email) | (User.emp_id == body.emp_id))
        .first()
    ):
        return _fail("Email or EMP ID already registered.", 400)

    user = User(
        name=body.name,
        email=body.email,
        password_hash=legacy_hash_password(body.password or ""),
        role="professor",
        emp_id=body.emp_id,
        status="APPROVED",
    )
    db.add(user)
    db.commit()
    return {"success": True, "message": f"Faculty account created for {user.name}."}


@router.get("/admin/faculty")
def list_faculty_allocations(
    _: Annotated[str, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    faculty = db.query(User).filter_by(role="professor").all()
    out = []
    for f in faculty:
        allocs = db.query(FacultyAllocation).filter_by(faculty_id=f.id).all()
        alloc_data = [
            {"id": a.id, "degree": a.degree, "semester": a.semester, "section": a.section, "subject": a.subject}
            for a in allocs
        ]
        out.append(
            {"id": f.id, "name": f.name, "email": f.email, "emp_id": f.emp_id, "allocations": alloc_data}
        )
    return {"success": True, "faculty": out}


@router.post("/admin/faculty/allocate")
def allocate_faculty(
    body: AllocateFacultyBody,
    _: Annotated[str, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    if not all([body.faculty_id, body.degree, body.semester, body.section, body.subject]):
        return _fail("All fields required", 400)

    exists = (
        db.query(FacultyAllocation)
        .filter_by(
            faculty_id=body.faculty_id,
            degree=body.degree,
            semester=int(body.semester),
            section=body.section,
            subject=body.subject,
        )
        .first()
    )
    if exists:
        return _fail("Allocation already exists", 400)

    db.add(
        FacultyAllocation(
            faculty_id=body.faculty_id,
            degree=body.degree,
            semester=int(body.semester),
            section=body.section,
            subject=body.subject,
        )
    )
    db.commit()
    return {"success": True, "message": "Class allocated to faculty."}


@router.post("/admin/faculty/deallocate")
def deallocate_faculty(
    body: DeallocateFacultyBody,
    _: Annotated[str, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    alloc = db.query(FacultyAllocation).get(body.allocation_id)
    if not alloc:
        return _fail("Allocation not found", 404)
    db.delete(alloc)
    db.commit()
    return {"success": True, "message": "Allocation removed."}


@router.get("/admin/degrees")
def list_degrees(db: Session = Depends(get_db)):
    data = [d.name for d in db.query(Degree).order_by(Degree.name).all()]
    return {"success": True, "degrees": data}


@router.post("/admin/degrees")
def add_degree(
    body: DegreeBody,
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    err = _require_admin_for_write(payload, db)
    if err:
        return err
    name = body.name
    if not name or db.query(Degree).filter_by(name=name).first():
        return _fail("Invalid or duplicate degree", 400)
    db.add(Degree(name=name))
    db.commit()
    return {"success": True, "message": "Degree added"}


@router.delete("/admin/degrees")
def delete_degree(
    body: DegreeBody,
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    err = _require_admin_for_write(payload, db)
    if err:
        return err
    name = body.name
    if not name:
        return _fail("Missing degree name for deletion", 400)
    d = db.query(Degree).filter_by(name=name).first()
    if not d:
        return _fail("Degree not found", 404)
    db.delete(d)
    db.commit()
    return {"success": True, "message": "Degree deleted successfully"}


@router.get("/admin/sections")
def list_sections(
    db: Session = Depends(get_db),
    degree: str | None = None,
    semester: str | None = None,
):
    q = db.query(Section)
    if degree:
        q = q.filter_by(degree=degree)
    if semester:
        try:
            q = q.filter_by(semester=int(semester))
        except ValueError:
            pass
    data = [s.name for s in q.order_by(Section.name).all()]
    return {"success": True, "sections": data}


@router.post("/admin/sections")
def add_section(
    body: SectionBody,
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    err = _require_admin_for_write(payload, db)
    if err:
        return err
    if not (body.degree and body.semester and body.name):
        return _fail("Missing fields", 400)
    try:
        sem = int(body.semester)
    except Exception:
        return _fail("Invalid semester", 400)
    if db.query(Section).filter_by(degree=body.degree, semester=sem, name=body.name).first():
        return _fail("Duplicate section", 400)
    db.add(Section(degree=body.degree, semester=sem, name=body.name))
    db.commit()
    return {"success": True, "message": "Section added"}


@router.delete("/admin/sections")
def delete_section(
    body: SectionBody,
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    err = _require_admin_for_write(payload, db)
    if err:
        return err
    if not (body.degree and body.semester and body.name):
        return _fail("Missing fields for deletion", 400)
    s = db.query(Section).filter_by(degree=body.degree, semester=int(body.semester), name=body.name).first()
    if not s:
        return _fail("Section not found", 404)
    db.delete(s)
    db.commit()
    return {"success": True, "message": "Section deleted"}


@router.get("/admin/subjects")
def list_subjects(
    db: Session = Depends(get_db),
    degree: str | None = None,
    semester: str | None = None,
):
    q = db.query(Subject)
    if degree:
        q = q.filter_by(degree=degree)
    if semester:
        try:
            q = q.filter_by(semester=int(semester))
        except ValueError:
            pass
    items = [{"degree": s.degree, "semester": s.semester, "name": s.name} for s in q.order_by(Subject.name).all()]
    return {"success": True, "subjects": items}


@router.post("/admin/subjects")
def add_subject(
    body: SubjectBody,
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    err = _require_admin_or_prof_for_write(payload)
    if err:
        return err
    if not (body.degree and body.semester and body.name):
        return _fail("Missing fields", 400)
    if not db.query(Degree).filter_by(name=body.degree).first():
        return _fail("Invalid degree", 400)
    try:
        sem = int(body.semester)
    except Exception:
        return _fail("Invalid semester", 400)
    if db.query(Subject).filter_by(degree=body.degree, semester=sem, name=body.name).first():
        return _fail("Duplicate subject", 400)
    db.add(Subject(degree=body.degree, semester=sem, name=body.name))
    db.commit()
    return {"success": True, "message": "Subject added"}


@router.delete("/admin/notes/{note_id}")
def admin_delete_note(
    note_id: int,
    _: Annotated[str, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    note = db.query(Note).get(note_id)
    if not note:
        return _fail("Note not found", 404)
    if note.file_path:
        try:
            delete_object(note.file_path)
        except Exception as e:
            print(f"Failed to delete note object from storage: {e}")
    db.delete(note)
    db.commit()
    return {"success": True, "message": "Note deleted"}


@router.delete("/admin/subjects")
def delete_subject(
    body: SubjectBody,
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    err = _require_admin_or_prof_for_write(payload)
    if err:
        return err
    if not (body.degree and body.semester and body.name):
        return _fail("Missing fields for deletion", 400)
    s = db.query(Subject).filter_by(degree=body.degree, semester=int(body.semester), name=body.name).first()
    if not s:
        return _fail("Subject not found", 404)
    db.delete(s)
    db.commit()
    return {"success": True, "message": "Subject deleted successfully"}
