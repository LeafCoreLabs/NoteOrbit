from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from shared.database import get_db
from shared.models import FileObject, User
from shared.security import get_current_user


router = APIRouter(prefix="/students", tags=["students"])


@router.get("/me")
def get_my_profile(current_user: User = Depends(get_current_user)) -> dict[str, str | int]:
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
    }


@router.get("/me/dashboard")
def get_student_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, int | str]:
    upload_count = db.query(FileObject).filter(FileObject.owner_id == current_user.id).count()
    return {
        "user_id": current_user.id,
        "uploaded_files": upload_count,
        "message": "Student dashboard scaffold for distributed migration",
    }

