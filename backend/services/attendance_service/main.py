from shared.app_factory import create_service_app
from shared.routers.attendance import router as attendance_router

app = create_service_app("attendance-api", [attendance_router])
