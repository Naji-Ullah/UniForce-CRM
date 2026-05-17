"""Reusable mapped-column mixins.

These keep the schema DRY and guarantee that auditing columns and the
multi-tenant discriminator are declared *identically* on every table — which is
exactly what tenant isolation depends on.
"""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column


class TimestampMixin:
    """`created_at` / `updated_at` audit columns, maintained by the database."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class TenantMixin:
    """Adds the `organization_id` tenant discriminator.

    Every tenant-scoped row carries this FK. It is indexed because *every*
    tenant-safe query filters on it, and ON DELETE CASCADE means deleting an
    organization atomically removes all of its data — no orphaned rows can
    leak across tenants.
    """

    organization_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
