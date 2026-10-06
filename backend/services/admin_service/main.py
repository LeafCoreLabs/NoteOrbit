from shared.app_factory import create_service_app
from shared.routers.admin import router as admin_router

app = create_service_app("admin-api", [admin_router])
