revision = '001_initial_auth_tables'
revision_id = '001_initial_auth_tables'

Revises:
Create Date: 2026-08-13 19:00:00

"""
Initial auth tables migration.

Create auth schema and all auth tables.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

def upgrade():
    """Create auth schema and all auth tables."""
    # Create auth schema
    op.execute("CREATE SCHEMA IF NOT EXISTS auth")
    op.execute("CREATE SCHEMA IF NOT EXISTS users")

    # Create users table
    op.create_table(
        'users',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('email', sa.String(255), unique=True, nullable=False, index=True),
        sa.Column('email_normalized', sa.String(255), unique=True, nullable=False, index=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('status', sa.Enum('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'BLOCKED', 'DELETED', name='user_status'), server_default='PENDING_VERIFICATION', nullable=False),
        sa.Column('email_verified_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now())),
        sa.Column('last_login_at', sa.DateTime(timezone=True)),
        sa.Column('deleted_at', sa.DateTime(timezone=True)),
        schema='users'
    )

    # Create user_sessions table
    op.create_table(
        'user_sessions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey("users.users.id", ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('token_hash', sa.String(255), nullable=False, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True)),
        sa.Column('ip_address', sa.String(45)),
        sa.Column('user_agent', sa.Text()),
        schema='auth'
    )

    # Create email_verification_tokens table
    op.create_table(
        'email_verification_tokens',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey("users.users.id", ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('token_hash', sa.String(255), nullable=False, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True)),
        schema='auth'
    )

    # Create password_reset_tokens table
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey("users.users.id", ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('token_hash', sa.String(255), nullable=False, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True)),
        schema='auth'
    )

def downgrade():
    """Drop all auth tables and auth schema."""
    # Drop tables
    op.drop_table('password_reset_tokens', schema='auth')
    op.drop_table('email_verification_tokens', schema='auth')
    op.drop_table('user_sessions', schema='auth')
    op.drop_table('users', schema='users')
    
    # Drop schemas
    op.execute("DROP SCHEMA IF EXISTS auth CASCADE")
    op.execute("DROP SCHEMA IF EXISTS users CASCADE")