from io import BytesIO
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from shared.config import settings
from shared.database import get_db
from shared.minio_client import get_minio_client
from shared.models import FileObject, User
from shared.schemas import FileObjectRead
from shared.security import get_current_user


router = APIRouter(prefix="/objects", tags=["objects"])


@router.post("/upload", response_model=FileObjectRead, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileObject:
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file is not allowed")

    object_key = f"{current_user.id}/{uuid4()}-{file.filename}"
    bucket = settings.minio_default_bucket

    client = get_minio_client()
    client.put_object(
        bucket_name=bucket,
        object_name=object_key,
        data=BytesIO(content),
        length=len(content),
        content_type=file.content_type or "application/octet-stream",
    )

    row = FileObject(
        owner_id=current_user.id,
        bucket_name=bucket,
        object_key=object_key,
        original_filename=file.filename,
        content_type=file.content_type or "application/octet-stream",
        size_bytes=len(content),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/my-files", response_model=list[FileObjectRead])
def list_my_files(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[FileObject]:
    return (
        db.query(FileObject)
        .filter(FileObject.owner_id == current_user.id)
        .order_by(FileObject.id.desc())
        .all()
    )


@router.get("/{object_key:path}/presigned-get")
def get_presigned_get_url(
    object_key: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    row = (
        db.query(FileObject)
        .filter(FileObject.object_key == object_key, FileObject.owner_id == current_user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Object not found")

    client = get_minio_client()
    url = client.presigned_get_object(row.bucket_name, row.object_key)
    return {"url": url}

