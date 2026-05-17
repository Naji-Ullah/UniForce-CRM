"""Audit trail of generated PDF reports.

Every PDF a manager/teacher downloads is logged here. `params` is JSONB so the
exact filter set behind a report is reproducible without schema churn — a
pragmatic, indexed semi-structured column rather than a denormalised mess.
"""
from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TenantMixin, TimestampMixin


class Report(Base, TenantMixin, TimestampMixin):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    generated_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    report_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    scope: Mapped[str] = mapped_column(String(40), nullable=False)  # class | student
    reference_id: Mapped[int | None] = mapped_column()
    file_name: Mapped[str] = mapped_column(String(200), nullable=False)
    params: Mapped[dict | None] = mapped_column(JSONB)

    generated_by: Mapped["User"] = relationship()
