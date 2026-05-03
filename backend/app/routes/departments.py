from flask import Blueprint, request, jsonify
from app import db
from app.models import Department

departments_bp = Blueprint('departments', __name__)

@departments_bp.route('/departments', methods=['GET'])
def get_departments():
    departments = Department.query.all()
    return jsonify([dept.to_dict() for dept in departments])

@departments_bp.route('/departments/<int:id>', methods=['GET'])
def get_department(id):
    department = Department.query.get_or_404(id)
    return jsonify(department.to_dict())

@departments_bp.route('/departments', methods=['POST'])
def create_department():
    data = request.get_json()
    
    if not all(k in data for k in ('name', 'code')):
        return jsonify({'error': 'Missing required fields'}), 400
    
    existing = Department.query.filter(
        (Department.code == data['code']) | 
        (Department.name == data['name'])
    ).first()
    
    if existing:
        return jsonify({'error': 'Department with this code or name already exists'}), 409
    
    department = Department(
        name=data['name'],
        code=data['code']
    )
    
    db.session.add(department)
    db.session.commit()
    
    return jsonify(department.to_dict()), 201

@departments_bp.route('/departments/<int:id>', methods=['PUT'])
def update_department(id):
    department = Department.query.get_or_404(id)
    data = request.get_json()
    
    if 'name' in data:
        existing = Department.query.filter(
            Department.id != id,
            Department.name == data['name']
        ).first()
        if existing:
            return jsonify({'error': 'Department name already in use'}), 409
        department.name = data['name']
    if 'code' in data:
        existing = Department.query.filter(
            Department.id != id,
            Department.code == data['code']
        ).first()
        if existing:
            return jsonify({'error': 'Department code already in use'}), 409
        department.code = data['code']
    
    db.session.commit()
    return jsonify(department.to_dict())

@departments_bp.route('/departments/<int:id>', methods=['DELETE'])
def delete_department(id):
    department = Department.query.get_or_404(id)
    db.session.delete(department)
    db.session.commit()
    return jsonify({'message': 'Department deleted successfully'}), 200
