import os
import uuid
from datetime import datetime

import boto3
from botocore.client import Config

from shared.config import settings

ALLOWED_EXTENSIONS = {"pdf", "doc", "docx", "ppt", "pptx", "txt", "epub", "jpg", "jpeg", "png", "csv"}


def get_s3_client():
    endpoint = settings.s3_endpoint
    is_r2 = "r2.cloudflarestorage.com" in endpoint
    region = "auto" if is_r2 else getattr(settings, "s3_region", "us-east-1")
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=region,
        config=Config(signature_version="s3v4"),
    )


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def ensure_bucket() -> None:
    client = get_s3_client()
    bucket = settings.minio_default_bucket
    try:
        client.head_bucket(Bucket=bucket)
    except Exception:
        try:
            client.create_bucket(Bucket=bucket)
        except Exception:
            pass


def upload_to_minio(file_obj, dest_key: str, content_type: str = "application/octet-stream"):
    try:
        client = get_s3_client()
        ensure_bucket()
        client.upload_fileobj(
            file_obj,
            settings.minio_default_bucket,
            dest_key,
            ExtraArgs={"ContentType": content_type},
        )
        if getattr(settings, "r2_public_url", None):
            return f"{settings.r2_public_url.rstrip('/')}/{dest_key}", dest_key
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.minio_default_bucket, "Key": dest_key},
            ExpiresIn=3600,
        )
        return url, dest_key
    except Exception as e:
        uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
        dest_path = os.path.join(uploads_dir, dest_key.replace("/", os.sep))
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        try:
            file_obj.seek(0)
        except Exception:
            pass
        with open(dest_path, "wb") as f:
            data = file_obj.read()
            f.write(data)
        return f"/uploads/{dest_key}", dest_key


def presigned_get(key: str) -> str | None:
    if getattr(settings, "r2_public_url", None):
        return f"{settings.r2_public_url.rstrip('/')}/{key}"
    try:
        return get_s3_client().generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.minio_default_bucket, "Key": key},
            ExpiresIn=3600,
        )
    except Exception:
        uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
        local_path = os.path.join(uploads_dir, key.replace("/", os.sep))
        if os.path.exists(local_path):
            return f"/uploads/{key}"
        return None


def delete_object(key: str) -> None:
    try:
        get_s3_client().delete_object(Bucket=settings.minio_default_bucket, Key=key)
    except Exception:
        pass


def unique_key(prefix: str, filename: str) -> str:
    ext = filename.rsplit(".", 1)[1].lower()
    fname = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex}.{ext}"
    return f"{prefix}/{fname}"


def receipt_tmp_dir() -> str:
    base = os.path.join(os.path.dirname(os.path.dirname(__file__)), "tmp", "receipts")
    os.makedirs(base, exist_ok=True)
    return base
