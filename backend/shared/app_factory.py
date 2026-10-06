import asyncio
from datetime import datetime, timezone
import logging
import os
import time
import urllib.request

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from shared.config import settings
from shared.redis_client import check_redis

logger = logging.getLogger("noteorbit.keepalive")
_START_TIME = time.time()


async def _run_keep_awake_loop(target_url: str, interval: int = 600):
    # Wait 60 seconds after process startup before starting cycle
    await asyncio.sleep(60)
    health_url = f"{target_url.rstrip('/')}/ping"
    logger.info(f"[NoteOrbit KeepAlive] Background worker active, pinging {health_url} every {interval}s")

    while True:
        try:
            loop = asyncio.get_running_loop()

            def _ping():
                req = urllib.request.Request(
                    health_url,
                    headers={"User-Agent": "NoteOrbit-KeepAlive-Daemon/1.0"}
                )
                with urllib.request.urlopen(req, timeout=20) as resp:
                    return resp.status

            code = await loop.run_in_executor(None, _ping)
            logger.info(f"[NoteOrbit KeepAlive] Pinged self successfully at {datetime.now(timezone.utc).isoformat()} (status: {code})")
        except Exception as e:
            logger.warning(f"[NoteOrbit KeepAlive] Ping attempt to {health_url} failed: {e}")

        await asyncio.sleep(interval)


def create_service_app(service_name: str, routers: list) -> FastAPI:
    app = FastAPI(title=f"NoteOrbit {service_name}", version="2.0.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_origin_regex=r"^https://.*\.vercel\.app$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/healthz")
    @app.get("/ping")
    def ping():
        return {
            "status": "ok",
            "service": service_name,
            "uptime_seconds": int(time.time() - _START_TIME),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    @app.get("/health")
    def health():
        # Check database connectivity
        db_status = {"connected": False, "latency_ms": None, "error": None}
        try:
            from shared.database import engine
            from sqlalchemy import text
            t0 = time.time()
            with engine.connect() as conn:
                conn.execute(text("SELECT 1;"))
            db_status["connected"] = True
            db_status["latency_ms"] = round((time.time() - t0) * 1000, 2)
        except Exception as e:
            db_status["error"] = str(e)

        # Check Redis connectivity
        redis_status = check_redis()

        uptime_sec = int(time.time() - _START_TIME)
        is_healthy = db_status["connected"]

        target_keepalive = (
            os.environ.get("RENDER_EXTERNAL_URL")
            or getattr(settings, "render_external_url", None)
            or "https://noteorbit-backend.onrender.com"
        )

        return {
            "status": "healthy" if is_healthy else "degraded",
            "service": service_name,
            "version": "2.0.0",
            "uptime_seconds": uptime_sec,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "database": db_status,
            "redis": redis_status,
            "keep_alive": {
                "active": True,
                "target_url": target_keepalive,
                "interval_seconds": int(os.environ.get("KEEP_AWAKE_INTERVAL_SECONDS", "600")),
            },
        }

    @app.post("/health/keepalive-ping")
    async def trigger_keepalive():
        target_url = os.environ.get("RENDER_EXTERNAL_URL") or "https://noteorbit-backend.onrender.com"
        health_url = f"{target_url.rstrip('/')}/ping"
        loop = asyncio.get_running_loop()

        def _ping():
            req = urllib.request.Request(health_url, headers={"User-Agent": "NoteOrbit-KeepAlive/1.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                return resp.status

        try:
            status = await loop.run_in_executor(None, _ping)
            return {"success": True, "pinged_url": health_url, "status": status}
        except Exception as e:
            return {"success": False, "pinged_url": health_url, "error": str(e)}

    @app.on_event("startup")
    async def on_startup():
        # Start self-keepalive background worker on Render to prevent 15-minute idle spin-down
        is_render = bool(os.environ.get("RENDER")) or bool(os.environ.get("RENDER_EXTERNAL_URL"))
        enabled = os.environ.get("KEEP_AWAKE", "true").lower() in ("true", "1", "yes")

        if enabled and (is_render or os.environ.get("ENABLE_LOCAL_KEEPALIVE") == "true"):
            target = os.environ.get("RENDER_EXTERNAL_URL") or "https://noteorbit-backend.onrender.com"
            interval = int(os.environ.get("KEEP_AWAKE_INTERVAL_SECONDS", "600"))
            asyncio.create_task(_run_keep_awake_loop(target, interval))
            print(f"[NoteOrbit] Keep-awake worker launched for {target} (every {interval}s)")

    for router in routers:
        app.include_router(router)

    return app
