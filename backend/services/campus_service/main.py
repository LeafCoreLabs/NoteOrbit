from shared.app_factory import create_service_app
from shared.routers.campus import router as campus_router

app = create_service_app("campus-api", [campus_router])
