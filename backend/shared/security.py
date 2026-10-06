import hashlib
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from shared.config import settings
from shared.database import get_db
from shared.models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


def legacy_hash_password(password: str, salt: str | None = None) -> str:
    salt = salt or settings.password_salt
    return hashlib.sha256((password + salt).encode()).hexdigest()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, stored_hash: str) -> bool:
    if stored_hash.startswith("$2"):
        return pwd_context.verify(plain_password, stored_hash)
    return legacy_hash_password(plain_password) == stored_hash


def upgrade_password_if_legacy(db: Session, user: User, plain_password: str) -> None:
    if user.password_hash.startswith("$2"):
        return
    if legacy_hash_password(plain_password) == user.password_hash:
        user.password_hash = hash_password(plain_password)
        db.commit()


def create_access_token(user_id: int | str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.access_token_expire_days)
    payload = {"sub": str(user_id), "role": role, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])


def get_token_payload(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict[str, Any]:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    try:
        return decode_token(credentials.credentials)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        ) from exc


def get_current_user(
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
) -> User:
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def get_jwt_role(payload: Annotated[dict, Depends(get_token_payload)]) -> str:
    role = payload.get("role")
    if not role:
        raise HTTPException(status_code=401, detail="Role missing in token")
    return role


def require_roles(allowed: list[str]):
    def _dep(role: Annotated[str, Depends(get_jwt_role)]) -> str:
        if role not in allowed:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return role

    return _dep


def require_admin(role: Annotated[str, Depends(get_jwt_role)]) -> str:
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return role
