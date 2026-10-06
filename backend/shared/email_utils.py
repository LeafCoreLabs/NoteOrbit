import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from shared.config import settings


def smtp_configured() -> bool:
    return bool(settings.smtp_host and settings.smtp_user and settings.smtp_pass)


def send_email(to_email: str, subject: str, body: str) -> bool:
    if not smtp_configured():
        print("SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in backend/.env")
        return False
    try:
        from_addr = settings.smtp_from or settings.smtp_user
        msg = MIMEMultipart()
        msg["From"] = from_addr
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "html"))

        if settings.smtp_use_ssl:
            server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=30)
        else:
            server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30)
            if settings.smtp_use_tls:
                server.starttls()

        server.login(settings.smtp_user, settings.smtp_pass)
        server.sendmail(from_addr, to_email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False


def send_professional_email(to_email: str, subject: str, title: str, details: dict, main_body: str) -> bool:
    if not to_email:
        return False
    rows = "".join(
        f'<div class="detail-row"><span class="label">{k}</span><span class="value">{v}</span></div>'
        for k, v in details.items()
    )
    html = f"""
    <!DOCTYPE html><html><body style="font-family:Segoe UI,sans-serif;">
    <div style="max-width:600px;margin:20px auto;background:#fff;border-left:5px solid #4f46e5;padding:20px;">
    <p style="color:#6b7280;font-size:14px;">NoteOrbit Notification</p>
    <h1 style="color:#4f46e5;">{title}</h1>
    <p>Dear User,</p><p>{main_body}</p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">{rows}</div>
    <p>Please log in to the portal to view full details.</p>
    </div></body></html>
    """
    return send_email(to_email, subject, html)
