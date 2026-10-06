from fastapi import FastAPI

from shared.database import init_db
from services.student_service.routes import router


app = FastAPI(title="NoteOrbit Student Service", version="1.0.0")


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok", "service": "student"}


app.include_router(router)

