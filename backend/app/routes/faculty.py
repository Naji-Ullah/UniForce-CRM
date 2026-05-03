from flask import Blueprint, request, jsonify
from app import db
from app.models import Faculty, Department

faculty_bp = Blueprint('faculty', __name__)

@faculty_bp.route('/faculty', methods=['GET'])
def get_faculty():
    faculty_list = Faculty.query.all()
    return jsonify([faculty.to_dict() for faculty in faculty_list])

@faculty_bp.route('/faculty/<int:id>', methods=['GET'])
def get_faculty_member(id):
    faculty = Faculty.query.get_or_404(id)
    return jsonify(faculty.to_dict())

@faculty_bp.route('/faculty', methods=['POST'])
def create_faculty():
    data = request.get_json()
    
    if not all(k in data for k in ('full_name', 'email', 'designation', 'department_id')):
        return jsonify({'error': 'Missing required fields'}), 400
    
    department = Department.query.get(data['department_id'])
    if not department:
        return jsonify({'error': 'Department not found'}), 404
    
    existing = Faculty.query.filter_by(email=data['email']).first()
    if existing:
        return jsonify({'error': 'Faculty with this email already exists'}), 409
    
    faculty = Faculty(
        full_name=data['full_name'],
        email=data['email'],
        designation=data['designation'],
        department_id=data['department_id']
    )
    
    db.session.add(faculty)
    db.session.commit()
    
    return jsonify(faculty.to_dict()), 201

@faculty_bp.route('/faculty/<int:id>', methods=['PUT'])
def update_faculty(id):
    faculty = Faculty.query.get_or_404(id)
    data = request.get_json()
    
    if 'full_name' in data:
        faculty.full_name = data['full_name']
    if 'email' in data:
        existing = Faculty.query.filter(
            Faculty.id != id,
            Faculty.email == data['email']
        ).first()
        if existing:
            return jsonify({'error': 'Email already in use'}), 409
        faculty.email = data['email']
    if 'designation' in data:
        faculty.designation = data['designation']
    if 'department_id' in data:
        department = Department.query.get(data['department_id'])
        if not department:
            return jsonify({'error': 'Department not found'}), 404
        faculty.department_id = data['department_id']
    
    db.session.commit()
    return jsonify(faculty.to_dict())

@faculty_bp.route('/faculty/<int:id>', methods=['DELETE'])
def delete_faculty(id):
    faculty = Faculty.query.get_or_404(id)
    db.session.delete(faculty)
    db.session.commit()
    return jsonify({'message': 'Faculty member deleted successfully'}), 200
