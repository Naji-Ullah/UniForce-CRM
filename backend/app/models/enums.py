"""Domain enumerations.

Enums encode closed value sets at the application boundary. The *role* set is
additionally materialised as a `roles` lookup table (3NF: the role description
lives in one place, not repeated on every user row).
"""
import enum


class RoleName(str, enum.Enum):
    HEAD_ADMIN = "HEAD_ADMIN"
    MANAGER = "MANAGER"
    TEACHER = "TEACHER"


class EnrollmentStatus(str, enum.Enum):
    ENROLLED = "ENROLLED"
    DROPPED = "DROPPED"
    COMPLETED = "COMPLETED"


class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    LATE = "LATE"
    EXCUSED = "EXCUSED"


class SubmissionStatus(str, enum.Enum):
    SUBMITTED = "SUBMITTED"
    LATE = "LATE"
    MISSING = "MISSING"
    GRADED = "GRADED"


class StudentStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    GRADUATED = "GRADUATED"
    SUSPENDED = "SUSPENDED"
