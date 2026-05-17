"""FastAPI dependencies: authentication, RBAC and tenant resolution.

This module is where access control is *enforced*. Three layered guarantees:

  1. `get_current_user`  — valid, non-expired access token → live user row.
  2. `require_roles(...)` — coarse role gate (Head Admin / Manager / Teacher).
  3. `TenantContext`      — the org id every tenant-scoped query must use.
                            For tenant users it is pinned to their own
                            organization and CANNOT be overridden by a query
                            param, so cross-tenant access is impossible even
                            with a forged id. The Head Admin may target any
                            org explicitly via `?organization_id=`.
"""
from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import ACCESS_TOKEN, JWTError, decode_token
from app.models.enums import RoleName
from app.models.identity import User

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        payload = decode_token(creds.credentials)
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    if payload.get("type") != ACCESS_TOKEN:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong token type")

    user = db.get(User, int(payload["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User inactive or not found")
    return user


def require_roles(*roles: RoleName):
    allowed = {r.value for r in roles}

    def _guard(user: User = Depends(get_current_user)) -> User:
        if user.role.name not in allowed:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Requires one of: {', '.join(sorted(allowed))}",
            )
        return user

    return _guard


@dataclass
class TenantContext:
    user: User
    organization_id: int  # the org all repository calls will be scoped to


def get_tenant(
    user: User = Depends(get_current_user),
    organization_id: int | None = Query(
        default=None,
        description="Head Admin only: target organization. Ignored for tenant users.",
    ),
) -> TenantContext:
    is_head = user.role.name == RoleName.HEAD_ADMIN.value

    if is_head:
        if organization_id is None:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Head Admin must specify ?organization_id= for tenant-scoped routes",
            )
        return TenantContext(user=user, organization_id=organization_id)

    # Tenant user: org is pinned to the token's user, query param is ignored.
    if user.organization_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "User has no organization")
    return TenantContext(user=user, organization_id=user.organization_id)
