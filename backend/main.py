import os
import sys
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
load_dotenv(backend_dir / ".env")

# Set sensible defaults for local development
os.environ.setdefault("DATABASE_URL", f"sqlite:///{backend_dir / 'noteorbit.db'}")
os.environ.setdefault("JWT_SECRET_KEY", "noteorbit-local-dev-secret-key-123456")
os.environ.setdefault("PASSWORD_SALT", "noteorbit_salt_v1")

from fastapi.staticfiles import StaticFiles
from shared.app_factory import create_service_app
from shared.database import SessionLocal, init_db
from shared.seed import seed_database
from shared.routers import (
    auth_router,
    admin_router,
    academics_router,
    campus_router,
    attendance_router,
    comms_router,
    ai_router,
)
from services.storage_service.routes import router as storage_router
from services.student_service.routes import router as student_router

# Initialize database schema and initial seed data
print("[NoteOrbit] Initializing database...")
try:
    init_db()
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    print("[NoteOrbit] Database tables and seed ready.")
except Exception as e:
    print(f"[NoteOrbit] Warning during DB init: {e}")

# Assemble unified app with all existing backend routes intact
all_routers = [
    auth_router,
    admin_router,
    academics_router,
    campus_router,
    attendance_router,
    comms_router,
    ai_router,
    storage_router,
    student_router,
]

app = create_service_app("unified-api", all_routers)

# Mount local uploads directory for files/notes
uploads_dir = backend_dir / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

@app.get("/")
def root():
    return {
        "service": "NoteOrbit API",
        "status": "online",
        "docs": "/docs",
        "portals": ["Student Portal", "Admin Portal"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
