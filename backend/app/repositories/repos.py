"""Concrete tenant repositories.

Most are one-liners — the tenant safety lives in the base class. A few add
relationship-aware queries that are still tenant-scoped via `_scoped()`.
"""
from sqlalchemy import select

from app.models.academic import Class, Course, Enrollment
from app.models.assessment import (
    Assignment,
    AssignmentMark,
    AssignmentSubmission,
    Attendance,
    Quiz,
    QuizMark,
)
from app.models.identity import Manager, Student, Teacher, User
from app.models.organization import Organization
from app.models.report import Report
from app.repositories.base import TenantRepository


class OrganizationRepository(TenantRepository[Organization]):
    model = Organization

    def by_slug(self, slug: str) -> Organization | None:
        return self.db.execute(
            select(Organization).where(Organization.slug == slug)
        ).scalar_one_or_none()


class UserRepository(TenantRepository[User]):
    model = User

    def by_email(self, email: str) -> User | None:
        # Auth lookup happens before a tenant is established, so this is the
        # one query intentionally NOT tenant-scoped (email is globally unique).
        return self.db.execute(
            select(User).where(User.email == email.lower())
        ).scalar_one_or_none()


class TeacherRepository(TenantRepository[Teacher]):
    model = Teacher


class ManagerRepository(TenantRepository[Manager]):
    model = Manager


class StudentRepository(TenantRepository[Student]):
    model = Student


class CourseRepository(TenantRepository[Course]):
    model = Course


class ClassRepository(TenantRepository[Class]):
    model = Class


class EnrollmentRepository(TenantRepository[Enrollment]):
    model = Enrollment

    def for_class(self, class_id: int) -> list[Enrollment]:
        return list(
            self.db.execute(
                self._scoped().where(Enrollment.class_id == class_id)
            ).scalars().all()
        )

    def exists(self, student_id: int, class_id: int) -> bool:
        stmt = self._scoped().where(
            Enrollment.student_id == student_id, Enrollment.class_id == class_id
        )
        return self.db.execute(stmt).scalar_one_or_none() is not None


class AttendanceRepository(TenantRepository[Attendance]):
    model = Attendance

    def for_class(self, class_id: int) -> list[Attendance]:
        return list(
            self.db.execute(
                self._scoped().where(Attendance.class_id == class_id)
            ).scalars().all()
        )


class AssignmentRepository(TenantRepository[Assignment]):
    model = Assignment


class SubmissionRepository(TenantRepository[AssignmentSubmission]):
    model = AssignmentSubmission


class MarkRepository(TenantRepository[AssignmentMark]):
    model = AssignmentMark


class QuizRepository(TenantRepository[Quiz]):
    model = Quiz


class QuizMarkRepository(TenantRepository[QuizMark]):
    model = QuizMark


class ReportRepository(TenantRepository[Report]):
    model = Report
