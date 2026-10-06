import time
import logging
from typing import Optional, Tuple
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from shared.redis_client import get_redis_client

logger = logging.getLogger("noteorbit.ratelimit")

# In-memory fallback tracking when Redis is temporarily unavailable
_memory_cache: dict[str, list[float]] = {}


def get_client_ip(request: Request) -> str:
    """Extract real client IP handling reverse proxies (Render, Cloudflare, Vercel)."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "127.0.0.1"


def check_rate_limit(
    identifier: str,
    scope: str,
    max_requests: int,
    window_seconds: int = 60,
) -> Tuple[bool, int, int]:
    """
    Check rate limit for a given identifier (IP or user ID) under a scope.
    Returns (is_allowed, remaining_requests, retry_after_seconds).
    Uses Redis atomic counter with TTL, falling back to in-memory sliding window.
    """
    redis_client = get_redis_client()

    if redis_client:
        try:
            key = f"noteorbit:rl:{scope}:{identifier}"
            pipe = redis_client.pipeline()
            pipe.incr(key)
            pipe.ttl(key)
            results = pipe.execute()
            count = results[0]
            ttl = results[1]

            # If new key or no expiry, set the TTL
            if ttl == -1 or count == 1:
                redis_client.expire(key, window_seconds)
                ttl = window_seconds

            remaining = max(0, max_requests - count)
            is_allowed = count <= max_requests
            retry_after = max(1, ttl) if not is_allowed else 0

            return is_allowed, remaining, retry_after
        except Exception as e:
            logger.warning(f"[RateLimiter] Redis check failed, using memory fallback: {e}")

    # In-memory fallback
    now = time.time()
    key = f"{scope}:{identifier}"
    timestamps = _memory_cache.get(key, [])
    # Filter out timestamps older than window
    timestamps = [t for t in timestamps if now - t < window_seconds]

    if len(timestamps) >= max_requests:
        oldest = timestamps[0]
        retry_after = max(1, int(window_seconds - (now - oldest)))
        _memory_cache[key] = timestamps
        return False, 0, retry_after

    timestamps.append(now)
    _memory_cache[key] = timestamps
    remaining = max_requests - len(timestamps)
    return True, remaining, 0


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    FastAPI / Starlette Middleware applying tiered rate limiting.
    Exempts CORS OPTIONS, documentation, ping, and health endpoints.
    """

    EXEMPT_PATHS = {
        "/health",
        "/healthz",
        "/ping",
        "/health/keepalive-ping",
        "/docs",
        "/redoc",
        "/openapi.json",
        "/docs/oauth2-redirect",
    }

    async def dispatch(self, request: Request, call_next):
        # Always allow CORS preflight requests
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path

        # Always exempt health and doc endpoints
        if path in self.EXEMPT_PATHS or path.startswith("/docs") or path.startswith("/uploads"):
            return await call_next(request)

        # Tiered rules based on endpoint sensitivity
        if path in ("/login", "/register") or path.startswith("/auth"):
            scope = "auth"
            max_requests = 15  # 15 requests per minute for auth
            window = 60
        elif path.startswith("/chat") or path.startswith("/ai"):
            scope = "ai"
            max_requests = 20  # 20 requests per minute for AI
            window = 60
        elif path.startswith("/objects/upload") or path == "/upload-note":
            scope = "upload"
            max_requests = 30  # 30 uploads per minute
            window = 60
        else:
            scope = "general"
            max_requests = 120  # 120 requests per minute for standard API calls
            window = 60

        client_ip = get_client_ip(request)
        is_allowed, remaining, retry_after = check_rate_limit(
            identifier=client_ip,
            scope=scope,
            max_requests=max_requests,
            window_seconds=window,
        )

        if not is_allowed:
            logger.warning(f"[RateLimit 429] IP {client_ip} exceeded limit on {path} (scope: {scope})")
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too Many Requests",
                    "message": f"Rate limit exceeded for {scope} operations. Please try again in {retry_after} seconds.",
                    "retry_after": retry_after,
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(max_requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(retry_after),
                    "Access-Control-Allow-Origin": "*",
                },
            )

        response: Response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
