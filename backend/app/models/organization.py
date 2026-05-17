"""The tenant root: `organizations`.

This is the anchor of the multi-tenant design. Every tenant-scoped table holds
an `organization_id` FK back to this table with ON DELETE CASCADE, so an
organization plus its entire academic dataset can be removed atomically and no
row can ever exist without an owning tenant.
"""
from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin


class Organization(Base, TimestampMixin):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(primary_key=True)
    # `slug` is the human-stable tenant key used in URLs/lookups — unique
    # platform-wide and indexed for fast tenant resolution.
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    domain: Mapped[str | None] = mapped_column(String(160), unique=True)
    plan: Mapped[str] = mapped_column(String(32), default="standard", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # One organization -> many of everything. Cascade mirrors the DB-level
    # ON DELETE CASCADE so the ORM session and the database agree.
    users: Mapped[list["User"]] = relationship(
        back_populates="organization", cascade="all, delete-orphan"
    )
    students: Mapped[list["Student"]] = relationship(
        back_populates="organization", cascade="all, delete-orphan"
    )
    courses: Mapped[list["Course"]] = relationship(
        back_populates="organization", cascade="all, delete-orphan"
    )
