"""Shared schema building blocks."""
from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class ORMModel(BaseModel):
    """Base for response models read straight off ORM objects."""

    model_config = ConfigDict(from_attributes=True)


class TimestampedOut(ORMModel):
    id: int
    created_at: datetime
    updated_at: datetime


class Page(BaseModel, Generic[T]):
    """Envelope for paginated list endpoints."""

    items: list[T]
    total: int
    page: int
    page_size: int


class Message(BaseModel):
    detail: str
