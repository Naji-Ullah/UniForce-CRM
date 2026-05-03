from flask import Blueprint, request, jsonify
from app import db
from app.models import Student, Enrollment
from datetime import datetime

students_bp = Blueprint('students', __name__)

@students_bp.route('/students', methods=['GET'])
def get_students():
    students = Student.query.all()
    return jsonify([student.to_dict() for student in students])

@students_bp.route('/students/<int:id>', methods=['GET'])
def get_student(id):
    student = Student.query.get_or_404(id)
    return jsonify(student.to_dict())

@students_bp.route('/students', methods=['POST'])
def create_student():
    data = request.get_json()
    
    if not all(k in data for k in ('full_name', 'roll_number', 'email', 'semester', 'enrollment_date')):
        return jsonify({'error': 'Missing required fields'}), 400
    
    existing = Student.query.filter(
        (Student.roll_number == data['roll_number']) | 
        (Student.email == data['email'])
    ).first()
    
    if existing:
        return jsonify({'error': 'Student with this roll number or email already exists'}), 409
    
    try:
        enrollment_date = datetime.strptime(data['enrollment_date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    student = Student(
        full_name=data['full_name'],
        roll_number=data['roll_number'],
        email=data['email'],
        semester=data['semester'],
        enrollment_date=enrollment_date
    )
    
    db.session.add(student)
    db.session.commit()
    
    return jsonify(student.to_dict()), 201

@students_bp.route('/students/<int:id>', methods=['PUT'])
def update_student(id):
    student = Student.query.get_or_404(id)
    data = request.get_json()
    
    if 'full_name' in data:
        student.full_name = data['full_name']
    if 'roll_number' in data:
        existing = Student.query.filter(
            Student.id != id,
            Student.roll_number == data['roll_number']
        ).first()
        if existing:
            return jsonify({'error': 'Roll number already in use'}), 409
        student.roll_number = data['roll_number']
    if 'email' in data:
        existing = Student.query.filter(
            Student.id != id,
            Student.email == data['email']
        ).first()
        if existing:
            return jsonify({'error': 'Email already in use'}), 409
        student.email = data['email']
    if 'semester' in data:
        student.semester = data['semester']
    if 'enrollment_date' in data:
        try:
            student.enrollment_date = datetime.strptime(data['enrollment_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    db.session.commit()
    return jsonify(student.to_dict())

@students_bp.route('/students/<int:id>', methods=['DELETE'])
def delete_student(id):
    student = Student.query.get_or_404(id)
    db.session.delete(student)
    db.session.commit()
    return jsonify({'message': 'Student deleted successfully'}), 200
