"""add_min_projects_table

Revision ID: a1b2c3d4e5f6
Revises: e1f3d6a9c4a8
Create Date: 2025-10-23 12:10:00.000000+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'e1f3d6a9c4a8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create minimal projects table to satisfy existing FK on sales_orders.project_id
    # Use IF NOT EXISTS pattern for SQLite by checking sqlite_master
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'projects' not in inspector.get_table_names():
        op.create_table(
            'projects',
            sa.Column('id', sa.Integer, primary_key=True, index=True),
            sa.Column('name', sa.String(length=200), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'projects' in inspector.get_table_names():
        op.drop_table('projects')

