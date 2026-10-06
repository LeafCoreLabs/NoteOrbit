from shared.routers.academics import router as academics_router
from shared.routers.admin import router as admin_router
from shared.routers.ai import router as ai_router
from shared.routers.attendance import router as attendance_router
from shared.routers.auth import router as auth_router
from shared.routers.campus import router as campus_router
from shared.routers.comms import router as comms_router

__all__ = [
    "auth_router",
    "admin_router",
    "academics_router",
    "campus_router",
    "attendance_router",
    "comms_router",
    "ai_router",
]
