from shared.app_factory import create_service_app
from shared.routers.auth import router as auth_router

app = create_service_app("auth-api", [auth_router])
