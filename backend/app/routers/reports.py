"""Backend-generated PDF reports streamed to the client."""
from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import TenantContext, get_tenant, require_roles
from app.models.enums import RoleName
from app.services import report_service as svc

router = APIRouter(prefix="/reports", tags=["reports"])
Ctx = Depends(get_tenant)
staff = Depends(require_roles(RoleName.TEACHER, RoleName.MANAGER, RoleName.HEAD_ADMIN))


def _pdf(data: tuple[bytes, str]) -> Response:
    content, filename = data
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/attendance/{class_id}", dependencies=[staff])
def attendance_pdf(class_id: int, ctx: TenantContext = Ctx, db: Session = Depends(get_db)):
    return _pdf(svc.attendance_report(db, ctx.organization_id, ctx.user.id, class_id))


@router.get("/quiz/{class_id}", dependencies=[staff])
def quiz_pdf(class_id: int, ctx: TenantContext = Ctx, db: Session = Depends(get_db)):
    return _pdf(svc.quiz_report(db, ctx.organization_id, ctx.user.id, class_id))


@router.get("/class-summary/{class_id}", dependencies=[staff])
def class_summary_pdf(class_id: int, ctx: TenantContext = Ctx, db: Session = Depends(get_db)):
    return _pdf(svc.class_summary_report(db, ctx.organization_id, ctx.user.id, class_id))
