from shared.app_factory import create_service_app
from shared.routers.comms import router as comms_router

app = create_service_app("comms-api", [comms_router])
