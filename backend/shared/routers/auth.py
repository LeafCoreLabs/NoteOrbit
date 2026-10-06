from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from shared.database import get_db
from shared.helpers import mask_email
from shared.models import User
from shared.security import create_access_token, get_current_user, legacy_hash_password, verify_password

router = APIRouter(tags=["auth"])


class LookupUserBody(BaseModel):
    identifier: str = ""


class LookupParentBody(BaseModel):
    srn: str = ""


class RegisterBody(BaseModel):
    role: str | None = None
    email: str | None = None
    name: str | None = None
    password: str | None = None
    srn: str | None = None
    degree: str | None = None
    semester: int | str | None = None
    section: str | None = None


class LoginBody(BaseModel):
    email: str | None = None
    password: str | None = None
    role: str = "student"


def _fail(message: str, status: int = 400) -> JSONResponse:
    return JSONResponse({"success": False, "message": message}, status_code=status)


@router.post("/auth/lookup-user")
def lookup_user_endpoint(body: LookupUserBody, db: Session = Depends(get_db)):
    identifier = body.identifier.strip()
    if not identifier:
        return _fail("Identifier required", 400)

    user = (
        db.query(User)
        .filter((User.email == identifier) | (User.srn == identifier) | (User.emp_id == identifier))
        .first()
    )
    if not user:
        return _fail("User not found", 404)

    return {"success": True, "masked_email": mask_email(user.email), "email_exists": True}


@router.post("/auth/lookup-parent")
def lookup_parent_endpoint(body: LookupParentBody, db: Session = Depends(get_db)):
    srn = body.srn.strip()
    if not srn:
        return _fail("SRN required", 400)

    student = db.query(User).filter_by(srn=srn).first()
    if not student:
        return _fail("Student not found with this SRN", 404)
    if not student.parent_email:
        return _fail("No parent email registered for this student", 404)

    return {"success": True, "masked_email": mask_email(student.parent_email), "email_exists": True}


@router.post("/register")
def register(body: RegisterBody, db: Session = Depends(get_db)):
    role = (body.role or "student").lower()
    email = (body.email or "").lower().strip()

    if not email:
        return _fail("Email is required", 400)
    if not body.password:
        return _fail("Password is required", 400)
    if db.query(User).filter_by(email=email).first():
        return _fail("Email already registered. Please sign in.", 400)

    srn = (body.srn or "").strip()
    if srn and db.query(User).filter_by(srn=srn).first():
        return _fail("SRN already registered", 400)

    semester = int(body.semester) if body.semester else 1
    new_user = User(
        email=email,
        password_hash=legacy_hash_password(body.password or ""),
        role=role,
        name=body.name or "",
        srn=srn,
        degree=body.degree or "BE",
        semester=semester,
        section=body.section or "A",
        status="APPROVED",
    )

    db.add(new_user)
    db.commit()
    return {"success": True, "message": "Registration successful! You can now sign in."}


@router.post("/login")
def login(body: LoginBody, db: Session = Depends(get_db)):
    identifier = body.email
    password = body.password or ""
    role = body.role

    if not identifier or not password:
        return _fail("Identifier & password required", 400)

    if role == "parent":
        user = db.query(User).filter_by(srn=identifier).first()
        if not user:
            return _fail("Student not found", 404)
        if not user.parent_password_hash or user.parent_password_hash != legacy_hash_password(password):
            return _fail("Invalid parent credentials", 401)

        access_token = create_access_token(str(user.id), "parent")
        return {
            "success": True,
            "token": access_token,
            "user": {
                "id": user.id,
                "name": f"{user.name}'s Parent",
                "email": user.parent_email,
                "role": "parent",
                "srn": user.srn,
                "degree": user.degree,
                "semester": user.semester,
                "section": user.section,
                "status": user.status,
            },
        }

    user = db.query(User).filter_by(email=identifier).first()
    if not user:
        return _fail("User not found", 404)
    if not verify_password(password, user.password_hash):
        return _fail("Invalid credentials", 401)
    if user.role == "student" and user.status != "APPROVED":
        return _fail(f"Account status: {user.status}. Wait for admin approval.", 403)

    access_token = create_access_token(str(user.id), user.role)
    return {
        "success": True,
        "token": access_token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "degree": user.degree or "",
            "semester": user.semester or 1,
            "section": user.section or "",
            "status": user.status,
        },
    }


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "degree": current_user.degree,
        "semester": current_user.semester,
        "section": current_user.section,
        "status": current_user.status,
    }
