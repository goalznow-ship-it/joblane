"""fix_user_sessions_token_column

Revision ID: 93ebca109356
Revises: 001_initial_auth_tables
Create Date: 2026-08-14 11:39:13.940277
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "93ebca109356"
down_revision: Union[str, None] = "001_initial_auth_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.alter_column("user_sessions", "session_token", new_column_name="token_hash")

def downgrade() -> None:
    op.alter_column("user_sessions", "token_hash", new_column_name="session_token")
