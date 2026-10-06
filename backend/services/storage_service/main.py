from shared.app_factory import create_service_app
from shared.storage import ensure_bucket
from services.storage_service.routes import router as storage_router

ensure_bucket()
app = create_service_app("storage-api", [storage_router])
