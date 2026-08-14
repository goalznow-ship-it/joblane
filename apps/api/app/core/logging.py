import logging
import structlog
from pythonjsonlogger import jsonlogger
from app.core.config import settings
import sys


def configure_logging():
    """Configure structured logging for the application."""

    # Remove existing handlers
    logging.getLogger().handlers.clear()

    # Configure structlog
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.dev.set_exc_info,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer() if not settings.app_debug else structlog.dev.ConsoleRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=False,
    )

    # Set up root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Add JSON formatter for production
    if not settings.app_debug:
        json_formatter = jsonlogger.JsonFormatter(
            "%(asctime)s %(levelname)s %(name)s %(message)s %(module)s %(lineno)d",
            datefmt="%Y-%m-%dT%H:%M:%SZ",
        )
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(json_formatter)
        root_logger.addHandler(handler)

    return structlog.get_logger()


# Configure logging on import
logger = configure_logging()


def get_logger(name: str = __name__) -> structlog.BoundLogger:
    """Get a configured logger."""
    return logger.bind(module=name)