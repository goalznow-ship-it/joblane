from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import text
import logging
from typing import AsyncGenerator
from apps.api.app.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)

# Create async engine
engine = create_async_engine(
    settings.database_url,
    pool_size=20,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=3600,
    pool_pre_ping=True,
    echo=settings.app_debug,
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Create base class for models
Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Database transaction failed: {e}")
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database connections."""
    try:
        # Test connection
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection established successfully")
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise


async def dispose_db():
    """Dispose database connections."""
    await engine.dispose()
    logger.info("Database connections disposed")


# Test database engine for testing
if settings.app_env == "test":
    test_engine = create_async_engine(
        settings.database_test_url,
        pool_size=5,
        max_overflow=2,
        pool_timeout=10,
        echo=False,
    )
    TestSessionLocal = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


async def get_test_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for testing."""
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()