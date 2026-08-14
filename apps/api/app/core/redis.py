"""
Redis client for Joblane.
Provides async Redis connection for caching and rate limiting.
"""

import redis.asyncio as redis
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Global Redis client
_redis_client = None


async def get_redis() -> redis.Redis:
    """Get or create Redis client."""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
        logger.info("Redis client initialized")
    return _redis_client


async def close_redis() -> None:
    """Close Redis connection."""
    global _redis_client
    if _redis_client is not None:
        await _redis_client.close()
        _redis_client = None
        logger.info("Redis client closed")


# Convenience alias
async def redis_client() -> redis.Redis:
    """Get Redis client."""
    return await get_redis()