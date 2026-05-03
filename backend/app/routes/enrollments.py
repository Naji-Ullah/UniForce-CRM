from flask import Blueprint, request, jsonify
from app import db
from app.models import Enrollment, Student, Department

enrollments_bp = Blueprint('enrollments', __name__)

@enrollments_bp.route('/enrollments', methods=['GET'])
def get_enrollments():
    enrollments = Enrollment.query.all()
    return jsonify([enrollment.to_dict() for enrollment in enrollments])

@enrollments_bp.route('/enrollments/<int:id>', methods=['GET'])
def get_enrollment(id):
    enrollment = Enrollment.query.get_or_404(id)
    return jsonify(enrollment.to_dict())

@enrollments_bp.route('/enrollments', methods=['POST'])
def create_enrollment():
    data = request.get_json()
    
    if not all(k in data for k in ('student_id', 'department_id')):
        return jsonify({'error': 'Missing required fields'}), 400
    
    student = Student.query.get(data['student_id'])
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    
    department = Department.query.get(data['department_id'])
    if not department:
        return jsonify({'error': 'Department not found'}), 404
    
    existing = Enrollment.query.filter_by(
        student_id=data['student_id'],
        department_id=data['department_id']
    ).first()
    
    if existing:
        return jsonify({'error': 'Student already enrolled in this department'}), 409
    
    enrollment = Enrollment(
        student_id=data['student_id'],
        department_id=data['department_id'],
        status=data.get('status', 'active')
    )
    
    db.session.add(enrollment)
    db.session.commit()
    
    return jsonify(enrollment.to_dict()), 201

@enrollments_bp.route('/enrollments/<int:id>', methods=['PUT'])
def update_enrollment(id):
    enrollment = Enrollment.query.get_or_404(id)
    data = request.get_json()
    
    if 'status' in data:
        if data['status'] not in ['active', 'inactive']:
            return jsonify({'error': 'Status must be active or inactive'}), 400
        enrollment.status = data['status']
    if 'department_id' in data:
        department = Department.query.get(data['department_id'])
        if not department:
            return jsonify({'error': 'Department not found'}), 404
        enrollment.department_id = data['department_id']
    
    db.session.commit()
    return jsonify(enrollment.to_dict())

@enrollments_bp.route('/enrollments/<int:id>', methods=['DELETE'])
def delete_enrollment(id):
    enrollment = Enrollment.query.get_or_404(id)
    db.session.delete(enrollment)
    db.session.commit()
    return jsonify({'message': 'Enrollment deleted successfully'}), 200

@enrollments_bp.route('/students/<int:student_id>/enrollments', methods=['GET'])
def get_student_enrollments(student_id):
    student = Student.query.get_or_404(student_id)
    enrollments = Enrollment.query.filter_by(student_id=student_id).all()
    return jsonify([enrollment.to_dict() for enrollment in enrollments])
