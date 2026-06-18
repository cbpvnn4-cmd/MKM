"""recreate_audit_logs_table

Revision ID: 965ac82670fb
Revises: 6e56bc16e76a
Create Date: 2025-10-27 12:13:03.271577+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '965ac82670fb'
down_revision = '6e56bc16e76a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the old audit_logs table if it exists (with wrong schema)
    op.execute("DROP TABLE IF EXISTS audit_logs")

    # Create the new audit_logs table with the correct schema
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('username', sa.String(100), nullable=True),
        sa.Column('user_role', sa.String(50), nullable=True),
        sa.Column('session_id', sa.String(100), nullable=True),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('entity_type', sa.String(100), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('entity_name', sa.String(255), nullable=True),
        sa.Column('old_values', sa.JSON(), nullable=True),
        sa.Column('new_values', sa.JSON(), nullable=True),
        sa.Column('changed_fields', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('request_method', sa.String(10), nullable=True),
        sa.Column('request_url', sa.String(500), nullable=True),
        sa.Column('request_parameters', sa.JSON(), nullable=True),
        sa.Column('audit_level', sa.String(20), default='medium', nullable=True),
        sa.Column('category', sa.String(50), nullable=True),
        sa.Column('subcategory', sa.String(50), nullable=True),
        sa.Column('is_successful', sa.Boolean(), default=True, nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('error_code', sa.String(50), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('contains_pii', sa.Boolean(), default=False, nullable=True),
        sa.Column('contains_financial', sa.Boolean(), default=False, nullable=True),
        sa.Column('retention_period_days', sa.Integer(), default=2555, nullable=True),
        sa.Column('compliance_tags', sa.JSON(), nullable=True),
        sa.Column('is_exported', sa.Boolean(), default=False, nullable=True),
        sa.Column('export_timestamp', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index('idx_audit_timestamp', 'audit_logs', ['timestamp'])
    op.create_index('idx_audit_user_id', 'audit_logs', ['user_id'])
    op.create_index('idx_audit_entity', 'audit_logs', ['entity_type', 'entity_id'])
    op.create_index('idx_audit_action', 'audit_logs', ['action'])
    op.create_index('idx_audit_category', 'audit_logs', ['category'])
    op.create_index('idx_audit_level', 'audit_logs', ['audit_level'])
    op.create_index('idx_audit_ip', 'audit_logs', ['ip_address'])
    op.create_index('idx_audit_session', 'audit_logs', ['session_id'])


def downgrade() -> None:
    op.drop_index('idx_audit_session', 'audit_logs')
    op.drop_index('idx_audit_ip', 'audit_logs')
    op.drop_index('idx_audit_level', 'audit_logs')
    op.drop_index('idx_audit_category', 'audit_logs')
    op.drop_index('idx_audit_action', 'audit_logs')
    op.drop_index('idx_audit_entity', 'audit_logs')
    op.drop_index('idx_audit_user_id', 'audit_logs')
    op.drop_index('idx_audit_timestamp', 'audit_logs')
    op.drop_table('audit_logs')