from shared.app_factory import create_service_app
from shared.routers.ai import router as ai_router

app = create_service_app("ai-api", [ai_router])
