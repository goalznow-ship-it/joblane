"""add_email_normalized_column

Revision ID: 00f03bd54a51
Revises: 93ebca109356
Create Date: 2026-08-14 11:42:30.611010
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision = "00f03bd54a51"
down_revision = "93ebca109356"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade():
    # Add email_normalized column as nullable initially
    op.add_column('users', sa.Column('email_normalized', sa.String(255), nullable=True))
    
    # Backfill email_normalized from email (lowercase)
    op.execute("UPDATE users SET email_normalized = LOWER(email)")
    
    # Check for duplicates before enforcing uniqueness
    duplicates = op.get_bind().execute(
        sa.text("SELECT email_normalized, COUNT(*) FROM users GROUP BY email_normalized HAVING COUNT(*) > 1")
    ).fetchall()
    
    if duplicates:
        raise ValueError(f"Duplicate email_normalized values found: {duplicates}")
    
    # Alter column to non-nullable and add unique constraint
    op.alter_column('users', 'email_normalized', nullable=False)
    op.create_unique_constraint('uq_users_email_normalized', 'users', ['email_normalized'])

def downgrade():
    op.drop_constraint('uq_users_email_normalized', 'users', type_='unique')
    op.drop_column('users', 'email_normalized')