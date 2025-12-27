import os
import hashlib
import requests # Used for OpenLibrary API calls
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
import random
from urllib.parse import urljoin
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt,
    verify_jwt_in_request, get_jwt_identity as _get_jwt_identity
)
from werkzeug.utils import secure_filename
import json
import time
import uuid
import io
import csv
import boto3
from functools import wraps
# File Processing Libs
try:
    import docx
except ImportError:
    docx = None
try:
    from pptx import Presentation
except ImportError:
    Presentation = None
    
# Optional PDF tool
try:
    import pdfkit
except ImportError:
    pdfkit = None
    print("Warning: pdfkit not installed. Using ReportLab/TXT fallback for receipts.")
try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
except ImportError:
    canvas = None
    A4 = None
    print("Warning: reportlab not installed. Receipts will be TXT only.")
from sqlalchemy import func, or_
from dotenv import load_dotenv

# Load .env
load_dotenv()

# -------------------- CONFIG (from .env) --------------------
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev_secret_jwt_key_please_set")
SECRET_KEY = os.getenv("SECRET_KEY") or JWT_SECRET_KEY
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
PASSWORD_SALT = os.getenv("PASSWORD_SALT", "noteorbit_salt_v1")
DEFAULT_ADMIN_EMAIL = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@noteorbit.edu")
DEFAULT_ADMIN_PASSWORD = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123")
DEFAULT_ADMIN_PASSWORD = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123")
FLASK_RUN_PORT = int(os.getenv("FLASK_RUN_PORT", 5000))
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")

# -------------------- HARDCODED MINIO CREDENTIALS (kept in-code per request) --------------------
S3_ENDPOINT = "http://localhost:9000"
S3_BUCKET = "noteorbit"
S3_ACCESS_KEY = "admin"
S3_SECRET_KEY = "password123"
# -------------------- END MINIO CREDENTIALS --------------------

# -------------------- EXTERNAL API CONFIG --------------------
OPENLIBRARY_URL = "https://openlibrary.org/search.json"

# -------------------- APP INIT --------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMP_DIR = os.path.join(BASE_DIR, "tmp")
RECEIPT_TMP_DIR = os.path.join(TEMP_DIR, "receipts")
os.makedirs(RECEIPT_TMP_DIR, exist_ok=True)

app = Flask(__name__)
app.config["SECRET_KEY"] = SECRET_KEY
app.config["JWT_SECRET_KEY"] = JWT_SECRET_KEY
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024
# CORS - allow local frontend origins (adjust if needed)
CORS(
    app,
    resources={r"*": {
        "origins": [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000"
        ],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    }}
)

# DB
DB_PATH = os.path.join(BASE_DIR, "noteorbit.db")
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)
jwt = JWTManager(app)

SALT = PASSWORD_SALT
RECEIPT_PREFIX = "fees/"

# -------------------- S3 / MinIO client --------------------
s3_client = boto3.client(
    "s3",
    endpoint_url=S3_ENDPOINT,
    aws_access_key_id=S3_ACCESS_KEY,
    aws_secret_access_key=S3_SECRET_KEY,
    region_name="us-east-1",
)

# -------------------- HELPERS --------------------

def send_email(to_email, subject, body):
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASS:
        print("SMTP not configured. Skipping email.")
        return False
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USER
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'html')) # Changed to HTML for better formatting

        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_USER, to_email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

def send_professional_email(to_email, subject, title, details, main_body):
    """
    Sends a professionally styled HTML email.
    details: dict of {'Label': 'Value'}
    """
    if not to_email:
        return False
        
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f9; color: #333; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); overflow: hidden; border-left: 5px solid #4f46e5; }}
            .header {{ background-color: #fff; padding: 30px 40px; border-bottom: 1px solid #eee; }}
            .header h1 {{ margin: 0; color: #4f46e5; font-size: 24px; letter-spacing: -0.5px; }}
            .header p {{ margin: 5px 0 0; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }}
            .content {{ padding: 30px 40px; line-height: 1.6; color: #374151; }}
            .details-box {{ background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 25px 0; }}
            .detail-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }}
            .detail-row:last-child {{ border-bottom: none; }}
            .label {{ color: #6b7280; font-weight: 500; font-size: 13px; }}
            .value {{ color: #111827; font-weight: 600; font-size: 14px; text-align: right; }}
            .footer {{ background-color: #f9fafb; padding: 20px 40px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #eee; }}
            .btn {{ display: inline-block; background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; margin-top: 10px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <p>NoteOrbit Notification</p>
                <h1>{title}</h1>
            </div>
            <div class="content">
                <p>Dear User,</p>
                <p>{main_body}</p>
                
                <div class="details-box">
                    {"".join([f'<div class="detail-row"><span class="label">{k}</span><span class="value">{v}</span></div>' for k, v in details.items()])}
                </div>
                
                <p>Please log in to the portal to view full details.</p>
                <center><a href="http://localhost:5173" class="btn">Login to NoteOrbit</a></center>
            </div>
            <div class="footer">
                &copy; 2025 NoteOrbit Academic System by LeafCore Labs. All rights reserved.<br>
                This is an automated message. Please do not reply.
            </div>
        </div>
    </body>
    </html>
    """
    return send_email(to_email, subject, html_content)




def generate_otp():
    return str(random.randint(100000, 999999))


def hash_password(password: str, salt: str = SALT) -> str:
    return hashlib.sha256((password + salt).encode()).hexdigest()


def allowed_file(filename: str):
    ALLOWED = {"pdf", "doc", "docx", "ppt", "pptx", "txt", "epub", "jpg", "jpeg", "png", "csv"}
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED


def upload_to_minio(file_obj, dest_key: str, content_type: str = "application/octet-stream"):
    """Handles file upload to MinIO (S3 compatible). Returns presigned URL and key."""
    try:
        # Ensure bucket exists
        s3_client.head_bucket(Bucket=S3_BUCKET)
    except Exception:
        try:
            s3_client.create_bucket(Bucket=S3_BUCKET)
        except Exception:
            pass

    # If file_obj is a werkzeug FileStorage, it has .stream; but upload_fileobj accepts file-like
    s3_client.upload_fileobj(
        file_obj,
        S3_BUCKET,
        dest_key,
        ExtraArgs={"ContentType": content_type},
    )

    url = s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": S3_BUCKET, "Key": dest_key},
        ExpiresIn=3600,
    )
    return url, dest_key


def cents_to_rupees_str(amount_cents):
    return f"{amount_cents // 100}.{amount_cents % 100:02d}"


def ensure_receipt_pdf(html_content, filename_base):
    fname = f"{filename_base}.pdf"
    local_path = os.path.join(RECEIPT_TMP_DIR, fname)

    # Try using pdfkit first
    if pdfkit:
        try:
            pdf_bytes = pdfkit.from_string(html_content, False)
            with open(local_path, "wb") as f:
                f.write(pdf_bytes)
            return local_path
        except Exception:
            pass

    # Fallback to ReportLab (Simple PDF)
    try:
        c = canvas.Canvas(local_path, pagesize=A4)
        textobject = c.beginText(40, 800)

        # Simple parsing to extract plain text lines from demo HTML
        temp_content = html_content
        if "<body>" in html_content:
            try:
                temp_content = html_content.split("<body>")[1].split("</body>")[0]
            except Exception:
                temp_content = html_content
        lines = [line.split(">", 1)[-1].replace("</p>", "").replace("</strong>", "") for line in temp_content.split("<p>")]

        for line in lines:
            line_plain = line.strip().replace("<h2>", "").replace("</h2>", "").replace("<strong>", "").replace("</small>", "").replace("<a>", "").replace("</a>", "")
            if line_plain:
                textobject.textLine(line_plain[:200])

        c.drawText(textobject)
        c.showPage()
        c.save()
        return local_path
    except Exception:
        # Final fallback to TXT
        txt_path = os.path.join(RECEIPT_TMP_DIR, f"{filename_base}.txt")
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write("Payment Receipt\n\n")
            import re
            clean = re.sub('<[^>]+>', '\n', html_content)
            f.write(clean)
        return txt_path


def upload_receipt(path_local, dest_key=None):
    if not dest_key:
        dest_key = RECEIPT_PREFIX + os.path.basename(path_local)
    # Determine content type based on extension
    content_type = "application/pdf" if path_local.endswith(".pdf") else "text/plain"

    with open(path_local, "rb") as f:
        upload_to_minio(f, dest_key, content_type)

    presigned = s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": S3_BUCKET, "Key": dest_key},
        ExpiresIn=3600,
    )
    return dest_key, presigned


# -------------------- LIBRARY HELPER --------------------

def search_open_library(query: str):
    """Fetches book data from OpenLibrary API and standardizes the output."""
    try:
        # Fetch up to 10 results from OpenLibrary
        response = requests.get(OPENLIBRARY_URL, params={"q": query, "limit": 10})
        response.raise_for_status()
        data = response.json()
        books = []
        for doc in data.get("docs", []):
            # Standardize the output format for the frontend
            author_names = doc.get("author_name")
            
            if doc.get("title") and author_names:
                # Use the first ISBN as a unique identifier if available
                isbn = doc.get("isbn")
                
                books.append({
                    "id": f"OL-{doc.get('key')}",
                    "title": doc["title"],
                    "author": ", ".join(author_names),
                    "source": "OpenLibrary",
                    # Generate a cover URL if cover ID is present
                    "cover_url": f"https://covers.openlibrary.org/b/id/{doc.get('cover_i')}-M.jpg" if doc.get('cover_i') else None,
                    "isbn": isbn[0] if isbn and isinstance(isbn, list) else None,
                    "file_url": None, # External source has no direct download link
                    "degree": None,
                    "semester": None
                })
        return books
    except Exception as e:
        print(f"Error calling OpenLibrary API: {e}")
        return []


# -------------------- DB MODELS --------------------

# --- NEW HOSTEL DB MODELS ---
class Hostel(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    address = db.Column(db.String(255))
    vacant_beds = db.Column(db.Integer, default=0)

class OTP(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), nullable=False)
    otp = db.Column(db.String(6), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    verified = db.Column(db.Boolean, default=False)

class Room(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    hostel_id = db.Column(db.Integer, db.ForeignKey('hostel.id', ondelete='CASCADE'))
    room_number = db.Column(db.String(20), nullable=False)
    capacity = db.Column(db.Integer, default=1)
    current_occupancy = db.Column(db.Integer, default=0)
    __table_args__ = (
        db.UniqueConstraint('hostel_id', 'room_number', name='uq_room_hostel'),
    )

class HostelAllocation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), unique=True, nullable=False)
    hostel_id = db.Column(db.Integer, db.ForeignKey('hostel.id'))
    room_id = db.Column(db.Integer, db.ForeignKey('room.id'))
    allocated_on = db.Column(db.DateTime, default=datetime.utcnow)

class AIChatSession(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), default="New Chat")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)
    messages = db.relationship('AIChatMessage', backref='session', cascade='all, delete-orphan')

class AIChatMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(36), db.ForeignKey('ai_chat_session.id', ondelete='CASCADE'), nullable=False)
    role = db.Column(db.String(20), nullable=False) # 'user' or 'ai'
    text = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    # Optional: store file reference if we want to retrieve attachments later
    attachment = db.Column(db.String(255), nullable=True)

# --- END NEW HOSTEL DB MODELS ---


class Degree(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)


class Section(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(20), unique=True, nullable=False)


class Subject(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    degree = db.Column(db.String(50), nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    name = db.Column(db.String(200), nullable=False)
    __table_args__ = (
        db.UniqueConstraint("degree", "semester", "name", name="uq_subject_degree_sem_name"),
    )


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    srn = db.Column(db.String(100), unique=True, nullable=True)
    name = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(200), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), default="student")
    degree = db.Column(db.String(50), nullable=True)
    semester = db.Column(db.Integer, nullable=True)
    section = db.Column(db.String(10), nullable=True)
    status = db.Column(db.String(20), default="PENDING")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    emp_id = db.Column(db.String(100), unique=True, nullable=True)
    parent_email = db.Column(db.String(200), nullable=True)
    parent_password_hash = db.Column(db.String(256), nullable=True)


class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(300))
    degree = db.Column(db.String(50))
    semester = db.Column(db.Integer)
    section = db.Column(db.String(50), nullable=True) # Added Section
    subject = db.Column(db.String(200))
    document_type = db.Column(db.String(100))
    file_path = db.Column(db.String(500))
    uploaded_by = db.Column(db.Integer, db.ForeignKey("user.id"))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)


class Notice(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(300))
    message = db.Column(db.Text)
    degree = db.Column(db.String(50))
    semester = db.Column(db.Integer)
    section = db.Column(db.String(50))
    subject = db.Column(db.String(200))
    deadline = db.Column(db.DateTime, nullable=True)
    attachment = db.Column(db.String(500), nullable=True)
    professor_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    professor_name = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Book(db.Model):
    __tablename__ = "books"
    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(300), nullable=False)
    author = db.Column(db.String(200))
    isbn = db.Column(db.String(100), nullable=True) # Added ISBN column for better searching
    degree = db.Column(db.String(50))
    semester = db.Column(db.Integer)
    file_path = db.Column(db.String(500), nullable=False)
    uploaded_by = db.Column(db.Integer, db.ForeignKey("user.id"))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)


class HostelComplaint(db.Model):
    __tablename__ = "hostel_complaints"
    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    hostel_id = db.Column(db.Integer, db.ForeignKey('hostel.id')) # NEW: Hostel info
    room_id = db.Column(db.Integer, db.ForeignKey('room.id')) 
    title = db.Column(db.String(300))
    description = db.Column(db.Text)
    status = db.Column(db.String(20), default="Open")
    attachment = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # NEW: Audit Trail/Status Log (JSON string)
    audit_trail = db.Column(db.Text, default='[]') 


class FeeNotification(db.Model):
    __tablename__ = "fee_notifications"
    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(300))
    description = db.Column(db.Text)
    amount_cents = db.Column(db.BigInteger, nullable=False)
    category = db.Column(db.String(50), default="misc")
    issued_by = db.Column(db.Integer, db.ForeignKey("user.id"))
    due_date = db.Column(db.DateTime, nullable=True)
    target = db.Column(db.String(50), default="batch")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class FeeTarget(db.Model):
    __tablename__ = "fee_targets"
    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    notification_id = db.Column(db.String, db.ForeignKey("fee_notifications.id", ondelete="CASCADE"))
    student_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    status = db.Column(db.String(20), default="pending")
    paid_at = db.Column(db.DateTime, nullable=True)
    order_id = db.Column(db.String, nullable=True)


class Order(db.Model):
    __tablename__ = "orders"
    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = db.Column(db.Integer, nullable=False)
    amount_cents = db.Column(db.BigInteger, nullable=False)
    currency = db.Column(db.String(8), default="INR")
    description = db.Column(db.Text)
    status = db.Column(db.String(32), default="created")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Payment(db.Model):
    __tablename__ = "payments"
    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = db.Column(db.String, db.ForeignKey("orders.id", ondelete="cascade"))
    amount_cents = db.Column(db.BigInteger, nullable=False)
    payment_method = db.Column(db.String(64), nullable=True)
    transaction_id = db.Column(db.String(200), nullable=True)
    status = db.Column(db.String(32), nullable=False)
    extra_metadata = db.Column(db.JSON, default={})
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Receipt(db.Model):
    __tablename__ = "receipts"
    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    payment_id = db.Column(db.String, db.ForeignKey("payments.id", ondelete="cascade"))
    storage_key = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Mark(db.Model):
    __tablename__ = "marks"
    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    subject = db.Column(db.String(200))
    exam_type = db.Column(db.String(50))
    marks_obtained = db.Column(db.Float)
    max_marks = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    uploaded_by = db.Column(db.Integer, db.ForeignKey("user.id"))


class Feedback(db.Model):
    __tablename__ = "feedback"
    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    subject = db.Column(db.String(200))
    faculty_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    text = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class FacultyAllocation(db.Model):
    __tablename__ = "faculty_allocations"
    id = db.Column(db.Integer, primary_key=True)
    faculty_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    degree = db.Column(db.String(50), nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    section = db.Column(db.String(50), nullable=False)
    subject = db.Column(db.String(200), nullable=False)
    # Unique constraint to prevent duplicate allocations
    __table_args__ = (
        db.UniqueConstraint("faculty_id", "degree", "semester", "section", "subject", name="_faculty_class_uc"),
    )


class Attendance(db.Model):
    __tablename__ = "attendance"
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    faculty_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    degree = db.Column(db.String(50), nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    section = db.Column(db.String(50), nullable=False)
    subject = db.Column(db.String(200), nullable=False)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), nullable=False) # "Present" or "Absent"
    timestamp = db.Column(db.DateTime, default=datetime.utcnow) # For 30 min edit window check
    __table_args__ = (
        db.UniqueConstraint("student_id", "subject", "date", name="_student_subject_date_uc"),
    )


class Message(db.Model):
    __tablename__ = "messages"
    id = db.Column(db.Integer, primary_key=True)
    sender = db.Column(db.String(20), nullable=False) # 'parent' or 'faculty'
    student_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    faculty_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False) 
    subject = db.Column(db.String(200))
    body = db.Column(db.Text)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)



# -------------------- AUTH / RBAC HELPERS --------------------

def roles_allowed(roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # Verify JWT in request and return friendly JSON if missing/invalid
            try:
                verify_jwt_in_request()
            except Exception as e:
                # Return 401 and hint for client
                return jsonify({"success": False, "message": "Authentication required", "detail": str(e)}), 401

            try:
                identity = get_jwt_identity()
                user = User.query.get(identity)
            except Exception:
                return jsonify({"success": False, "message": "Invalid token or user not found"}), 401

            if not user or user.role not in roles:
                return jsonify({"success": False, "message": "Insufficient permissions"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def roles_allowed(allowed_roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
                claims = get_jwt()
            except Exception as e:
                return jsonify({"success": False, "message": "Authentication required", "detail": str(e)}), 401

            if claims.get("role") not in allowed_roles:
                return jsonify({"success": False, "message": "Insufficient permissions"}), 403
        
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def admin_only(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            # 1. VERIFY JWT and extract identity
            verify_jwt_in_request()
            claims = get_jwt()
        except Exception as e:
            return jsonify({"success": False, "message": "Authentication required", "detail": str(e)}), 401

        # 2. RBAC CHECK
        if claims.get("role") != "admin":
            return jsonify({"success": False, "message": "Admin access required"}), 403
        
        # 3. PASS CONTROL
        return fn(*args, **kwargs)
    return wrapper


# -------------------- AUTH & ADMIN ROUTES --------------------


# -------------------- AUTHENTICATION & SECURITY ENDPOINTS (OTP) --------------------


def mask_email(email):
    try:
        if "@" not in email: return email
        parts = email.split("@")
        user = parts[0]
        domain = parts[1]
        if len(user) <= 2:
            masked_user = user[0] + "***" 
        else:
            masked_user = user[:2] + "***" + user[-1]
        return f"{masked_user}@{domain}"
    except:
        return email

@app.route("/auth/send-otp", methods=["POST"])
def send_otp_endpoint():
    data = request.json or {}
    identifier = data.get("email") # Can be email or ID/SRN
    mode = data.get("mode", "signup")  # 'signup' or 'forgot_password'

    if not identifier:
        return jsonify({"success": False, "message": "Email or ID is required"}), 400

    email_to_use = identifier
    
    # Logic to resolve email if identifier is not an email (e.g. for Forgot Password)
    if mode == "forgot_password":
        if "@" not in identifier:
           user = User.query.filter((User.email == identifier) | (User.srn == identifier) | (User.emp_id == identifier)).first()
        else:
           user = User.query.filter_by(email=identifier).first()
           
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        email_to_use = user.email
    elif mode == "parent_forgot":
         # Parent Forgot: Input is SRN, Find Student, Use Parent Email
         user = User.query.filter_by(srn=identifier).first()
         if not user:
             return jsonify({"success": False, "message": "Student not found with this SRN"}), 404
         if not user.parent_email:
             return jsonify({"success": False, "message": "No parent email registered for this student."}), 400
         email_to_use = user.parent_email

    # Generate OTP
    otp_code = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    # Save to DB
    otp_record = OTP.query.filter_by(email=email_to_use).first()
    if otp_record:
        otp_record.otp = otp_code
        otp_record.expires_at = expires_at
        otp_record.verified = False
    else:
        otp_record = OTP(email=email_to_use, otp=otp_code, expires_at=expires_at, verified=False)
        db.session.add(otp_record)
    
    db.session.commit()
    print(f"DEBUG OTP for {email_to_use}: {otp_code}")

    # Send Email
    subject = "NoteOrbit - Verification Code"
    body = f"""
    <h2>NoteOrbit Verification</h2>
    <p>Your One-Time Password (OTP) is:</p>
    <h1 style="color: #3b82f6;">{otp_code}</h1>
    <p>This code expires in 10 minutes.</p>
    """
    
    success = send_email(email_to_use, subject, body)
    
    # Return masked email for UI confirmation
    masked = mask_email(email_to_use)
    
    if success:
        return jsonify({"success": True, "message": f"OTP sent to {masked}", "masked_email": masked, "email": email_to_use})
    else:
        # Fallback for dev/demo if SMTP fails but we want to confirm flow (based on debug log)
        return jsonify({"success": False, "message": "Failed to send email (Check server logs for OTP)", "masked_email": masked, "email": email_to_use}), 500


@app.route("/auth/lookup-user", methods=["POST"])
def lookup_user_endpoint():
    """Lookup user by ID/Email and return masked email for confirmation."""
    data = request.json or {}
    identifier = data.get("identifier", "").strip()
    
    if not identifier:
        return jsonify({"success": False, "message": "Identifier required"}), 400
        
    # Check email, SRN, or Emp ID
    user = User.query.filter((User.email == identifier) | (User.srn == identifier) | (User.emp_id == identifier)).first()
    
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404
        
    return jsonify({
        "success": True, 
        "masked_email": mask_email(user.email),
        "email_exists": True
    })


@app.route("/auth/verify-otp", methods=["POST"])
def verify_otp_endpoint():
    data = request.json or {}
    email = data.get("email", "").lower().strip() # Normalize email
    user_otp = data.get("otp")

    if not email or not user_otp:
        return jsonify({"success": False, "message": "Email and OTP required"}), 400

    otp_record = OTP.query.filter_by(email=email).first()
    
    if not otp_record:
        return jsonify({"success": False, "message": "No OTP request found"}), 400

    if otp_record.expires_at < datetime.utcnow():
        return jsonify({"success": False, "message": "OTP expired"}), 400

    if otp_record.otp != user_otp:
        return jsonify({"success": False, "message": "Invalid OTP"}), 400

    # Mark as verified
    otp_record.verified = True
    db.session.commit()

    return jsonify({"success": True, "message": "OTP verified successfully"})


@app.route("/auth/reset-password", methods=["POST"])
def reset_password_endpoint():
    data = request.json or {}
    email = data.get("email", "").lower().strip() # Normalize email
    otp = data.get("otp")
    new_password = data.get("new_password")
    role_type = data.get("role_type", "user") # 'user' or 'parent'

    if not email or not otp or not new_password:
        return jsonify({"success": False, "message": "Email, OTP, and new password required"}), 400

    # Verify OTP (Allow immediate verification if passed correctly)
    otp_record = OTP.query.filter_by(email=email).first()
    
    if not otp_record:
         return jsonify({"success": False, "message": "No OTP session found"}), 400
         
    # Check expiry
    if otp_record.expires_at < datetime.utcnow():
        return jsonify({"success": False, "message": "OTP expired"}), 400
        
    # Check content
    if otp_record.otp != otp:
        return jsonify({"success": False, "message": "Invalid OTP"}), 400
    
    # If we reached here, OTP is valid. No need to check 'verified' flag strictly
    # just treat it as verified since the correct OTP was provided in this request.

    # Update User Password
    if role_type == "parent":
        # Finds user by parent email (assuming unique parent email per student for this flow, or finding associated student via SRN if passed, but here we rely on email from OTP)
        user = User.query.filter_by(parent_email=email).first() 
    else:
        user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    if role_type == "parent":
        user.parent_password_hash = hash_password(new_password)
    else:
        user.password_hash = hash_password(new_password)
        
    db.session.commit()

    # Clear OTP
    db.session.delete(otp_record)
    db.session.commit()

    return jsonify({"success": True, "message": "Password reset successfully. Please login."})


@app.route("/register", methods=["POST"])
def register():
    data = request.json or {}
    role = data.get("role")
    email = data.get("email")
    otp = data.get("otp")

    # Enforce OTP for students
    if role == "student":
        if not otp:
            return jsonify({"success": False, "message": "OTP is required for student registration"}), 400
        
        # Verify OTP record exists and is verified
        otp_record = OTP.query.filter_by(email=email).first()
        if not otp_record or not otp_record.verified or otp_record.otp != otp:
             return jsonify({"success": False, "message": "Email not verified. Please verify OTP first."}), 400

    if not email or not role:
        return jsonify({"success": False, "message": "Email and role required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"success": False, "message": "Email already registered"}), 400

    name = data.get("name")
    password = data.get("password")
    
    # Optional fields for student
    srn = data.get("srn")
    degree = data.get("degree")
    semester = data.get("semester")
    section = data.get("section")
    
    if srn and User.query.filter_by(srn=srn).first():
        return jsonify({"success": False, "message": "SRN already registered"}), 400

    new_user = User(
        email=email, 
        password_hash=hash_password(password), 
        role=role, 
        name=name,
        srn=srn, 
        degree=degree, 
        semester=int(semester) if semester else None, 
        section=section
    )
    
    if role == "student":
        new_user.status = "PENDING"
        msg = "Registration successful. Wait for Admin approval."
    else:
        new_user.status = "APPROVED"
        msg = "Faculty registration successful."

    db.session.add(new_user)
    
    # Cleanup OTP if used
    if otp:
        otp_record = OTP.query.filter_by(email=email).first()
        if otp_record:
            db.session.delete(otp_record)
            
    db.session.commit()
    return jsonify({"success": True, "message": msg})


@app.route("/login", methods=["POST"])
def login():
    data = request.json or {}
    identifier = data.get("email") # Can be email or SRN (for parents)
    password = data.get("password")
    role = data.get("role", "student") # student, admin, professor, parent

    if not identifier or not password:
        return jsonify({"success": False, "message": "Identifier & password required"}), 400

    if role == "parent":
        # Parent Login: uses SRN
        user = User.query.filter_by(srn=identifier).first()
        if not user:
             return jsonify({"success": False, "message": "Student not found"}), 404
        
        # Verify Parent Password
        if not user.parent_password_hash or user.parent_password_hash != hash_password(password):
             return jsonify({"success": False, "message": "Invalid parent credentials"}), 401

        # Success - Issue Token with parent role
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": "parent"},
            expires_delta=timedelta(days=7)
        )
        return jsonify({
            "success": True,
            "token": access_token,
            "user": {
                "id": user.id, "name": f"{user.name}'s Parent", "email": user.parent_email, # Show Parent Email
                "role": "parent", "srn": user.srn,
                "degree": user.degree, "semester": user.semester, "section": user.section,
                "status": user.status
            }
        })

    # Normal Login (email based)
    user = User.query.filter_by(email=identifier).first()
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    if user.password_hash != hash_password(password):
        return jsonify({"success": False, "message": "Invalid credentials"}), 401

    if user.role == "student" and user.status != "APPROVED":
        return jsonify({"success": False, "message": f"Account status: {user.status}. Wait for admin approval."}), 403

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role},
        expires_delta=timedelta(days=7)
    )
    return jsonify({
        "success": True,
        "token": access_token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "degree": user.degree or "",
            "semester": user.semester or 1,
            "section": user.section or "",
            "status": user.status
        }
    })


@app.route("/me", methods=["GET"])
@jwt_required()
def me():
    identity = get_jwt_identity()
    user = User.query.get(identity)
    return jsonify({
        "id": user.id, "name": user.name, "email": user.email,
        "role": user.role, "degree": user.degree, "semester": user.semester,
        "section": user.section, "status": user.status
    })


@app.route("/admin/pending-students", methods=["GET"])
@admin_only
def pending_students():
    students = User.query.filter_by(role="student", status="PENDING").order_by(User.created_at.asc()).all()
    out = []
    for s in students:
        out.append({
            "id": s.id, "srn": s.srn, "name": s.name, "email": s.email,
            "degree": s.degree, "semester": s.semester, "section": s.section,
            "created_at": s.created_at.isoformat() if s.created_at else None
        })
    return jsonify({"success": True, "students": out}), 200


@app.route("/admin/approve-student", methods=["POST"])
@admin_only
def approve_student():
    data = request.json or {}
    student_id = data.get("student_id")
    action = data.get("action", "approve")
    try:
        sid = int(student_id)
    except Exception:
        return jsonify({"success": False, "message": "Invalid student_id"}), 400
    s = User.query.filter_by(id=sid, role="student").first()
    if not s:
        return jsonify({"success": False, "message": "Student not found"}), 404
    s.status = "APPROVED" if action == "approve" else "REJECTED"
    db.session.commit()
    return jsonify({"success": True, "message": f"Student {action}d"})


@app.route("/admin/update-student", methods=["POST"])
@admin_only
def update_student():
    data = request.json or {}
    student_id = data.get("student_id")
    if not student_id:
        return jsonify({"success": False, "message": "Student ID required"}), 400
        
    s = User.query.get(student_id)
    if not s or s.role != "student":
        return jsonify({"success": False, "message": "Student not found"}), 404
        
    # Update allowed fields
    if "name" in data: s.name = data["name"]
    if "srn" in data: s.srn = data["srn"]
    if "degree" in data: s.degree = data["degree"]
    if "semester" in data: s.semester = int(data["semester"])
    if "section" in data: s.section = data["section"]
    if "parent_email" in data: s.parent_email = data["parent_email"]
    
    db.session.commit()
    return jsonify({"success": True, "message": "Student updated successfully"})


@app.route("/admin/generate-parent-password", methods=["POST"])
@admin_only
def generate_parent_password():
    data = request.json or {}
    student_id = data.get("student_id")
    if not student_id:
         return jsonify({"success": False, "message": "Student ID required"}), 400
         
    s = User.query.get(student_id)
    if not s or s.role != "student":
        return jsonify({"success": False, "message": "Student not found"}), 404
        
    if not s.parent_email:
        return jsonify({"success": False, "message": "Parent email not set for this student. Update student first."}), 400
        
    # Generate Random Password
    raw_password = f"P{random.randint(10000, 99999)}!"
    s.parent_password_hash = hash_password(raw_password)
    db.session.commit()
    
    # Send Email
    subject = f"NoteOrbit - Parent Portal Access for {s.name}"
    body = f"""
    <h2>Parent Portal Access Granted</h2>
    <p>Dear Parent,</p>
    <p>You have been granted access to the NoteOrbit Parent Portal to view the academic progress of your ward, <strong>{s.name}</strong> (SRN: {s.srn}).</p>
    <p><strong>Login Credentials:</strong></p>
    <ul>
        <li><strong>Ward SRN:</strong> {s.srn}</li>
        <li><strong>Password:</strong> {raw_password}</li>
    </ul>
    <p>Please login and change your password immediately.</p>
    <p><em>Access Link: <a href="http://localhost:5173/login">NoteOrbit Portal</a></em></p>
    """
    
    success = send_email(s.parent_email, subject, body)
    
    if success:
        return jsonify({"success": True, "message": f"Password sent to {s.parent_email}", "password": raw_password}) # Return pwd for dev ease if smtp fails
    else:
        return jsonify({"success": False, "message": "Failed to send email", "password": raw_password}), 500


@app.route("/admin/students", methods=["GET"])
@admin_only
def get_students_list_filtered():
    # Filters: degree, semester, section
    degree = request.args.get("degree")
    semester = request.args.get("semester")
    section = request.args.get("section")

    q = User.query.filter_by(role="student").order_by(User.name.asc())
    
    if degree:
        q = q.filter_by(degree=degree)
    
    if semester:
        try:
            q = q.filter_by(semester=int(semester))
        except ValueError:
            return jsonify({"success": False, "message": "Invalid semester parameter."}), 400
            
    if section:
        q = q.filter_by(section=section)
        
    students = q.all()
    out = []
    for s in students:
        # Fetch hostel/room info for display
        allocation = HostelAllocation.query.filter_by(student_id=s.id).first()
        hostel_info = None
        if allocation:
            hostel = Hostel.query.get(allocation.hostel_id)
            room = Room.query.get(allocation.room_id)
            if hostel and room:
                hostel_info = f"{hostel.name} (Room: {room.room_number})"
        
        out.append({
            "id": s.id, "srn": s.srn, "name": s.name, "email": s.email,
            "degree": s.degree, "semester": s.semester, "section": s.section,
            "status": s.status,
            "hostel_info": hostel_info, # Added hostel information
            "parent_email": s.parent_email,
            "parent_access": bool(s.parent_password_hash)
        })
        
    return jsonify({"success": True, "students": out}), 200


@app.route("/admin/add-faculty", methods=["POST"])
@admin_only
def add_faculty():
    data = request.json or {}
    required = ["name", "email", "password", "emp_id"]
    for r in required:
        if r not in data:
            return jsonify({"success": False, "message": f"Missing field {r}"}), 400

    if User.query.filter((User.email == data["email"]) | (User.emp_id == data["emp_id"])).first():
        return jsonify({"success": False, "message": "Email or EMP ID already registered."}), 400

    user = User(
        srn=None,
        name=data["name"],
        email=data["email"],
        password_hash=hash_password(data["password"]),
        role="professor",
        degree=None,
        semester=None,
        section=None,
        emp_id=data["emp_id"],
        status="APPROVED"
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({"success": True, "message": f"Faculty account created for {user.name}."})


@app.route("/admin/faculty", methods=["GET"])
@admin_only
def list_faculty_allocations():
    faculty = User.query.filter_by(role="professor").all()
    out = []
    for f in faculty:
        allocs = FacultyAllocation.query.filter_by(faculty_id=f.id).all()
        alloc_data = [{
            "id": a.id, "degree": a.degree, "semester": a.semester, 
            "section": a.section, "subject": a.subject
        } for a in allocs]
        out.append({
            "id": f.id, "name": f.name, "email": f.email, 
            "emp_id": f.emp_id, "allocations": alloc_data
        })
    return jsonify({"success": True, "faculty": out})


@app.route("/admin/faculty/allocate", methods=["POST"])
@admin_only
def allocate_faculty():
    data = request.json or {}
    fid = data.get("faculty_id")
    degree = data.get("degree")
    semester = data.get("semester")
    section = data.get("section")
    subject = data.get("subject")

    if not (fid and degree and semester and section and subject):
        return jsonify({"success": False, "message": "All fields required"}), 400

    # Check for duplicate
    exists = FacultyAllocation.query.filter_by(
        faculty_id=fid, degree=degree, semester=int(semester), 
        section=section, subject=subject
    ).first()
    
    if exists:
        return jsonify({"success": False, "message": "Allocation already exists"}), 400

    # Create allocation
    new_alloc = FacultyAllocation(
        faculty_id=fid, degree=degree, semester=int(semester), 
        section=section, subject=subject
    )
    db.session.add(new_alloc)
    db.session.commit()
    return jsonify({"success": True, "message": "Class allocated to faculty."})


@app.route("/admin/faculty/deallocate", methods=["POST"])
@admin_only
def deallocate_faculty():
    data = request.json or {}
    id = data.get("allocation_id")
    alloc = FacultyAllocation.query.get(id)
    if not alloc:
        return jsonify({"success": False, "message": "Allocation not found"}), 404
        
    db.session.delete(alloc)
    db.session.commit()
    return jsonify({"success": True, "message": "Allocation removed."})


@app.route("/admin/degrees", methods=["GET", "POST"])
def manage_degrees():
    if request.method == "POST":
        try:
            verify_jwt_in_request()
        except Exception:
            return jsonify({"success": False, "message": "Authentication required to modify degrees"}), 401
        user = User.query.get(get_jwt_identity())
        if user.role.lower() != "admin":
            return jsonify({"success": False, "message": "Admin access required to modify degrees"}), 403
        name = (request.json or {}).get("name")
        if not name or Degree.query.filter_by(name=name).first():
            return jsonify({"success": False, "message": "Invalid or duplicate degree"}), 400
        db.session.add(Degree(name=name)); db.session.commit()
    data = [d.name for d in Degree.query.order_by(Degree.name).all()]
    return jsonify({"success": True, "degrees": data})


@app.route("/admin/sections", methods=["GET", "POST"])
def manage_sections():
    if request.method == "POST":
        try:
            verify_jwt_in_request()
        except Exception:
            return jsonify({"success": False, "message": "Authentication required to modify sections"}), 401
        user = User.query.get(get_jwt_identity())
        if user.role != "admin":
            return jsonify({"success": False, "message": "Admin access required to modify sections"}), 403
        name = (request.json or {}).get("name")
        if not name or Section.query.filter_by(name=name).first():
            return jsonify({"success": False, "message": "Invalid or duplicate section"}), 400
        db.session.add(Section(name=name)); db.session.commit()
    data = [s.name for s in Section.query.order_by(Section.name).all()]
    return jsonify({"success": True, "sections": data})


@app.route("/admin/subjects", methods=["GET", "POST"])
def manage_subjects():
    if request.method == "POST":
        # === Manual Authorization & RBAC Check for POST (WRITE) requests ===
        try:
            # POST requests must have a token
            verify_jwt_in_request()
            admin_claims = get_jwt()
        except Exception:
            return jsonify({"success": False, "message": "Authentication required to modify subjects"}), 401
            
        # Check if the user has permission to POST (Admin or Professor)
        if admin_claims.get("role") not in ["admin", "professor"]:
            return jsonify({"success": False, "message": "Admin/Professor access required to modify subjects"}), 403
            
        # --- POST logic (Write operations) ---
        payload = request.json or {}
        degree = payload.get("degree"); semester = payload.get("semester"); name = payload.get("name")
        if not (degree and semester and name):
            return jsonify({"success": False, "message": "Missing fields"}), 400
        if not Degree.query.filter_by(name=degree).first():
            return jsonify({"success": False, "message": "Invalid degree"}), 400
        try:
            sem = int(semester)
        except:
            return jsonify({"success": False, "message": "Invalid semester"}), 400
        if Subject.query.filter_by(degree=degree, semester=sem, name=name).first():
            return jsonify({"success": False, "message": "Duplicate subject"}), 400
        db.session.add(Subject(degree=degree, semester=sem, name=name)); db.session.commit()
    
    # --- GET logic (Read operations - Publicly accessible) ---
    degree = request.args.get("degree"); semester = request.args.get("semester"); q = Subject.query
    if degree: q = q.filter_by(degree=degree)
    if semester:
        try:
            q = q.filter_by(semester=int(semester))
        except:
            pass
    items = [{"degree": s.degree, "semester": s.semester, "name": s.name} for s in q.order_by(Subject.name).all()]
    return jsonify({"success": True, "subjects": items})


# -------------------- RESOURCES (Notes, Books, Notices) --------------------

@app.route("/upload-note", methods=["POST"])
@roles_allowed(["professor", "admin"])
def upload_note():
    title = request.form.get("title"); degree = request.form.get("degree")
    semester = request.form.get("semester"); section = request.form.get("section")
    subject = request.form.get("subject")
    document_type = request.form.get("document_type"); file = request.files.get("file")
    if not (title and degree and semester and section and subject and document_type and file):
        return jsonify({"success": False, "message": "Missing fields"}), 400
    if not allowed_file(file.filename):
        return jsonify({"success": False, "message": "File type not allowed"}), 400

    ext = file.filename.rsplit(".", 1)[1].lower()
    filename = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex}.{ext}"
    key = f"notes/{filename}"
    upload_to_minio(file, key, file.mimetype)

    identity = get_jwt_identity(); uploader = User.query.get(identity)
    note = Note(
        title=title, degree=degree, semester=int(semester), section=section, subject=subject,
        document_type=document_type, file_path=key, uploaded_by=uploader.id
    )
    db.session.add(note); db.session.commit()
    
    # Notify Students
    students = User.query.filter_by(role="student", degree=degree, semester=int(semester), section=section, status="APPROVED").all()
    for s in students:
        send_professional_email(
            s.email,
            f"New Note: {subject}",
            "New Study Material Uploaded",
            {"Subject": subject, "Title": title, "Type": document_type, "Faculty": uploader.name},
            f"New study material has been uploaded for <strong>{subject}</strong>."
        )
    
    return jsonify({"success": True, "message": "Note uploaded"})


@app.route("/notes", methods=["GET"])
@jwt_required()
def get_notes():
    user = User.query.get(get_jwt_identity())
    degree = request.args.get("degree") or user.degree; semester = request.args.get("semester") or user.semester
    section = request.args.get("section") or user.section
    subject = request.args.get("subject")
    if not degree or not semester:
        return jsonify({"success": False, "message": "degree and semester are required"}), 400
    try:
        sem = int(semester)
    except:
        return jsonify({"success": False, "message": "Invalid semester"}), 400
    q = Note.query.filter_by(degree=degree, semester=sem)
    if section: q = q.filter_by(section=section)
    if subject: q = q.filter_by(subject=subject)
    notes = q.order_by(Note.timestamp.desc()).all()
    out = []
    for n in notes:
        try:
            file_url = s3_client.generate_presigned_url(
                "get_object", Params={"Bucket": S3_BUCKET, "Key": n.file_path}, ExpiresIn=3600
            )
        except Exception:
            file_url = None
        out.append({
            "id": n.id, "title": n.title, "degree": n.degree, "semester": n.semester, "section": n.section,
            "subject": n.subject, "document_type": n.document_type, "file_url": file_url,
            "uploaded_by": n.uploaded_by, "timestamp": n.timestamp.isoformat() if n.timestamp else None
        })
    return jsonify({"success": True, "notes": out})


# RENAMED and UPDATED for Admin Library Book Upload
@app.route("/api/admin/library/book", methods=["POST"])
@roles_allowed(["admin"])
def upload_book():
    title = request.form.get("title"); author = request.form.get("author")
    degree = request.form.get("degree"); semester = request.form.get("semester")
    isbn = request.form.get("isbn") # Optionally allow ISBN input
    file = request.files.get("file")
    
    if not (title and author and degree and semester and file):
        return jsonify({"success": False, "message": "Missing title, author, degree, semester, or file"}), 400
    if not allowed_file(file.filename):
        return jsonify({"success": False, "message": "File type not allowed"}), 400

    ext = file.filename.rsplit(".", 1)[1].lower()
    filename = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex}.{ext}"
    key = f"books/{filename}"
    upload_to_minio(file, key, file.mimetype)

    identity = get_jwt_identity()
    book = Book(
        title=title, author=author, isbn=isbn, degree=degree, semester=int(semester),
        file_path=key, uploaded_by=int(identity)
    )
    db.session.add(book); db.session.commit()
    return jsonify({"success": True, "message": f"Book '{title}' uploaded to Internal Library."})


# RENAMED and UPDATED for Unified Library Search
@app.route("/api/library/search", methods=["GET"])
@jwt_required()
def search_library():
    q = request.args.get("q", "")
    source = request.args.get("source", "internal").lower() # Default to internal
    
    if not q: return jsonify({"success": True, "books": []})
    
    out = []
    
    if source == "internal":
        # Internal Search Logic
        books = Book.query.filter(or_(
            Book.title.ilike(f"%{q}%"), 
            Book.author.ilike(f"%{q}%"),
            Book.isbn.ilike(f"%{q}%") # Search by ISBN too
        )).limit(20).all()

        for b in books:
            file_url = None
            try:
                # Generate a temporary download link
                file_url = s3_client.generate_presigned_url(
                    "get_object", Params={"Bucket": S3_BUCKET, "Key": b.file_path}, ExpiresIn=3600
                )
            except Exception:
                file_url = None
                
            # Internal book structure
            out.append({
                "id": b.id, "title": b.title, "author": b.author,
                "source": "Internal", "degree": b.degree, "semester": b.semester,
                "file_url": file_url,
                "isbn": b.isbn,
                "cover_url": None # Assuming no cover image is stored internally
            })
            
    elif source == "openlibrary":
        # External Search Logic
        out = search_open_library(q)
        
    else:
        return jsonify({"success": False, "message": "Invalid source parameter. Must be 'internal' or 'openlibrary'."}), 400
        
    return jsonify({"success": True, "books": out})


@app.route("/create-notice", methods=["POST"])
@roles_allowed(["professor", "admin"])
def create_notice():
    data = request.form or {}
    title = data.get("title"); message = data.get("message"); degree = data.get("degree")
    semester = data.get("semester"); section = data.get("section"); subject = data.get("subject")
    deadline_raw = data.get("deadline"); file = request.files.get("attachment")
    if not (title and message and degree and semester and section and subject):
        return jsonify({"success": False, "message": "Missing fields"}), 400
    if file and not allowed_file(file.filename):
        return jsonify({"success": False, "message": "Attachment type not allowed"}), 400

    attachment_key = None
    if file:
        ext = file.filename.rsplit(".", 1)[1].lower()
        fname = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex}.{ext}"
        attachment_key = f"notices/{fname}"
        upload_to_minio(file, attachment_key, file.mimetype)

    deadline = None
    if deadline_raw:
        try:
            deadline = datetime.strptime(deadline_raw, "%Y-%m-%d")
        except:
            return jsonify({"success": False, "message": "Invalid deadline format (YYYY-MM-DD)"}), 400

    identity = get_jwt_identity(); prof = User.query.get(identity)
    notice = Notice(
        title=title, message=message, degree=degree, semester=int(semester),
        section=section, subject=subject, deadline=deadline, attachment=attachment_key,
        professor_id=prof.id, professor_name=prof.name
    )
    db.session.add(notice); db.session.commit()

    # Notify Students
    try:
        sections_list = [s.strip().upper() for s in section.split(",")] if section else []
        q = User.query.filter_by(role="student", degree=degree, semester=int(semester), status="APPROVED")
        if sections_list:
             q = q.filter(User.section.in_(sections_list))
        
        students = q.all()
        for s in students:
             details = {"Subject": subject, "Posted By": prof.name, "Deadline": str(deadline) if deadline else "N/A"}
             send_professional_email(
                 s.email, 
                 f"New Notice: {title}", 
                 "Important Notice", 
                 details, 
                 f"{message[:200]}..." if len(message) > 200 else message
             )
    except Exception as e:
        print(f"Error sending notice emails: {e}")

    return jsonify({"success": True, "message": "Notice created"})


@app.route("/notices", methods=["GET"])
@jwt_required()
def get_notices():
    user = User.query.get(get_jwt_identity()); q = Notice.query
    subject = request.args.get("subject")

    if user.role == "student":
        q = q.filter_by(degree=user.degree, semester=user.semester)
        items = q.order_by(Notice.created_at.desc()).all(); filtered = []
        for n in items:
            sections = [s.strip().upper() for s in n.section.split(",")] if n.section else []
            if user.section and user.section.upper() in sections and (not subject or n.subject == subject):
                filtered.append(n)
        results = filtered
    else:
        degree = request.args.get("degree"); semester = request.args.get("semester"); section = request.args.get("section")
        if degree: q = q.filter_by(degree=degree)
        if semester:
            try:
                q = q.filter_by(semester=int(semester))
            except:
                return jsonify({"success": False, "message": "Invalid semester parameter."}), 400
        if section:
            q = q.filter(Notice.section.ilike(f"%{section}%"))
        if subject: q = q.filter_by(subject=subject)
        results = q.order_by(Notice.created_at.desc()).all()

    out = []
    for n in results:
        attachment_url = None
        if n.attachment:
            try:
                attachment_url = s3_client.generate_presigned_url(
                    "get_object", Params={"Bucket": S3_BUCKET, "Key": n.attachment}, ExpiresIn=3600
                )
            except Exception:
                attachment_url = None
        out.append({
            "id": n.id, "title": n.title, "message": n.message, "degree": n.degree,
            "semester": n.semester, "section": n.section, "subject": n.subject,
            "deadline": n.deadline.isoformat() if n.deadline else None, "attachment_url": attachment_url,
            "professor_id": n.professor_id, "professor_name": n.professor_name,
            "created_at": n.created_at.isoformat() if n.created_at else None
        })
    return jsonify({"success": True, "notices": out})


# -------------------- NEW HOSTEL MANAGEMENT ROUTES (ADMIN) --------------------

@app.route("/admin/hostel/hostels", methods=["GET", "POST"])
@admin_only
def manage_hostels():
    if request.method == "POST":
        data = request.json or {}
        name = data.get("name"); address = data.get("address")
        if not name:
            return jsonify({"success": False, "message": "Hostel name required"}), 400
        if Hostel.query.filter_by(name=name).first():
            return jsonify({"success": False, "message": "Hostel already exists"}), 400
        hostel = Hostel(name=name, address=address)
        db.session.add(hostel); db.session.commit()
        return jsonify({"success": True, "message": f"Hostel '{name}' added.", "id": hostel.id})
    
    # GET: Global Hostel Management View
    hostels = Hostel.query.all()
    out = []
    for h in hostels:
        total_rooms = Room.query.filter_by(hostel_id=h.id).count()
        occupied_rooms = Room.query.filter(Room.hostel_id == h.id, Room.current_occupancy > 0).count()
        total_capacity = db.session.query(func.sum(Room.capacity)).filter(Room.hostel_id == h.id).scalar() or 0
        current_occupancy = db.session.query(func.sum(Room.current_occupancy)).filter(Room.hostel_id == h.id).scalar() or 0
        
        out.append({
            "id": h.id, "name": h.name, "address": h.address,
            "total_rooms": total_rooms, "occupied_rooms": occupied_rooms,
            "total_capacity": total_capacity, "current_occupancy": current_occupancy,
            "vacant_beds": total_capacity - current_occupancy
        })
    return jsonify({"success": True, "hostels": out})


@app.route("/admin/hostel/rooms", methods=["GET", "POST"])
@admin_only
def manage_rooms():
    if request.method == "POST":
        data = request.json or {}
        hostel_id = data.get("hostel_id"); room_number = data.get("room_number")
        capacity = int(data.get("capacity", 1))
        if not (hostel_id and room_number) or capacity < 1:
            return jsonify({"success": False, "message": "Missing fields or invalid capacity"}), 400
        hostel = Hostel.query.get(hostel_id)
        if not hostel:
            return jsonify({"success": False, "message": "Hostel not found"}), 404
        if Room.query.filter_by(hostel_id=hostel_id, room_number=room_number).first():
            return jsonify({"success": False, "message": "Room already exists in this hostel"}), 400
        
        room = Room(hostel_id=hostel_id, room_number=room_number, capacity=capacity, current_occupancy=0)
        db.session.add(room); db.session.commit()
        # Update hostel total_rooms count (optional optimization)
        Hostel.query.filter_by(id=hostel_id).update({"total_rooms": Hostel.total_rooms + 1})
        db.session.commit()
        
        return jsonify({"success": True, "message": f"Room {room_number} added to {hostel.name}.", "id": room.id})

    # GET: Rooms List/Search
    hostel_id = request.args.get("hostel_id")
    q = Room.query
    if hostel_id:
        q = q.filter_by(hostel_id=hostel_id)
    rooms = q.order_by(Room.hostel_id, Room.room_number).all()
    
    out = []
    for r in rooms:
        hostel_name = Hostel.query.get(r.hostel_id).name if r.hostel_id else "N/A"
        out.append({
            "id": r.id, "hostel_id": r.hostel_id, "hostel_name": hostel_name,
            "room_number": r.room_number, "capacity": r.capacity, "occupancy": r.current_occupancy,
            "is_vacant": r.current_occupancy < r.capacity
        })
    return jsonify({"success": True, "rooms": out})


# MODIFIED: Accepts SRN instead of student_id in the payload
@app.route("/admin/hostel/assign-room", methods=["POST"])
@admin_only
def assign_room_to_student():
    data = request.json or {}
    # Retrieve SRN from the payload
    srn = data.get("srn"); room_id = data.get("room_id")
    
    if not (srn and room_id):
        return jsonify({"success": False, "message": "Missing SRN or room_id"}), 400

    # NEW STEP: Find student by SRN
    student = User.query.filter_by(srn=srn).first()
    
    if not student or student.role != 'student':
        return jsonify({"success": False, "message": "Student not found or user is not a student"}), 404
    
    # Use the retrieved student's internal ID for core logic
    student_id = student.id
    
    room = Room.query.get(room_id)
    
    if not room:
        return jsonify({"success": False, "message": "Room not found"}), 404
    if room.current_occupancy >= room.capacity:
        return jsonify({"success": False, "message": "Room is fully occupied"}), 400

    # 1. Remove previous allocation if exists (Core Logic Start)
    existing_allocation = HostelAllocation.query.filter_by(student_id=student_id).first()
    if existing_allocation:
        # Decrement occupancy in the old room
        old_room = Room.query.get(existing_allocation.room_id)
        if old_room:
            old_room.current_occupancy = max(0, old_room.current_occupancy - 1)
        db.session.delete(existing_allocation)
    
    # 2. Create new allocation
    new_allocation = HostelAllocation(
        student_id=student_id,
        hostel_id=room.hostel_id,
        room_id=room_id
    )
    db.session.add(new_allocation)
    
    # 3. Increment occupancy in the new room
    room.current_occupancy += 1
    
    db.session.commit()
    # Core Logic End
    return jsonify({"success": True, "message": f"Room {room.room_number} assigned to {student.name} (SRN: {srn})."})

# -------------------- HOSTEL COMPLAINT ROUTES (MODIFIED) --------------------

@app.route("/hostel/complaints", methods=["POST"])
@roles_allowed(["student"])
def submit_hostel_complaint():
    student_id = int(get_jwt_identity())
    
    # NEW: Check for hostel allocation before allowing complaint
    allocation = HostelAllocation.query.filter_by(student_id=student_id).first()
    if not allocation:
        # User is not allocated a hostel, block complaint submission
        return jsonify({"success": False, "message": "Complaint submission not allowed. No hostel is currently allotted to your account."}), 403

    title = request.form.get("title"); description = request.form.get("description"); file = request.files.get("attachment")
    if not title or not description:
        return jsonify({"success": False, "message": "Title and description required"}), 400

    attachment_key = None
    if file:
        if not allowed_file(file.filename):
            return jsonify({"success": False, "message": "Attachment file type not allowed."}), 400
        ext = file.filename.rsplit(".", 1)[1].lower()
        fname = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex}.{ext}"
        attachment_key = f"hostel-complaints/{fname}"
        upload_to_minio(file, attachment_key, file.mimetype)

    # Initial audit trail log
    initial_trail = json.dumps([{"status": "Open", "timestamp": datetime.utcnow().isoformat(), "note": "Complaint submitted.", "by": "Student"}])
    
    complaint = HostelComplaint(
        student_id=student_id, 
        hostel_id=allocation.hostel_id, # New: Store hostel info
        room_id=allocation.room_id, 
        title=title, 
        description=description, 
        attachment=attachment_key,
        status="Open",
        audit_trail=initial_trail
    )
    db.session.add(complaint); db.session.commit()
    return jsonify({"success": True, "message": "Complaint submitted successfully. Status: Open"})


# NEW ROUTE: Student Portal - View My Complaints and History
@app.route("/student/hostel/complaints", methods=["GET"])
@roles_allowed(["student", "parent"])
def student_view_hostel_complaints():
    student_id = int(get_jwt_identity())
    
    # Query for complaints belonging to the current student
    complaints = db.session.query(HostelComplaint, Hostel, Room).\
        filter(HostelComplaint.student_id == student_id).\
        outerjoin(Hostel, HostelComplaint.hostel_id == Hostel.id).\
        outerjoin(Room, HostelComplaint.room_id == Room.id).\
        order_by(HostelComplaint.created_at.desc()).all()

    out = []
    for c, hostel, room in complaints:
        file_url = None
        if c.attachment:
            try:
                # Generate a temporary download link for the attachment
                file_url = s3_client.generate_presigned_url(
                    "get_object", Params={"Bucket": S3_BUCKET, "Key": c.attachment}, ExpiresIn=3600
                )
            except Exception:
                file_url = None
                
        # Parse audit trail for live tracking/history
        try:
            audit_log = json.loads(c.audit_trail)
        except:
            audit_log = [{"status": c.status, "timestamp": c.created_at.isoformat() if c.created_at else "N/A", "note": "Initial status"}]
            
        out.append({
            "id": c.id, 
            "title": c.title, 
            "description": c.description,
            "status": c.status, 
            "hostel_name": hostel.name if hostel else "N/A", 
            "room_number": room.room_number if room else "N/A", 
            "file_url": file_url,
            "audit_trail": audit_log, # This provides the history/live tracking
            "created_at": c.created_at.isoformat() if c.created_at else None
        })
    return jsonify({"success": True, "complaints": out})
# END NEW ROUTE


@app.route("/admin/hostel/complaints", methods=["GET"])
@admin_only
def view_hostel_complaints():
    complaints = db.session.query(HostelComplaint, User, Hostel, Room).\
        join(User, HostelComplaint.student_id == User.id).\
        outerjoin(Hostel, HostelComplaint.hostel_id == Hostel.id).\
        outerjoin(Room, HostelComplaint.room_id == Room.id).\
        order_by(HostelComplaint.created_at.desc()).all()
        
    out = []
    for c, student, hostel, room in complaints:
        file_url = None
        if c.attachment:
            try:
                file_url = s3_client.generate_presigned_url(
                    "get_object", Params={"Bucket": S3_BUCKET, "Key": c.attachment}, ExpiresIn=3600
                )
            except Exception:
                file_url = None
                
        # Parse audit trail for frontend display
        try:
            audit_log = json.loads(c.audit_trail)
        except:
            audit_log = [{"status": c.status, "timestamp": c.created_at.isoformat() if c.created_at else "N/A", "note": "Initial status"}]
            
        out.append({
            "id": c.id, "title": c.title, "description": c.description,
            "status": c.status, 
            "student_id": student.id,
            "student_name": student.name if student else "Unknown",
            "hostel_name": hostel.name if hostel else "N/A", 
            "room_number": room.room_number if room else "N/A", 
            "file_url": file_url,
            "audit_trail": audit_log, # New: Audit Trail
            "created_at": c.created_at.isoformat() if c.created_at else None
        })
    return jsonify({"success": True, "complaints": out})


@app.route("/admin/hostel/complaints/<complaint_id>/status", methods=["PATCH"])
@admin_only
def update_hostel_complaint_status(complaint_id):
    data = request.json or {}
    new_status = data.get("status")
    note = data.get("note", "")
    
    VALID_STATUSES = ["Open", "Under Review", "Under Progress", "Resolved", "Closed"]
    
    if new_status not in VALID_STATUSES:
        return jsonify({"success": False, "message": "Invalid status value"}), 400
        
    complaint = HostelComplaint.query.get(complaint_id)
    if not complaint:
        return jsonify({"success": False, "message": "Complaint not found"}), 404
        
    # Update status
    complaint.status = new_status
    
    # Update audit trail
    trail = json.loads(complaint.audit_trail)
    admin_user = User.query.get(get_jwt_identity())
    trail.append({
        "status": new_status,
        "timestamp": datetime.utcnow().isoformat(),
        "by": admin_user.name if admin_user else "Admin",
        "note": note
    })
    complaint.audit_trail = json.dumps(trail)
    db.session.commit()
    
    # Notify Student
    s = User.query.get(complaint.student_id)
    if s:
        details = {"Complaint ID": f"#{complaint.id[:8]}", "Title": complaint.title, "New Status": new_status, "Admin Note": note}
        send_professional_email(s.email, f"Complaint Update: {new_status}", "Hostel Complaint Updated", details, f"The status of your hostel complaint '<strong>{complaint.title}</strong>' has been updated.")
    
    return jsonify({"success": True, "message": f"Complaint status updated to {new_status}.", "new_status": new_status})


@app.route("/admin/hostel/resolve", methods=["POST"])
@admin_only
def resolve_hostel_complaint():
    # Helper endpoint for frontend legacy button to use the new PATCH logic
    data = request.json or {}
    complaint_id = data.get("complaint_id")
    if not complaint_id:
        return jsonify({"success": False, "message": "Missing complaint_id"}), 400
    # Use the new PATCH logic internally to ensure audit trail is updated
    request.json = {"status": "Resolved", "note": "Complaint resolved by Admin using shortcut."}
    return update_hostel_complaint_status(complaint_id)


# -------------------- FEES, MARKS, FEEDBACK & AI CHAT ROUTES --------------------

@app.route("/admin/fees/create", methods=["POST"])
@admin_only
def admin_create_fee_notification():
    payload = request.json or {}
    title = payload.get("title"); amount_cents = int(payload.get("amount_cents", 0))
    if not title or amount_cents <= 0:
        return jsonify({"success": False, "message": "title and positive amount_cents required"}), 400

    notif = FeeNotification(
        title=title, description=payload.get("description"), amount_cents=amount_cents,
        category=payload.get("category", "misc"), issued_by=get_jwt_identity(),
        due_date=(datetime.strptime(payload["due_date"], "%Y-%m-%d") if payload.get("due_date") else None),
        target=payload.get("target", "batch")
    )
    db.session.add(notif); db.session.flush()

    target = notif.target; created_targets = 0
    if target in ("batch", "sem"):
        degree = payload.get("degree"); semester = payload.get("semester"); sections = payload.get("sections", "")
        q = User.query.filter_by(role="student")
        if degree: q = q.filter_by(degree=degree)
        if semester: q = q.filter_by(semester=int(semester))
        if sections:
            secs = [s.strip().upper() for s in sections.split(",") if s.strip()]
            students = q.filter(User.section.in_(secs)).all()
        else:
            students = q.all()
        for s in students:
            ft = FeeTarget(notification_id=notif.id, student_id=s.id)
            db.session.add(ft); created_targets += 1
            # Notify
            details = {"Title": title, "Amount": f"INR {amount_cents/100}", "Due Date": str(payload.get("due_date"))}
            send_professional_email(s.email, f"Fee Demand: {title}", "New Fee Notification", details, "A new fee payment is due.")
            if s.parent_email:
                send_professional_email(s.parent_email, f"Fee Demand: {s.name}", f"Fee Notification for {s.name}", details, f"A new fee payment is requested for your ward.")
    elif target == "custom":
        srns = payload.get("srns", []) or []
        for srn in srns:
            user = User.query.filter_by(srn=srn).first()
            if user:
                ft = FeeTarget(notification_id=notif.id, student_id=user.id)
                db.session.add(ft); created_targets += 1
                # Notify
                details = {"Title": title, "Amount": f"INR {amount_cents/100}", "Due Date": str(payload.get("due_date"))}
                send_professional_email(user.email, f"Fee Demand: {title}", "New Fee Notification", details, "A new fee payment is due.")
                if user.parent_email:
                    send_professional_email(user.parent_email, f"Fee Demand: {user.name}", f"Fee Notification for {user.name}", details, f"A new fee payment is requested for your ward.")
    elif target == "single":
        srn = payload.get("single_srn")
        user = User.query.filter_by(srn=srn).first()
        if user:
            ft = FeeTarget(notification_id=notif.id, student_id=user.id)
            db.session.add(ft); created_targets += 1
            # Notify
            details = {"Title": title, "Amount": f"INR {amount_cents/100}", "Due Date": str(payload.get("due_date"))}
            send_professional_email(user.email, f"Fee Demand: {title}", "New Fee Notification", details, "A new fee payment is due.")
            if user.parent_email:
                send_professional_email(user.parent_email, f"Fee Demand: {user.name}", f"Fee Notification for {user.name}", details, f"A new fee payment is requested for your ward.")
    db.session.commit()
    return jsonify({"success": True, "notification_id": notif.id, "targets_created": created_targets})


@app.route("/fees/list", methods=["GET"])
@jwt_required()
def student_fees_list():
    uid = int(get_jwt_identity())
    results = db.session.query(FeeTarget, FeeNotification).join(FeeNotification, FeeTarget.notification_id == FeeNotification.id).filter(FeeTarget.student_id == uid).order_by(FeeNotification.created_at.desc()).all()
    items = []
    for ft, notif in results:
        items.append({
            "target_id": ft.id, "notification_id": notif.id, "title": notif.title,
            "description": notif.description, "amount_cents": notif.amount_cents,
            "amount": cents_to_rupees_str(notif.amount_cents), "category": notif.category,
            "due_date": notif.due_date.isoformat() if notif.due_date else None,
            "status": ft.status, "paid_at": ft.paid_at.isoformat() if ft.paid_at else None,
            "payment_id": ft.order_id or None
        })
    return jsonify({"success": True, "fees": items})


@app.route("/fees/pay", methods=["POST"])
@jwt_required()
def create_demo_order():
    payload = request.json or {}; target_id = payload.get("target_id")
    ft = FeeTarget.query.filter_by(id=target_id).first()
    if not ft:
        return jsonify({"success": False, "message": "Target not found"}), 404
    notif = FeeNotification.query.get(ft.notification_id)
    if not notif:
        return jsonify({"success": False, "message": "Notification not found"}), 404
    if ft.status == "paid":
        return jsonify({"success": False, "message": "Fee already paid"}), 400
    order = Order(
        student_id=int(get_jwt_identity()), amount_cents=notif.amount_cents, description=notif.title
    )
    db.session.add(order); db.session.commit()
    ft.order_id = order.id; db.session.commit()
    return jsonify({"success": True, "order_id": order.id, "amount_cents": order.amount_cents})


@app.route("/demo/checkout/<order_id>", methods=["GET", "POST"])
def demo_checkout(order_id):
    order = Order.query.get(order_id)
    if not order:
        return "Order not found", 404
    if request.method == "GET":
        return f"""
        <html><body style="font-family: system-ui, Arial; padding: 24px;">
        <h2>Demo Checkout — NoteOrbit</h2><p>Order: {order.id} — Amount: ₹{cents_to_rupees_str(order.amount_cents)}</p>
        <form method="POST"><label>Card number (fake): <input name="card" /></label><br/><br/>
        <label>Name on card: <input name="name" /></label><br/><br/><button type="submit">Pay (Demo)</button></form>
        </body></html>
        """
    form = request.form
    payment = Payment(
        order_id=order.id, amount_cents=order.amount_cents, payment_method="card-demo",
        transaction_id=f"DEMO-{uuid.uuid4()}", status="success", extra_metadata={"card": form.get("card")}
    )
    db.session.add(payment); order.status = "paid"; db.session.commit()

    ft = FeeTarget.query.filter_by(order_id=order.id).first()
    if ft:
        ft.status = "paid";
        ft.paid_at = datetime.utcnow();
        ft.order_id = payment.id
        db.session.commit()

    student = User.query.get(order.student_id)
    student_name = student.name if student else "Student"; student_srn = student.srn if student else "SRN-NA"
    receipt_id = str(uuid.uuid4())
    html = f"""
    <html><body><h2>NoteOrbit — Payment Receipt (Demo)</h2><p><strong>Receipt ID:</strong> {receipt_id}</p>
    <p><strong>Student:</strong> {student_name} ({student_srn})</p><p><strong>Order ID:</strong> {order.id}</p>
    <p><strong>Payment ID:</strong> {payment.id}</p>
    <p><strong>Amount:</strong> ₹{cents_to_rupees_str(order.amount_cents)}</p><p><strong>Txn ID:</strong> {payment.transaction_id}</p>
    <p><small>Demo receipt generated by NoteOrbit. No real money exchanged.</small></p></body></html>
    """
    filename_base = f"receipt_{payment.id}"
    local_pdf = ensure_receipt_pdf(html, filename_base)
    storage_key, public_url = upload_receipt(local_pdf, dest_key=RECEIPT_PREFIX + os.path.basename(local_pdf))
    receipt = Receipt(payment_id=payment.id, storage_key=storage_key)
    db.session.add(receipt); db.session.commit()
    return f"""
    <html><body><h2>Payment Success (Demo)</h2><p>Transaction id: {payment.transaction_id}</p>
    <p><a href="{public_url}" target="_blank">Download Receipt (valid 1 hour)</a></p></body></html>
    """


@app.route("/fees/receipt/<payment_id>", methods=["GET"])
@jwt_required()
def get_receipt_for_payment(payment_id):
    pay = Payment.query.get(payment_id)
    if not pay:
        return jsonify({"success": False, "message": "Payment not found"}), 404
    rec = Receipt.query.filter_by(payment_id=payment_id).first()
    if not rec:
        return jsonify({"success": False, "message": "Receipt not found"}), 404
    url = s3_client.generate_presigned_url(
        "get_object", Params={"Bucket": S3_BUCKET, "Key": rec.storage_key}, ExpiresIn=3600
    )
    return jsonify({"success": True, "receipt_url": url})


@app.route("/faculty/marks/upload", methods=["POST"])
@roles_allowed(["professor", "admin"])
def faculty_upload_marks():
    payload = request.json or {}
    subject = payload.get("subject"); exam_type = payload.get("exam_type")
    srn = payload.get("srn")
    marks_obtained = payload.get("marks_obtained")
    max_marks = payload.get("max_marks")
    
    if not (subject and exam_type and srn and marks_obtained is not None and max_marks is not None):
        return jsonify({"success": False, "message": "subject, exam_type, srn, marks_obtained, and max_marks required"}), 400
        
    user = User.query.filter_by(srn=srn).first()
    if not user:
        return jsonify({"success": False, "message": f"Student with SRN {srn} not found."}), 404
        
    try:
        marks = float(marks_obtained)
        max_m = float(max_marks)
        if marks < 0 or max_m <= 0 or marks > max_m:
             return jsonify({"success": False, "message": "Invalid mark values (marks must be $\\ge 0$ and $\\le max\\_marks$, max\\_marks $> 0$)."}), 400
    except ValueError:
        return jsonify({"success": False, "message": "Marks must be numeric."}), 400

    uploader_id = int(get_jwt_identity())
    
    m = Mark(
        student_id=user.id, subject=subject, exam_type=exam_type,
        marks_obtained=marks, max_marks=max_m,
        uploaded_by=uploader_id
    )
    db.session.add(m); 
    db.session.commit()
    
    # Notify Student
    details = {"Subject": subject, "Exam Type": exam_type, "Score": f"{marks}/{max_m}", "Percentage": f"{(marks/max_m)*100:.1f}%"}
    send_professional_email(
        user.email, 
        f"Marks Released: {subject}", 
        "New Assessment Score", 
        details, 
        "Your marks for the recent assessment have been published."
    )
    
    # Notify Parent
    if user.parent_email:
        send_professional_email(
            user.parent_email, 
            f"Academic Alert: {user.name} - {subject}", 
            f"Marks Published for {user.name}", 
            details, 
            f"New marks have been uploaded for your ward, <strong>{user.name}</strong>."
        )
    
    return jsonify({"success": True, "message": f"Marks uploaded for {user.name}."})


# Removed the legacy /faculty/marks/upload-csv route as requested

@app.route("/student/marks", methods=["GET"])
@roles_allowed(["student", "parent"])
def student_get_marks():
    uid = int(get_jwt_identity()); rows = Mark.query.filter_by(student_id=uid).order_by(Mark.created_at.desc()).all()
    out = {}
    for r in rows:
        subj = r.subject
        out.setdefault(subj, []).append({
            "exam_type": r.exam_type,
            "marks_obtained": r.marks_obtained,
            "max_marks": r.max_marks,
            "uploaded_at": r.created_at.isoformat() if r.created_at else None
        })
    return jsonify({"success": True, "marks": out})


@app.route("/faculty/feedback", methods=["POST"])
@roles_allowed(["professor", "admin"])
def faculty_add_feedback():
    payload = request.json or {}; srn = payload.get("srn"); subject = payload.get("subject"); text = payload.get("text")
    if not srn or not subject or not text:
        return jsonify({"success": False, "message": "srn, subject and text required"}), 400
    student = User.query.filter_by(srn=srn).first()
    if not student:
        return jsonify({"success": False, "message": "student not found"}), 404
    fb = Feedback(
        student_id=student.id, subject=subject, faculty_id=int(get_jwt_identity()), text=text
    )
    db.session.add(fb); db.session.commit(); 
    
    # Notify Student & Parent
    details = {"Subject": subject, "Faculty": User.query.get(int(get_jwt_identity())).name, "Feedback": text}
    send_professional_email(student.email, f"New Feedback: {subject}", "Faculty Feedback Received", details, "You have received new feedback from your professor.")
    if student.parent_email:
        send_professional_email(student.parent_email, f"Feedback: {student.name} - {subject}", f"Faculty Feedback for {student.name}", details, f"Faculty has provided feedback for your ward, <strong>{student.name}</strong>.")

    return jsonify({"success": True, "message": "Feedback saved"})


@app.route("/student/feedback", methods=["GET"])
@roles_allowed(["student", "parent"])
def student_get_feedback():
    uid = int(get_jwt_identity()); rows = Feedback.query.filter_by(student_id=uid).order_by(Feedback.created_at.desc()).all()
    out = [{"subject": r.subject, "text": r.text, "faculty_id": r.faculty_id, "created_at": r.created_at.isoformat() if r.created_at else None} for r in rows]
    return jsonify({"success": True, "feedback": out})


@app.route("/faculty/allocations", methods=["GET"])
@roles_allowed(["professor", "admin"])
def get_faculty_allocations():
    fid = int(get_jwt_identity())
    allocs = FacultyAllocation.query.filter_by(faculty_id=fid).all()
    out = [{
        "id": a.id, "degree": a.degree, "semester": a.semester, 
        "section": a.section, "subject": a.subject
    } for a in allocs]
    return jsonify({"success": True, "allocations": out})


@app.route("/faculty/students", methods=["GET"])
@roles_allowed(["professor", "admin"])
def get_students_for_marking():
    degree = request.args.get("degree")
    semester = request.args.get("semester")
    section = request.args.get("section")
    subject = request.args.get("subject")
    date_str = request.args.get("date")

    if not (degree and semester and section):
        return jsonify({"success": False, "message": "Missing params"}), 400
    
    students = User.query.filter_by(role="student", degree=degree, semester=int(semester), section=section, status="APPROVED").order_by(User.srn.asc()).all()
    
    att_map = {}
    if subject and date_str:
        try:
            d = datetime.strptime(date_str, "%Y-%m-%d").date()
            rows = Attendance.query.filter_by(subject=subject, date=d).all()
            for r in rows:
                att_map[r.student_id] = {"status": r.status, "timestamp": r.timestamp}
        except ValueError:
            pass            

    out = []
    for s in students:
        att = att_map.get(s.id)
        out.append({
            "id": s.id, "srn": s.srn, "name": s.name,
            "status": att["status"] if att else None,
            "marked_at": att["timestamp"].isoformat() if att else None
        })

    return jsonify({"success": True, "students": out})


@app.route("/faculty/attendance", methods=["POST", "PUT"])
@roles_allowed(["professor", "admin"])
def mark_attendance():
    payload = request.json or {}
    fid = int(get_jwt_identity())
    
    if request.method == "POST":
        # Mark Attendance
        items = payload.get("data") # List of {student_id, status}
        degree = payload.get("degree")
        semester = payload.get("semester")
        section = payload.get("section")
        subject = payload.get("subject")
        date_str = payload.get("date") # YYYY-MM-DD
        
        if not (items and degree and semester and section and subject and date_str):
            return jsonify({"success": False, "message": "Missing fields"}), 400
            
        try:
            date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"success": False, "message": "Invalid date format"}), 400

        # Check existing logic? Optional: Prevent double marking or just overwrite?
        # User requested "editable for 30 mins".
        
        count = 0
        for item in items:
            sid = item.get("student_id")
            status = item.get("status")
            
            # Check existing
            exist = Attendance.query.filter_by(student_id=sid, subject=subject, date=date_obj).first()
            if exist:
                # Check edit window
                window = datetime.utcnow() - exist.timestamp
                if window.total_seconds() > 1800: # 30 mins
                     # Skip or Error? Let's skip locked ones but continue others?
                     # Ideally should block whole batch if one is locked?
                     # Let's simple check: If ANY locked, abort?
                     # Implementation: Just overwrite if within window.
                     continue 
                else:
                    exist.status = status
                    exist.timestamp = datetime.utcnow() # Reset timer on edit? Or keep original? "editable for a certain amount of time AFTER MARKING" -> implies original mark time.
                    # If I reset timestamp, window extends. Let's NOT update timestamp on edit to enforce strict 30m from FIRST mark.
                    # But if I created it now, I set timestamp.
            else:
                new_att = Attendance(
                    student_id=sid, faculty_id=fid, degree=degree, 
                    semester=int(semester), section=section, subject=subject, 
                    date=date_obj, status=status
                )
                db.session.add(new_att)
            
            # Notify if Absent
            if status == "Absent":
                stu = User.query.get(sid)
                if stu:
                    details = {"Subject": subject, "Date": date_str, "Status": "Absent"}
                    # Notify Student
                    send_professional_email(stu.email, f"Attendance Alert: Absent for {subject}", "Absence Recorded", details, f"You have been marked <strong>Absent</strong> for {subject} on {date_str}.")
                    # Notify Parent
                    if stu.parent_email:
                        send_professional_email(stu.parent_email, f"Attendance Alert: {stu.name} Absent", f"Absence Alert for {stu.name}", details, f"Your ward <strong>{stu.name}</strong> was marked Absent for {subject} on {date_str}.")

            count += 1
            
        db.session.commit()
        return jsonify({"success": True, "message": f"Attendance marked for {count} students."})

    elif request.method == "PUT":
        # Single Edit (if needed) or Bulk Edit same as POST logic?
        # I'll reuse POST for "Marking/Editing" as specified in requirement usually implies one interface.
        return jsonify({"success": False, "message": "Use POST to mark or update."})


@app.route("/student/attendance", methods=["GET"])
@roles_allowed(["student", "parent"])
def get_my_attendance():
    uid = int(get_jwt_identity())
    # Return list of {date, subject, status}
    rows = Attendance.query.filter_by(student_id=uid).order_by(Attendance.date.desc()).all()
    out = [{
        "date": r.date.isoformat(),
        "subject": r.subject,
        "status": r.status
    } for r in rows]
    return jsonify({"success": True, "attendance": out})


# -------------------- AI CHAT (Gemini) --------------------

def call_groq_api(prompt: str):
    # Check if the key is loaded and present
    if not GROQ_API_KEY:
        return None, "GROQ_API_KEY environment variable is missing or empty."
        
    API_URL = "https://api.groq.com/openai/v1/chat/completions"
    MAX_RETRIES = 3
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": "You are Orbit Bot, an Academic Assistant trained by Meta and tuned at LeafCore Labs. If asked who you are, introduce yourself using this identity. Provide helpful, concise, and academically relevant answers."},
            {"role": "user", "content": prompt}
        ]
    }
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.post(API_URL, headers={'Authorization': f'Bearer {GROQ_API_KEY}', 'Content-Type': 'application/json'}, data=json.dumps(payload))
            response.raise_for_status()
            result = response.json()
            text = result.get('choices', [{}])[0].get('message', {}).get('content')
            if text:
                return text, None
            else:
                return None, f"API returned an empty response. Response JSON: {result}"
        except requests.exceptions.HTTPError as e:
            if response.status_code in [429, 500, 503] and attempt < MAX_RETRIES - 1:
                time.sleep(2 ** attempt)
                continue
            return None, f"HTTP Error: {e} - Response Text: {response.text}"
        except requests.exceptions.RequestException as e:
            return None, f"Request failed: {e}"
        except Exception as e:
            return None, f"An unexpected error occurred: {e}"
    return None, f"Failed to connect to API after {MAX_RETRIES} attempts."


@app.route("/chat", methods=["POST"])
@jwt_required()
def chat():
    # Handle both JSON and Multipart
    q = ""
    file_text = ""
    session_id = ""
    user_id = int(get_jwt_identity())
    
    # 1. Parse Input
    if request.is_json:
        data = request.json or {}
        q = data.get("question") or data.get("q") or ""
        session_id = data.get("session_id")
    else:
        q = request.form.get("question") or request.form.get("q") or ""
        session_id = request.form.get("session_id")
        
        # 2. Handle File Upload
        if 'file' in request.files:
            file = request.files['file']
            if file and file.filename:
                filename = file.filename.lower()
                try:
                    if filename.endswith('.pdf'):
                        try:
                            import PyPDF2
                            pdf_reader = PyPDF2.PdfReader(file.stream)
                            for page in pdf_reader.pages:
                                text = page.extract_text()
                                if text:
                                    file_text += text + "\n"
                        except ImportError:
                             return jsonify({"success": False, "message": "Server missing PyPDF2 library. Please install it."}), 500
                    
                    elif filename.endswith('.docx') or filename.endswith('.doc'):
                        if not docx: return jsonify({"success": False, "message": "Server missing python-docx library."}), 500
                        try:
                            doc = docx.Document(file.stream)
                            for para in doc.paragraphs:
                                file_text += para.text + "\n"
                        except Exception as e:
                            file_text = f"[Error reading DOCX: {str(e)}]"

                    elif filename.endswith('.pptx'):
                        if not Presentation: return jsonify({"success": False, "message": "Server missing python-pptx library."}), 500
                        try:
                            prs = Presentation(file.stream)
                            for slide in prs.slides:
                                for shape in slide.shapes:
                                    if hasattr(shape, "text"):
                                        file_text += shape.text + "\n"
                        except Exception as e:
                             file_text = f"[Error reading PPTX: {str(e)}]"



                    elif filename.endswith(('.txt', '.md', '.py', '.js', '.html', '.css', '.json')):
                         file_text = file.read().decode('utf-8', errors='ignore')
                    else:
                        file_text = f"[Uploaded file: {file.filename} - Type not supported for automatic reading]"
                except Exception as e:
                    print(f"File read error: {e}")
                    file_text = f"[Error reading file: {str(e)}]"

    if not q and not file_text:
        return jsonify({"success": False, "message": "Question or file required"}), 400

    # 3. Session Management
    session = None
    if session_id:
        session = AIChatSession.query.filter_by(id=session_id, user_id=user_id).first()
        if not session:
             return jsonify({"success": False, "message": "Session not found or access denied"}), 404
        session.updated_at = datetime.utcnow()
    else:
        # Create New Session
        # Generate title from query (first 50 chars) or "New Chat" if empty/file-only
        title = q[:50] + "..." if q else "File Analysis"
        session = AIChatSession(user_id=user_id, title=title)
        db.session.add(session)
        db.session.commit()
    
    # 4. Save User Message
    user_msg_text = q
    if file_text:
        user_msg_text += f"\n[Attached: {request.files['file'].filename if 'file' in request.files else 'File'}]"
    
    db.session.add(AIChatMessage(session_id=session.id, role="user", text=user_msg_text))
    
    # 5. Construct Prompt with Context
    final_prompt = q
    if file_text:
        final_prompt += f"\n\n--- CONTEXT FROM UPLOADED FILE ({request.files['file'].filename}) ---\n{file_text[:20000]}\n--- END CONTEXT ---\n(Note: Text has been extracted from the file. Answer based on this context if relevant.)"

    # Context Awareness: Retrieve last few messages for context?
    # For now, keeping it stateless per request to save tokens, but could fetch history here.
    
    answer, error_msg = call_groq_api(final_prompt)
    
    if answer:
        # Save AI Response
        db.session.add(AIChatMessage(session_id=session.id, role="ai", text=answer))
        db.session.commit()
        return jsonify({"success": True, "answer": answer, "session_id": session.id})
    else:
        return jsonify({"success": False, "message": error_msg or "Failed to get response from AI model."}), 500


@app.route("/ai/sessions", methods=["GET"])
@jwt_required()
def get_ai_sessions():
    uid = int(get_jwt_identity())
    sessions = AIChatSession.query.filter_by(user_id=uid).order_by(AIChatSession.updated_at.desc()).all()
    out = [{"id": s.id, "title": s.title, "updated_at": s.updated_at.isoformat()} for s in sessions]
    return jsonify({"success": True, "sessions": out})


@app.route("/ai/session/<session_id>", methods=["GET", "DELETE"])
@jwt_required()
def manage_ai_session(session_id):
    uid = int(get_jwt_identity())
    session = AIChatSession.query.filter_by(id=session_id, user_id=uid).first()
    if not session:
        return jsonify({"success": False, "message": "Session not found"}), 404

    if request.method == 'DELETE':
        try:
            AIChatMessage.query.filter_by(session_id=session_id).delete() # Manual cascade
            db.session.delete(session)
            db.session.commit()
            return jsonify({"success": True, "message": "Session deleted"})
        except Exception as e:
            print(f"Error deleting session: {e}")
            db.session.rollback()
            return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500

    messages = AIChatMessage.query.filter_by(session_id=session_id).order_by(AIChatMessage.timestamp.asc()).all()
    out = [{"role": m.role, "text": m.text, "timestamp": m.timestamp.isoformat()} for m in messages]
    return jsonify({"success": True, "messages": out, "title": session.title})


@app.route("/api/academic-insights", methods=["GET"])
@jwt_required()
def get_academic_insights():
    """
    Aggregates student data (Marks, Attendance, Feedback) and asks Groq AI for insights.
    Returns: JSON with risks, priorities, and persona-based advice.
    """
    current_uid = int(get_jwt_identity())
    user = User.query.get(current_uid)
    
    # If parent, get ward's ID
    student_id = current_uid
    if user.role == "parent":
        # Parent login sends SRN as 'email' usually, but here we need to find the student linked to this parent.
        # Current login logic returns PARENT user object (which is a student object but role=parent? No, we have separate parent login flow).
        # Wait, the parent login logic in /login issues token with identity=student.id and role='parent'.
        # So get_jwt_identity() is ALREADY the student_id.
        pass
    
    # 1. Fetch Marks
    marks = Mark.query.filter_by(student_id=student_id).all()
    marks_summary = [{"subject": m.subject, "score": m.marks_obtained, "max": m.max_marks} for m in marks]
    
    # 2. Fetch Attendance
    # Calculate % per subject
    attendance_records = Attendance.query.filter_by(student_id=student_id).all()
    att_stats = {} # {subject: {present: 0, total: 0}}
    for r in attendance_records:
        if r.subject not in att_stats: att_stats[r.subject] = {"present": 0, "total": 0}
        att_stats[r.subject]["total"] += 1
        if r.status == "Present":
            att_stats[r.subject]["present"] += 1
            
    att_summary = []
    for subj, data in att_stats.items():
        pct = (data["present"] / data["total"]) * 100 if data["total"] > 0 else 0
        att_summary.append({"subject": subj, "percentage": round(pct, 1)})
        
    # 3. Fetch Feedback
    feedbacks = Feedback.query.filter_by(student_id=student_id).order_by(Feedback.created_at.desc()).limit(3).all()
    fb_summary = [{"subject": f.subject, "text": f.text} for f in feedbacks]
    
    # 4. Construct Prompt
    role_view = "Student" if user.role == "student" else "Parent"
    prompt = f"""
    Analyze the academic data for a student named {user.name}.
    Role View: {role_view} (Provide advice suitable for a {role_view}).
    
    Data:
    Marks: {json.dumps(marks_summary)}
    Attendance: {json.dumps(att_summary)}
    Recent Feedback: {json.dumps(fb_summary)}
    
    Task:
    1. Identify 'Attendance Risks' (Subjects < 75%).
    2. Identify 'Subject Priorities' (Low marks).
    3. Generate 'Improvement Suggestions' (Actionable steps).
    4. Write a 'Counselor Message': A warm, professional paragraph summarizing status and advice.
       - If Student view: Be encouraging, strategic.
       - If Parent view: Be reassuring, clear on what to monitor.
       
    Output strictly in valid JSON format:
    {{
        "attendance_risks": ["Subject A", ...],
        "priorities": ["Subject B", ...],
        "suggestions": ["Tip 1", "Tip 2", ...],
        "counselor_message": "..."
    }}
    """
    
    # 5. Call AI
    ai_response, error = call_groq_api(prompt)
    
    if not ai_response:
        # Fallback if AI fails
        return jsonify({
            "success": True, 
            "insights": {
                "attendance_risks": [], "priorities": [], 
                "suggestions": ["Focus on consistent attendance.", "Review recent class notes."],
                "counselor_message": "AI services are currently unavailable, but please review your marks and attendance manually."
            }
        })
        
    # Parse JSON from AI (It might wrap in markdown code blocks)
    try:
        clean_json = ai_response.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(clean_json)
        return jsonify({"success": True, "insights": parsed})
    except Exception as e:
        print(f"AI Parse Error: {e}")
        return jsonify({"success": True, "insights": {
             "attendance_risks": [], "priorities": [], 
             "suggestions": ["Please review your dashboard."], 
             "counselor_message": ai_response # Return raw text if JSON parse fails
        }})


# -------------------- DB INIT --------------------

def init_db():
    db.create_all() # This now includes Hostel, Room, and HostelAllocation
    admin_email = DEFAULT_ADMIN_EMAIL
    admin_password = DEFAULT_ADMIN_PASSWORD
    if not User.query.filter_by(email=admin_email).first():
        u = User(
            srn=None, name="Default Admin", email=admin_email,
            password_hash=hash_password(admin_password), role="admin", status="APPROVED"
        )
        db.session.add(u); db.session.commit(); print("Created default admin:", admin_email)
    if Degree.query.count() == 0:
        for d in ["BCA", "BE", "MCA", "MBA"]:
            db.session.add(Degree(name=d))
        db.session.commit()
    if Section.query.count() == 0:
        for s in ["A", "B", "C"]:
            db.session.add(Section(name=s))
        db.session.commit()
        
    # NEW: Initial Hostel/Room for testing (Optional but helpful)
    if Hostel.query.count() == 0:
        h1 = Hostel(name="Boys Hostel A", address="South Campus")
        h2 = Hostel(name="Girls Hostel B", address="North Campus")
        db.session.add_all([h1, h2])
        db.session.flush()
        if h1.id:
            db.session.add(Room(hostel_id=h1.id, room_number="A101", capacity=2))
            db.session.add(Room(hostel_id=h1.id, room_number="A102", capacity=3))
        if h2.id:
            db.session.add(Room(hostel_id=h2.id, room_number="B201", capacity=2))
        db.session.commit()
        print("Created default hostels and rooms.")

    # Create Messages table if it doesn't exist (handled by create_all normally, but just to be sure if adding to existing DB)
    # db.create_all() handles it

    os.makedirs(RECEIPT_TMP_DIR, exist_ok=True)


# -------------------- PARENT COMMUNICATION ROUTES --------------------

@app.route("/parent/professors", methods=["GET"])
@roles_allowed(["parent", "student"]) # Allow both to see their professors
def parent_get_professors():
    identity = get_jwt_identity()
    user = User.query.get(identity)
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    # Find allocations for the student's current class
    allocations = FacultyAllocation.query.filter_by(
        degree=user.degree,
        semester=user.semester,
        section=user.section
    ).all()

    professors = []
    seen_ids = set()
    
    for alloc in allocations:
        prof = User.query.get(alloc.faculty_id)
        if prof and prof.id not in seen_ids:
            professors.append({
                "id": prof.id,
                "name": prof.name,
                "email": prof.email,
                "subject": alloc.subject, # Primary subject for context
                "allocations": [a.subject for a in allocations if a.faculty_id == prof.id] # All subjects taught by this prof to this class
            })
            seen_ids.add(prof.id)

    return jsonify({"success": True, "professors": professors})


@app.route("/parent/contact-professor", methods=["POST"])
@roles_allowed(["parent"]) 
def parent_contact_professor():
    identity = get_jwt_identity()
    student = User.query.get(identity) # Parent token identity is the Student ID
    if not student:
        return jsonify({"success": False, "message": "Student record not found"}), 404

    data = request.json or {}
    prof_id = data.get("professor_id")
    subject_line = data.get("subject", "Parent Inquiry")
    message_body = data.get("message", "")
    
    if not prof_id or not message_body:
        return jsonify({"success": False, "message": "Professor and message are required"}), 400

    prof = User.query.get(prof_id)
    if not prof:
         return jsonify({"success": False, "message": "Professor not found"}), 404

    # Construct the Email
    # We use the Parent Email from the student record if available, else fallback
    reply_to = student.parent_email or f"parent_of_{student.srn}@noteorbit.com" 
    
    email_subject = f"[NoteOrbit] Parent Query: {student.name} ({student.srn})"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #3b82f6; padding: 20px; color: white;">
            <h2 style="margin: 0;">Parent Communication</h2>
            <p style="margin: 5px 0 0; opacity: 0.9;">From the desk of {student.name}'s Guardian</p>
        </div>
        <div style="padding: 30px;">
            <p><strong>To:</strong> Prof. {prof.name}</p>
            <p><strong>Regarding Student:</strong> {student.name} ({student.srn})</p>
            <p><strong>Class:</strong> {student.degree} - Sem {student.semester} (Sec {student.section})</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            
            <h3 style="color: #3b82f6; margin-top: 0;">{subject_line}</h3>
            <p style="background-color: #f9fafb; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">
                "{message_body}"
            </p>
            
            <p style="margin-top: 30px; font-size: 13px; color: #666;">
                You can reply directly to this email to contact the parent at <a href="mailto:{reply_to}">{reply_to}</a>.
            </p>
        </div>
         <div style="background-color: #f4f4f9; padding: 15px; text-align: center; font-size: 12px; color: #999;">
            NoteOrbit Academic Portal
        </div>
    </div>
    """

    # We can't strictly set "Reply-To" in our simple helper without modification, 
    # but we can try injecting it into headers if we modify send_email later. 
    # For now, we rely on the body containing the contact info.
    # Actually, let's just assume the Prof sees the "From" address as the System and replies to the text in body.
    
    # --- SAVE TO DB (In-App Messaging) ---
    try:
        new_msg = Message(
            sender="parent",
            student_id=student.id,
            faculty_id=prof.id,
            subject=subject_line,
            body=message_body
        )
        db.session.add(new_msg)
        db.session.commit()
    except Exception as e:
        print(f"Error saving message to DB: {e}")
    
    # Send Email Notification
    send_email(prof.email, email_subject, html_content)
    
    return jsonify({"success": True, "message": f"Message sent to Prof. {prof.name}"})


@app.route("/faculty/conversations", methods=["GET"])
@roles_allowed(["professor"])
def get_faculty_conversations():
    """Returns list of students the faculty has chatted with, ordered by most recent activity."""
    identity = get_jwt_identity()
    prof_id = int(identity)
    
    # Get all messages for this faculty
    msgs = Message.query.filter_by(faculty_id=prof_id).order_by(Message.created_at.desc()).all()
    
    # Group by student
    students_map = {}
    for m in msgs:
        if m.student_id not in students_map:
            s_obj = User.query.get(m.student_id)
            if not s_obj: continue
            
            # Count unread from parent
            unread_count = 0
            
            students_map[m.student_id] = {
                "student_id": s_obj.id,
                "student_name": s_obj.name,
                "student_srn": s_obj.srn,
                "last_message": m.body[:50] + "..." if len(m.body)>50 else m.body,
                "last_timestamp": m.created_at.isoformat(),
                "unread_count": 0
            }
        
        # Increment unread if message is from parent and not read
        if m.sender == 'parent' and not m.is_read:
            students_map[m.student_id]["unread_count"] += 1

    return jsonify({"success": True, "conversations": list(students_map.values())})


@app.route("/faculty/messages/<int:student_id>", methods=["GET"])
@roles_allowed(["professor"])
def get_conversation_thread(student_id):
    """Gets full chat history with a specific student/parent."""
    identity = get_jwt_identity()
    prof_id = int(identity)

    msgs = Message.query.filter_by(faculty_id=prof_id, student_id=student_id).order_by(Message.created_at.asc()).all()
    
    # Mark all parent messages as read
    for m in msgs:
        if m.sender == 'parent' and not m.is_read:
            m.is_read = True
    db.session.commit()
    
    out = []
    for m in msgs:
        out.append({
            "id": m.id,
            "sender": m.sender, # 'parent' or 'faculty'
            "body": m.body,
            "subject": m.subject,
            "timestamp": m.created_at.isoformat()
        })
        
    return jsonify({"success": True, "messages": out})


@app.route("/faculty/messages/reply", methods=["POST"])
@roles_allowed(["professor"])
def reply_to_parent():
    identity = get_jwt_identity()
    prof = User.query.get(identity)
    
    data = request.json or {}
    student_id = data.get("student_id") # Use Student ID context
    reply_body = data.get("reply_body")
    
    if not student_id or not reply_body:
        return jsonify({"success": False, "message": "Student ID and reply body required"}), 400
        
    student = User.query.get(student_id)
    if not student or not student.parent_email:
        return jsonify({"success": False, "message": "Parent email not found"}), 404
        
    # 1. Save to DB
    try:
        new_msg = Message(
            sender="faculty",
            student_id=student.id,
            faculty_id=prof.id,
            subject=f"Reply: Parent Query ({student.name})",
            body=reply_body,
            is_read=True # Faculty read their own message
        )
        db.session.add(new_msg)
        db.session.commit()
    except Exception as e:
        print("DB Save Error:", e)

    # 2. Send Email
    subject = f"Re: Query regarding {student.name} - [Prof. {prof.name}]"
    html_content = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px;">
        <p><strong>From:</strong> Prof. {prof.name}</p>
        <hr/>
        <p>{reply_body}</p>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
           Reply strictly via email or check the portal.
        </p>
    </div>
    """
    send_email(student.parent_email, subject, html_content)
    return jsonify({"success": True, "message": "Reply sent"})


@app.route("/parent/conversations", methods=["GET"])
@roles_allowed(["parent", "student"]) 
def get_parent_conversations():
    """Returns list of professors the student/parent has chatted with."""
    identity = get_jwt_identity()
    student = User.query.get(identity)
    
    # Get all messages where this student is involved
    msgs = Message.query.filter_by(student_id=student.id).order_by(Message.created_at.desc()).all()
    
    faculty_map = {}
    for m in msgs:
        if m.faculty_id not in faculty_map:
            prof = User.query.get(m.faculty_id)
            if not prof: continue
            
            # Count unread from faculty
            unread_count = 0
            
            faculty_map[m.faculty_id] = {
                "faculty_id": prof.id,
                "faculty_name": prof.name,
                "last_message": m.body[:50] + "..." if len(m.body)>50 else m.body,
                "last_timestamp": m.created_at.isoformat(),
                "unread_count": 0
            }
        
        if m.sender == 'faculty' and not m.is_read:
            faculty_map[m.faculty_id]["unread_count"] += 1

    return jsonify({"success": True, "conversations": list(faculty_map.values())})


@app.route("/parent/messages/<int:faculty_id>", methods=["GET"])
@roles_allowed(["parent", "student"])
def get_parent_thread(faculty_id):
    """Gets full chat history with a specific professor."""
    identity = get_jwt_identity()
    student_id = int(identity)

    msgs = Message.query.filter_by(student_id=student_id, faculty_id=faculty_id).order_by(Message.created_at.asc()).all()
    
    # Mark all faculty messages as read
    for m in msgs:
        if m.sender == 'faculty' and not m.is_read:
            m.is_read = True
    db.session.commit()
    
    out = []
    for m in msgs:
        out.append({
            "id": m.id,
            "sender": m.sender, # 'parent' or 'faculty'
            "body": m.body,
            "subject": m.subject,
            "timestamp": m.created_at.isoformat()
        })
        
    return jsonify({"success": True, "messages": out})


@app.route("/parent/messages/reply", methods=["POST"])
@roles_allowed(["parent"]) # Only parent can reply, student read-only? Let's allow parent.
def parent_reply():
    identity = get_jwt_identity()
    student = User.query.get(identity)
    
    data = request.json or {}
    faculty_id = data.get("faculty_id")
    reply_body = data.get("reply_body")
    
    if not faculty_id or not reply_body:
        return jsonify({"success": False, "message": "Faculty ID and reply body required"}), 400
        
    prof = User.query.get(faculty_id)
    if not prof:
        return jsonify({"success": False, "message": "Professor not found"}), 404

    # 1. Save to DB
    try:
        new_msg = Message(
            sender="parent",
            student_id=student.id,
            faculty_id=prof.id,
            subject=f"Reply from Parent of {student.name}",
            body=reply_body,
            is_read=False
        )
        db.session.add(new_msg)
        db.session.commit()
    except Exception as e:
        print("DB Save Error:", e)

    # 2. Send Email to Faculty
    subject = f"New Message from Parent of {student.name}"
    html_content = f"""
    <div style="padding: 20px;">
        <p><strong>Parent Reply:</strong></p>
        <p>{reply_body}</p>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">Login to portal to reply.</p>
    </div>
    """
    send_email(prof.email, subject, html_content)
    
    return jsonify({"success": True, "message": "Reply sent"})


# -------------------- START --------------------

if __name__ == "__main__":
    with app.app_context():
        init_db()
        print("Using GROQ_API_KEY:", (GROQ_API_KEY[:8] + "********") if GROQ_API_KEY else "NOT SET")
        print("JWT_SECRET_KEY loaded:", True if JWT_SECRET_KEY else False)
    app.run(debug=True, host='0.0.0.0', port=FLASK_RUN_PORT)