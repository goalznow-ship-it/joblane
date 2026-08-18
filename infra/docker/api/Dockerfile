# Dockerfile for Joblane API (FastAPI)
FROM python:3.13-slim-bookworm

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_DEFAULT_TIMEOUT=100

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Install Python dependencies
COPY apps/api/requirements.txt /app/apps/api/requirements.txt
COPY packages/config/requirements.txt /app/packages/config/requirements.txt

# Install dependencies in a virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends libpq-dev && \
    pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir asyncpg && \
    pip install --no-cache-dir uvicorn && \
    pip install --no-cache-dir -r /app/apps/api/requirements.txt && \
    pip install --no-cache-dir -r /app/packages/config/requirements.txt

# Copy application code
COPY apps/api /app/apps/api
COPY packages /app/packages
COPY .env /app/.env

# Create necessary directories
RUN mkdir -p /app/apps/api/app/static /app/apps/api/app/media /app/apps/api/migrations /app/apps/api/alembic

# Set environment variables for FastAPI
ENV APP_MODULE="apps.api.main:app"
ENV HOST="0.0.0.0"
ENV PORT="8000"
ENV WORKERS_PER_CORE="1"
ENV MAX_WORKERS="4"

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health/live || exit 1

# Command to run the application
CMD ["uvicorn", "apps.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]