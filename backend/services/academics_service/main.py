from shared.app_factory import create_service_app
from shared.routers.academics import router as academics_router

app = create_service_app("academics-api", [academics_router])
