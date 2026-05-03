from flask import Blueprint, jsonify
from app.models import Student, Faculty, Department, Enrollment

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    total_students = Student.query.count()
    total_faculty = Faculty.query.count()
    total_departments = Department.query.count()
    total_enrollments = Enrollment.query.count()
    active_enrollments = Enrollment.query.filter_by(status='active').count()
    inactive_enrollments = Enrollment.query.filter_by(status='inactive').count()
    
    recent_students = Student.query.order_by(Student.created_at.desc()).limit(5).all()
    recent_faculty = Faculty.query.order_by(Faculty.created_at.desc()).limit(5).all()
    
    return jsonify({
        'counts': {
            'total_students': total_students,
            'total_faculty': total_faculty,
            'total_departments': total_departments,
            'total_enrollments': total_enrollments,
            'active_enrollments': active_enrollments,
            'inactive_enrollments': inactive_enrollments
        },
        'recent_students': [student.to_dict() for student in recent_students],
        'recent_faculty': [faculty.to_dict() for faculty in recent_faculty]
    })
