from flask import Blueprint, request, jsonify
from app import db
from app.models import User

users_bp = Blueprint('users', __name__)

@users_bp.route('/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

@users_bp.route('/users/<int:id>', methods=['GET'])
def get_user(id):
    user = User.query.get_or_404(id)
    return jsonify(user.to_dict())

@users_bp.route('/users', methods=['POST'])
def create_user():
    data = request.get_json()
    
    if not all(k in data for k in ('username', 'password')):
        return jsonify({'error': 'Missing required fields'}), 400
    
    existing = User.query.filter_by(username=data['username']).first()
    if existing:
        return jsonify({'error': 'Username already exists'}), 409
    
    role = data.get('role', 'staff')
    if role not in ['admin', 'staff']:
        return jsonify({'error': 'Role must be admin or staff'}), 400
    
    user = User(
        username=data['username'],
        role=role
    )
    user.set_password(data['password'])
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify(user.to_dict()), 201

@users_bp.route('/users/<int:id>', methods=['PUT'])
def update_user(id):
    user = User.query.get_or_404(id)
    data = request.get_json()
    
    if 'username' in data:
        existing = User.query.filter(
            User.id != id,
            User.username == data['username']
        ).first()
        if existing:
            return jsonify({'error': 'Username already in use'}), 409
        user.username = data['username']
    if 'role' in data:
        if data['role'] not in ['admin', 'staff']:
            return jsonify({'error': 'Role must be admin or staff'}), 400
        user.role = data['role']
    if 'password' in data:
        user.set_password(data['password'])
    
    db.session.commit()
    return jsonify(user.to_dict())

@users_bp.route('/users/<int:id>', methods=['DELETE'])
def delete_user(id):
    user = User.query.get_or_404(id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'User deleted successfully'}), 200

@users_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not all(k in data for k in ('username', 'password')):
        return jsonify({'error': 'Missing required fields'}), 400
    
    user = User.query.filter_by(username=data['username']).first()
    
    if user and user.check_password(data['password']):
        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict()
        })
    
    return jsonify({'error': 'Invalid credentials'}), 401
