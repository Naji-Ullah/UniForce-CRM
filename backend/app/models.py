from app import db
from datetime import datetime

class Department(db.Model):
    __tablename__ = 'departments'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    faculty = db.relationship('Faculty', backref='department', lazy=True)
    enrollments = db.relationship('Enrollment', backref='department', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Student(db.Model):
    __tablename__ = 'students'
    
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(150), nullable=False)
    roll_number = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    enrollment_date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    enrollments = db.relationship('Enrollment', backref='student', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'full_name': self.full_name,
            'roll_number': self.roll_number,
            'email': self.email,
            'semester': self.semester,
            'enrollment_date': self.enrollment_date.isoformat() if self.enrollment_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Faculty(db.Model):
    __tablename__ = 'faculty'
    
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    designation = db.Column(db.String(100), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'full_name': self.full_name,
            'email': self.email,
            'designation': self.designation,
            'department_id': self.department_id,
            'department': self.department.to_dict() if self.department else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Enrollment(db.Model):
    __tablename__ = 'enrollments'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=False)
    status = db.Column(db.String(20), default='active')
    enrolled_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'student': self.student.to_dict() if self.student else None,
            'department_id': self.department_id,
            'department': self.department.to_dict() if self.department else None,
            'status': self.status,
            'enrolled_at': self.enrolled_at.isoformat() if self.enrolled_at else None
        }

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), default='staff')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def set_password(self, password):
        from werkzeug.security import generate_password_hash
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        from werkzeug.security import check_password_hash
        return check_password_hash(self.password_hash, password)
