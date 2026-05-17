"""Bootstrap + demo seed.

`ensure_bootstrap` is idempotent and safe to run on every startup: it creates
the three role rows and the platform Head Admin if missing.

`seed_demo` populates two fully isolated demo universities so the multi-tenant
behaviour is visible immediately (and so the frontend has data on first run).
Run it explicitly:  `python -m app.seed`
"""
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.academic import Class, Course, Enrollment
from app.models.assessment import Assignment, Attendance, Quiz, QuizMark
from app.models.enums import AttendanceStatus, RoleName
from app.models.identity import Manager, Role, Student, Teacher, User
from app.models.organization import Organization

_ROLE_SEED = {
    RoleName.HEAD_ADMIN: "Platform owner. Manages organizations and global setup.",
    RoleName.MANAGER: "Organization administrator. Manages teachers and org data.",
    RoleName.TEACHER: "Manages students, attendance, assignments and quizzes.",
}


def ensure_bootstrap(db: Session) -> None:
    for name, desc in _ROLE_SEED.items():
        if not db.query(Role).filter(Role.name == name.value).first():
            db.add(Role(name=name.value, description=desc))
    db.commit()

    head = db.query(User).filter(User.email == settings.HEAD_ADMIN_EMAIL.lower()).first()
    if not head:
        role = db.query(Role).filter(Role.name == RoleName.HEAD_ADMIN.value).one()
        db.add(
            User(
                organization_id=None,
                role_id=role.id,
                email=settings.HEAD_ADMIN_EMAIL.lower(),
                full_name=settings.HEAD_ADMIN_NAME,
                hashed_password=hash_password(settings.HEAD_ADMIN_PASSWORD),
            )
        )
        db.commit()


def _role_id(db: Session, name: RoleName) -> int:
    return db.query(Role).filter(Role.name == name.value).one().id


def _make_org(db: Session, *, name: str, slug: str, mgr_email: str) -> Organization:
    if db.query(Organization).filter(Organization.slug == slug).first():
        return db.query(Organization).filter(Organization.slug == slug).first()

    org = Organization(name=name, slug=slug, domain=f"{slug}.edu")
    db.add(org)
    db.flush()

    manager_user = User(
        organization_id=org.id,
        role_id=_role_id(db, RoleName.MANAGER),
        email=mgr_email,
        full_name=f"{name} Manager",
        hashed_password=hash_password("Manager@123"),
    )
    db.add(manager_user)
    db.flush()
    db.add(Manager(user_id=manager_user.id, organization_id=org.id, title="Registrar"))

    # One teacher
    t_user = User(
        organization_id=org.id,
        role_id=_role_id(db, RoleName.TEACHER),
        email=f"teacher@{slug}.edu",
        full_name=f"{name} Teacher",
        hashed_password=hash_password("Teacher@123"),
    )
    db.add(t_user)
    db.flush()
    teacher = Teacher(
        user_id=t_user.id, organization_id=org.id, employee_code="T-001",
        department="Computer Science", hire_date=date(2022, 8, 1),
    )
    db.add(teacher)
    db.flush()

    # Course + class
    course = Course(
        organization_id=org.id, code="CS-101",
        title="Introduction to Programming", credit_hours=3,
    )
    db.add(course)
    db.flush()
    klass = Class(
        organization_id=org.id, course_id=course.id, teacher_id=teacher.id,
        section="A", term="Fall 2026", room="Lab-1", schedule="Mon/Wed 10:00",
    )
    db.add(klass)
    db.flush()

    # Students + enrollments + attendance + assessments
    for i in range(1, 6):
        s = Student(
            organization_id=org.id,
            enrollment_number=f"{slug.upper()}-2026-{i:03d}",
            full_name=f"{name} Student {i}",
            email=f"student{i}@{slug}.edu",
            admission_date=date(2026, 8, 15),
        )
        db.add(s)
        db.flush()
        db.add(Enrollment(organization_id=org.id, student_id=s.id, class_id=klass.id))
        for d in range(5):
            db.add(
                Attendance(
                    organization_id=org.id, class_id=klass.id, student_id=s.id,
                    session_date=date(2026, 9, 1) + timedelta(days=d),
                    status=(AttendanceStatus.PRESENT.value if (i + d) % 4 else AttendanceStatus.ABSENT.value),
                    marked_by_teacher_id=teacher.id,
                )
            )

    assignment = Assignment(
        organization_id=org.id, class_id=klass.id,
        title="Assignment 1: Variables", max_marks=100,
        created_by_teacher_id=teacher.id,
    )
    db.add(assignment)
    quiz = Quiz(
        organization_id=org.id, class_id=klass.id, title="Quiz 1",
        topic="Basics", total_marks=20, quiz_date=date(2026, 9, 20),
        created_by_teacher_id=teacher.id,
    )
    db.add(quiz)
    db.flush()
    for s in db.query(Student).filter(Student.organization_id == org.id).all():
        db.add(
            QuizMark(
                organization_id=org.id, quiz_id=quiz.id, student_id=s.id,
                marks_obtained=12 + (s.id % 8),
            )
        )
    db.commit()
    return org


def seed_demo(db: Session) -> None:
    ensure_bootstrap(db)
    _make_org(db, name="Northfield University", slug="northfield",
              mgr_email="manager@northfield.edu")
    _make_org(db, name="Riverside Institute of Technology", slug="riverside",
              mgr_email="manager@riverside.edu")


if __name__ == "__main__":
    s = SessionLocal()
    try:
        seed_demo(s)
        print("Seed complete. Head Admin:", settings.HEAD_ADMIN_EMAIL)
        print("Demo managers: manager@northfield.edu / manager@riverside.edu (pw: Manager@123)")
        print("Demo teachers: teacher@northfield.edu / teacher@riverside.edu (pw: Teacher@123)")
    finally:
        s.close()
