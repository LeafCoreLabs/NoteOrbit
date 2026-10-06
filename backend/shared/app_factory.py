from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from shared.config import settings


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
    def healthz():
        return {"status": "ok", "service": service_name}

    for router in routers:
        app.include_router(router)

    return app
