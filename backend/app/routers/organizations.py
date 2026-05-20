"""Platform routes — Head Admin only (no tenant scoping; this IS the platform)."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.enums import RoleName
from app.models.identity import User
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationOut,
    OrganizationSignup,
    OrganizationStats,
    OrganizationUpdate,
)
from app.services import organization_service as svc

router = APIRouter(prefix="/organizations", tags=["organizations"])
HeadAdmin = Depends(require_roles(RoleName.HEAD_ADMIN))


@router.post("", response_model=OrganizationOut, status_code=201)
def create_org(body: OrganizationCreate, db: Session = Depends(get_db), _: User = HeadAdmin):
    return svc.create(db, body)


@router.post("/public", response_model=OrganizationOut, status_code=201)
def public_signup(body: OrganizationSignup, db: Session = Depends(get_db)):
    data = OrganizationCreate(
        name=body.name,
        slug=body.slug,
        domain=body.domain,
        plan="standard",
        manager_email=body.manager_email,
        manager_name=body.manager_name,
        manager_password=body.manager_password,
    )
    return svc.create(db, data)


@router.get("", response_model=list[OrganizationOut])
def list_orgs(
    db: Session = Depends(get_db),
    _: User = HeadAdmin,
    limit: int = Query(50, le=200),
    offset: int = 0,
):
    return svc.list_all(db, limit, offset)


@router.get("/{org_id}", response_model=OrganizationOut)
def get_org(org_id: int, db: Session = Depends(get_db), _: User = HeadAdmin):
    return svc.get(db, org_id)


@router.patch("/{org_id}", response_model=OrganizationOut)
def update_org(
    org_id: int, body: OrganizationUpdate, db: Session = Depends(get_db), _: User = HeadAdmin
):
    return svc.update(db, org_id, body)


@router.get("/{org_id}/stats", response_model=OrganizationStats)
def org_stats(org_id: int, db: Session = Depends(get_db), _: User = HeadAdmin):
    return svc.stats(db, org_id)
