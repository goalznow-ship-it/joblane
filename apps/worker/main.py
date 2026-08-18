"""
Celery worker application for Joblane.
Handles background tasks like email sending.
"""

from celery import Celery
from app.core.config import settings

# Create Celery app
celery = Celery(
    "joblane",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.tasks.email_tasks",
    ],
)

# Configure Celery
celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes
    task_soft_time_limit=240,  # 4 minutes
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
)

# Auto-discover tasks
celery.autodiscover_tasks(["app.tasks"])