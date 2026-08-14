# Dockerfile for Joblane Worker (Celery)
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
    redis-tools \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Install Python dependencies
COPY apps/worker/requirements.txt /app/apps/worker/requirements.txt
COPY packages/config/requirements.txt /app/packages/config/requirements.txt

# Install dependencies in a virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/apps/worker/requirements.txt && \
    pip install --no-cache-dir -r /app/packages/config/requirements.txt

# Copy application code
COPY apps/worker /app/apps/worker
COPY packages /app/packages

# Set environment variables for Celery
ENV CELERY_APP="apps.worker.main:celery"
ENV CELERY_BROKER_URL="redis://redis:6379/0"
ENV CELERY_RESULT_BACKEND="redis://redis:6379/0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD celery -A apps.worker.main inspect ping || exit 1

# Command to run the worker
CMD ["celery", "-A", "apps.worker.main", "worker", "--loglevel=info", "--concurrency=4"]