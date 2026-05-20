"""Importing every model here ensures `Base.metadata` is fully populated
before Alembic autogenerate or `create_all` runs.
"""
from app.models.academic import Class, Course, Department, Enrollment
from app.models.assessment import (
    Assignment,
    AssignmentMark,
    AssignmentSubmission,
    Attendance,
    Quiz,
    QuizMark,
)
from app.models.identity import Manager, Role, Student, Teacher, User
from app.models.organization import Organization
from app.models.report import Report

__all__ = [
    "Organization",
    "Role",
    "User",
    "Manager",
    "Teacher",
    "Student",
    "Department",
    "Course",
    "Class",
    "Enrollment",
    "Attendance",
    "Assignment",
    "AssignmentSubmission",
    "AssignmentMark",
    "Quiz",
    "QuizMark",
    "Report",
]
