from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

db = SQLAlchemy()
migrate = Migrate()

def create_app():
    app = Flask(__name__)
    
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    db.init_app(app)
    migrate.init_app(app, db)
    
    from app.routes.students import students_bp
    from app.routes.faculty import faculty_bp
    from app.routes.departments import departments_bp
    from app.routes.enrollments import enrollments_bp
    from app.routes.users import users_bp
    from app.routes.dashboard import dashboard_bp
    
    app.register_blueprint(students_bp, url_prefix='/api')
    app.register_blueprint(faculty_bp, url_prefix='/api')
    app.register_blueprint(departments_bp, url_prefix='/api')
    app.register_blueprint(enrollments_bp, url_prefix='/api')
    app.register_blueprint(users_bp, url_prefix='/api')
    app.register_blueprint(dashboard_bp, url_prefix='/api')
    
    return app
