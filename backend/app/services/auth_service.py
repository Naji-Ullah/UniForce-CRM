"""Authentication: credential check + access/refresh issuance + rotation."""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.errors import AuthError
from app.core.security import (
    REFRESH_TOKEN,
    JWTError,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.models.identity import User
from app.repositories.repos import UserRepository
from app.schemas.auth import TokenPair


def _issue(user: User) -> TokenPair:
    role = user.role.name
    return TokenPair(
        access_token=create_access_token(user.id, role, user.organization_id),
        refresh_token=create_refresh_token(user.id),
    )


def login(db: Session, email: str, password: str) -> TokenPair:
    user = UserRepository(db, None).by_email(email)
    if not user or not verify_password(password, user.hashed_password):
        # Identical message for both cases → no user-enumeration oracle.
        raise AuthError("Invalid email or password")
    if not user.is_active:
        raise AuthError("Account is disabled")

    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    return _issue(user)


def refresh(db: Session, refresh_token: str) -> TokenPair:
    try:
        payload = decode_token(refresh_token)
    except JWTError:
        raise AuthError("Invalid or expired refresh token")
    if payload.get("type") != REFRESH_TOKEN:
        raise AuthError("Wrong token type")

    user = db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise AuthError("User no longer active")
    return _issue(user)
