import logging
from typing import Any, Optional
import redis

from shared.config import settings

logger = logging.getLogger(__name__)

_redis_instance: Optional[redis.Redis] = None


def get_redis_client() -> Optional[redis.Redis]:
    global _redis_instance
    if _redis_instance is None:
        try:
            url = getattr(settings, "redis_url", "redis://localhost:6379/0")
            _redis_instance = redis.from_url(
                url,
                decode_responses=True,
                socket_timeout=3,
                socket_connect_timeout=3,
                retry_on_timeout=True,
            )
        except Exception as e:
            logger.warning(f"[NoteOrbit Redis] Could not initialize client: {e}")
            return None
    return _redis_instance


def check_redis() -> dict[str, Any]:
    try:
        client = get_redis_client()
        if client is None:
            return {"status": "unconfigured", "connected": False}
        res = client.ping()
        return {
            "status": "connected" if res else "failed",
            "connected": bool(res),
            "endpoint": settings.redis_url.split("@")[-1] if "@" in settings.redis_url else settings.redis_url,
        }
    except Exception as e:
        return {"status": "error", "connected": False, "error": str(e)}


def cache_get(key: str) -> Optional[str]:
    try:
        client = get_redis_client()
        if client:
            return client.get(f"noteorbit:{key}")
    except Exception as e:
        logger.debug(f"[Redis Cache Get] Failed for key {key}: {e}")
    return None


def cache_set(key: str, value: str, ex_seconds: int = 3600) -> bool:
    try:
        client = get_redis_client()
        if client:
            client.set(f"noteorbit:{key}", value, ex=ex_seconds)
            return True
    except Exception as e:
        logger.debug(f"[Redis Cache Set] Failed for key {key}: {e}")
    return False


def cache_delete(key: str) -> bool:
    try:
        client = get_redis_client()
        if client:
            client.delete(f"noteorbit:{key}")
            return True
    except Exception as e:
        logger.debug(f"[Redis Cache Delete] Failed for key {key}: {e}")
    return False
