"""Backend-generated PDF reports streamed to the client."""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.access import require_class_access
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


def _validate_filter(threshold: float | None, comparator: str | None) -> None:
    if comparator is not None and comparator not in {"all", "above", "below"}:
        raise HTTPException(400, "comparator must be one of: all, above, below")
    if threshold is not None and not (0 <= threshold <= 100):
        raise HTTPException(400, "threshold must be between 0 and 100")


@router.get("/attendance/{class_id}", dependencies=[staff])
def attendance_pdf(
    class_id: int,
    ctx: TenantContext = Ctx,
    db: Session = Depends(get_db),
    threshold: float | None = Query(None, ge=0, le=100,
                                    description="Percentage cutoff for filter"),
    comparator: str | None = Query(None,
                                   description="all | above | below"),
):
    require_class_access(db, ctx, class_id)
    _validate_filter(threshold, comparator)
    return _pdf(svc.attendance_report(
        db, ctx.organization_id, ctx.user.id, class_id,
        threshold=threshold, comparator=comparator,
    ))


@router.get("/quiz/{class_id}", dependencies=[staff])
def quiz_pdf(
    class_id: int,
    ctx: TenantContext = Ctx,
    db: Session = Depends(get_db),
    threshold: float | None = Query(None, ge=0, le=100),
    comparator: str | None = Query(None),
    quiz_id: int | None = Query(None, description="Limit to a single quiz"),
):
    require_class_access(db, ctx, class_id)
    _validate_filter(threshold, comparator)
    return _pdf(svc.quiz_report(
        db, ctx.organization_id, ctx.user.id, class_id,
        threshold=threshold, comparator=comparator, quiz_id=quiz_id,
    ))


@router.get("/assignment/{class_id}", dependencies=[staff])
def assignment_pdf(
    class_id: int,
    ctx: TenantContext = Ctx,
    db: Session = Depends(get_db),
    threshold: float | None = Query(None, ge=0, le=100),
    comparator: str | None = Query(None),
    assignment_id: int | None = Query(None, description="Limit to a single assignment"),
):
    require_class_access(db, ctx, class_id)
    _validate_filter(threshold, comparator)
    return _pdf(svc.assignment_report(
        db, ctx.organization_id, ctx.user.id, class_id,
        threshold=threshold, comparator=comparator, assignment_id=assignment_id,
    ))


@router.get("/class-summary/{class_id}", dependencies=[staff])
def class_summary_pdf(
    class_id: int,
    ctx: TenantContext = Ctx,
    db: Session = Depends(get_db),
    threshold: float | None = Query(None, ge=0, le=100),
    comparator: str | None = Query(None),
):
    require_class_access(db, ctx, class_id)
    _validate_filter(threshold, comparator)
    return _pdf(svc.class_summary_report(
        db, ctx.organization_id, ctx.user.id, class_id,
        threshold=threshold, comparator=comparator,
    ))
