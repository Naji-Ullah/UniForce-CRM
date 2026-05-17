from fastapi import APIRouter, Depends, Query

from app.core.database import get_db
from app.core.deps import TenantContext, get_tenant, require_roles
from app.models.enums import RoleName
from app.routers._serialize import teacher_out
from app.schemas.identity import TeacherCreate, TeacherOut, TeacherUpdate
from app.services import people_service as svc
from sqlalchemy.orm import Session

router = APIRouter(prefix="/teachers", tags=["teachers"])

# Managers (and Head Admin acting on a chosen org) manage teachers.
ManagerCtx = Depends(get_tenant)
manager_only = Depends(require_roles(RoleName.MANAGER, RoleName.HEAD_ADMIN))


@router.post("", response_model=TeacherOut, status_code=201, dependencies=[manager_only])
def create(body: TeacherCreate, ctx: TenantContext = ManagerCtx, db: Session = Depends(get_db)):
    return teacher_out(svc.create_teacher(db, ctx.organization_id, body))


@router.get("", response_model=list[TeacherOut])
def list_(
    ctx: TenantContext = ManagerCtx,
    db: Session = Depends(get_db),
    limit: int = Query(50, le=200),
    offset: int = 0,
):
    return [teacher_out(t) for t in svc.list_teachers(db, ctx.organization_id, limit, offset)]


@router.get("/{teacher_id}", response_model=TeacherOut)
def get(teacher_id: int, ctx: TenantContext = ManagerCtx, db: Session = Depends(get_db)):
    return teacher_out(svc.get_teacher(db, ctx.organization_id, teacher_id))


@router.patch("/{teacher_id}", response_model=TeacherOut, dependencies=[manager_only])
def update(
    teacher_id: int,
    body: TeacherUpdate,
    ctx: TenantContext = ManagerCtx,
    db: Session = Depends(get_db),
):
    return teacher_out(svc.update_teacher(db, ctx.organization_id, teacher_id, body))


@router.delete("/{teacher_id}", status_code=204, dependencies=[manager_only])
def delete(teacher_id: int, ctx: TenantContext = ManagerCtx, db: Session = Depends(get_db)):
    svc.delete_teacher(db, ctx.organization_id, teacher_id)
