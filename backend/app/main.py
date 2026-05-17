"""FastAPI application entrypoint.

Wires routers, CORS, a single domain-exception handler (so services stay
framework-free) and a startup hook that guarantees the role lookup rows and
the bootstrap Head Admin exist.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.errors import AppError
from app.routers import academic, assessment, auth, dashboard, organizations, reports, students, teachers
from app.seed import ensure_bootstrap


@asynccontextmanager
async def lifespan(_: FastAPI):
    db = SessionLocal()
    try:
        ensure_bootstrap(db)  # idempotent: roles + head admin
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Multi-tenant SaaS University CRM — database-first architecture.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
async def app_error_handler(_: Request, exc: AppError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "service": settings.PROJECT_NAME}


api = settings.API_V1_PREFIX
for r in (
    auth.router,
    organizations.router,
    teachers.router,
    students.router,
    academic.courses,
    academic.classes,
    academic.enrollments,
    assessment.attendance,
    assessment.assignments,
    assessment.quizzes,
    reports.router,
    dashboard.router,
):
    app.include_router(r, prefix=api)
