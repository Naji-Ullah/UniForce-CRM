"""Database engine, session factory and the declarative Base.

We use synchronous SQLAlchemy 2.0. FastAPI runs `def` route handlers in a
threadpool, so blocking DB calls never stall the event loop while keeping the
transaction/repository code linear and easy to reason about — which matters for
a project whose focus is correct relational behaviour.
"""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,   # transparently recycle stale connections
    pool_size=10,
    max_overflow=20,
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)


class Base(DeclarativeBase):
    """Declarative base shared by every ORM model."""


def get_db() -> Generator:
    """FastAPI dependency that yields a request-scoped session.

    The session is always closed; commits are explicit in the service layer so
    each request runs inside a single, well-defined transaction boundary.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
