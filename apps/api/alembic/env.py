import os
import sys
from logging.config import fileConfig
from sqlalchemy import MetaData
from alembic import context

# Add /app to the Python path
sys.path.append('/app')

# this is the Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name:
    fileConfig(config.config_file_name)

# Import the Base class from the application
from apps.api.app.core.database import Base

# Use the application's Base.metadata as target_metadata
# This ensures the schema is defined in the models.py files
# and not duplicated in env.py

# Import the auth models to ensure they register with Base.metadata
from apps.api.app.auth.models import User, UserSession, EmailVerificationToken, PasswordResetToken

target_metadata = Base.metadata