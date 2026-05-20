"""student login + departments

Adds:
  * `departments` table (org-scoped)
  * `teachers.department_id` FK; drops the legacy `department` string column
  * `students.user_id` FK so a student can have a login account
  * STUDENT role row

Revision ID: 0002_student_login_departments
Revises: 0001_initial
Create Date: 2026-05-20
"""
import sqlalchemy as sa
from alembic import op

revision = "0002_student_login_departments"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "departments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(),
                  sa.ForeignKey("organizations.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("code", sa.String(16), nullable=False, index=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("description", sa.String(500)),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("organization_id", "code", name="uq_department_org_code"),
        sa.UniqueConstraint("organization_id", "name", name="uq_department_org_name"),
    )

    op.add_column(
        "teachers",
        sa.Column("department_id", sa.Integer(),
                  sa.ForeignKey("departments.id", ondelete="SET NULL"),
                  nullable=True),
    )
    op.create_index("ix_teachers_department_id", "teachers", ["department_id"])
    op.drop_column("teachers", "department")

    op.add_column(
        "students",
        sa.Column("user_id", sa.Integer(),
                  sa.ForeignKey("users.id", ondelete="SET NULL"),
                  nullable=True),
    )
    op.create_unique_constraint("uq_students_user_id", "students", ["user_id"])
    op.create_index("ix_students_user_id", "students", ["user_id"])

    # Seed STUDENT role (idempotent via WHERE NOT EXISTS).
    op.execute(
        """
        INSERT INTO roles (name, description)
        SELECT 'STUDENT', 'Learner with a self-service login (view attendance and marks).'
        WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'STUDENT')
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM roles WHERE name = 'STUDENT'")
    op.drop_index("ix_students_user_id", "students")
    op.drop_constraint("uq_students_user_id", "students", type_="unique")
    op.drop_column("students", "user_id")

    op.add_column("teachers", sa.Column("department", sa.String(120), nullable=True))
    op.drop_index("ix_teachers_department_id", "teachers")
    op.drop_column("teachers", "department_id")

    op.drop_table("departments")
