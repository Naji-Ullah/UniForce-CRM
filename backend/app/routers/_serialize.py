"""Tiny serializers that flatten relationship-derived fields onto the
response schemas (course code, teacher name, enrolled count, …).
"""
from app.models.academic import Class, Enrollment
from app.models.identity import Teacher


def teacher_out(t: Teacher) -> dict:
    return {
        **{c.name: getattr(t, c.name) for c in t.__table__.columns},
        "email": t.user.email,
        "full_name": t.user.full_name,
        "is_active": t.user.is_active,
    }


def class_out(k: Class) -> dict:
    return {
        **{c.name: getattr(k, c.name) for c in k.__table__.columns},
        "course_code": k.course.code if k.course else None,
        "course_title": k.course.title if k.course else None,
        "teacher_name": k.teacher.user.full_name if k.teacher and k.teacher.user else None,
        "enrolled_count": len(k.enrollments),
    }


def enrollment_out(e: Enrollment) -> dict:
    return {
        **{c.name: getattr(e, c.name) for c in e.__table__.columns},
        "student_name": e.student.full_name if e.student else None,
        "enrollment_number": e.student.enrollment_number if e.student else None,
    }
