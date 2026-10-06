from shared.celery_app import celery_app
from shared.email_utils import send_professional_email


@celery_app.task(name="tasks.send_professional_email")
def send_professional_email_task(
    to_email: str, subject: str, title: str, details: dict, main_body: str
) -> bool:
    return send_professional_email(to_email, subject, title, details, main_body)
