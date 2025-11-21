import os
import hashlib
import requests # Used for OpenLibrary API calls
from datetime import datetime, timedelta
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
# Optional PDF tool
try:
    import pdfkit
except ImportError:
    pdfkit = None
    print("Warning: pdfkit not installed. Using ReportLab/TXT fallback for receipts.")
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from sqlalchemy import func, or_
from dotenv import load_dotenv

# Load .env
load_dotenv()

# -------------------- CONFIG (from .env) --------------------
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev_secret_jwt_key_please_set")
SECRET_KEY = os.getenv("SECRET_KEY") or JWT_SECRET_KEY
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
PASSWORD_SALT = os.getenv("PASSWORD_SALT", "noteorbit_salt_v1")
DEFAULT_ADMIN_EMAIL = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@noteorbit.edu")
DEFAULT_ADMIN_PASSWORD = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123")
FLASK_RUN_PORT = int(os.getenv("FLASK_RUN_PORT", 5000))

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
    total_rooms = db.Column(db.Integer, default=0)

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


class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(300))
    degree = db.Column(db.String(50))
    semester = db.Column(db.Integer)
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

@app.route("/register", methods=["POST"])
def register():
    data = request.json or {}
    required = ["srn", "name", "email", "password", "degree", "semester", "section"]
    for r in required:
        if r not in data:
            return jsonify({"success": False, "message": f"Missing field {r}"}), 400

    if User.query.filter((User.email == data["email"]) | (User.srn == data["srn"])).first():
        return jsonify({"success": False, "message": "Email or SRN already registered."}), 400

    if not Degree.query.filter_by(name=data["degree"]).first():
        return jsonify({"success": False, "message": "Invalid degree"}), 400
    try:
        semester_int = int(data["semester"])
        if semester_int < 1 or semester_int > 8:
            raise ValueError()
    except ValueError:
        return jsonify({"success": False, "message": "Semester must be 1-8"}), 400
    if not Section.query.filter_by(name=data["section"]).first():
        return jsonify({"success": False, "message": "Invalid section"}), 400

    user = User(
        srn=data["srn"],
        name=data["name"],
        email=data["email"],
        password_hash=hash_password(data["password"]),
        role="student",
        degree=data["degree"],
        semester=semester_int,
        section=data["section"],
        status="PENDING"
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({"success": True, "message": "Registered successfully. Await admin approval."})


@app.route("/login", methods=["POST"])
def login():
    data = request.json or {}
    email = data.get("email")
    password = data.get("password")
    if not email or not password:
        return jsonify({"success": False, "message": "email & password required"}), 400

    user = User.query.filter_by(email=email).first()
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
            "hostel_info": hostel_info # Added hostel information
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
    semester = request.form.get("semester"); subject = request.form.get("subject")
    document_type = request.form.get("document_type"); file = request.files.get("file")
    if not (title and degree and semester and subject and document_type and file):
        return jsonify({"success": False, "message": "Missing fields"}), 400
    if not allowed_file(file.filename):
        return jsonify({"success": False, "message": "File type not allowed"}), 400

    ext = file.filename.rsplit(".", 1)[1].lower()
    filename = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex}.{ext}"
    key = f"notes/{filename}"
    upload_to_minio(file, key, file.mimetype)

    identity = get_jwt_identity(); uploader = User.query.get(identity)
    note = Note(
        title=title, degree=degree, semester=int(semester), subject=subject,
        document_type=document_type, file_path=key, uploaded_by=uploader.id
    )
    db.session.add(note); db.session.commit()
    return jsonify({"success": True, "message": "Note uploaded"})


@app.route("/notes", methods=["GET"])
@jwt_required()
def get_notes():
    user = User.query.get(get_jwt_identity())
    degree = request.args.get("degree") or user.degree; semester = request.args.get("semester") or user.semester
    subject = request.args.get("subject")
    if not degree or not semester:
        return jsonify({"success": False, "message": "degree and semester are required"}), 400
    try:
        sem = int(semester)
    except:
        return jsonify({"success": False, "message": "Invalid semester"}), 400
    q = Note.query.filter_by(degree=degree, semester=sem)
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
            "id": n.id, "title": n.title, "degree": n.degree, "semester": n.semester,
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
@roles_allowed(["student"])
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
    elif target == "custom":
        srns = payload.get("srns", []) or []
        for srn in srns:
            user = User.query.filter_by(srn=srn).first()
            if user:
                ft = FeeTarget(notification_id=notif.id, student_id=user.id)
                db.session.add(ft); created_targets += 1
    elif target == "single":
        srn = payload.get("single_srn")
        user = User.query.filter_by(srn=srn).first()
        if user:
            ft = FeeTarget(notification_id=notif.id, student_id=user.id)
            db.session.add(ft); created_targets += 1
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
             return jsonify({"success": False, "message": "Invalid mark values (marks must be $\\ge 0$ and $\\le max\_marks$, max\_marks $> 0$)."}), 400
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
    
    return jsonify({"success": True, "message": f"Marks uploaded for {user.name}."})


# Removed the legacy /faculty/marks/upload-csv route as requested

@app.route("/student/marks", methods=["GET"])
@roles_allowed(["student"])
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
    db.session.add(fb); db.session.commit(); return jsonify({"success": True, "message": "Feedback saved"})


@app.route("/student/feedback", methods=["GET"])
@roles_allowed(["student"])
def student_get_feedback():
    uid = int(get_jwt_identity()); rows = Feedback.query.filter_by(student_id=uid).order_by(Feedback.created_at.desc()).all()
    out = [{"subject": r.subject, "text": r.text, "faculty_id": r.faculty_id, "created_at": r.created_at.isoformat() if r.created_at else None} for r in rows]
    return jsonify({"success": True, "feedback": out})


# -------------------- AI CHAT (Gemini) --------------------

def call_gemini_api(prompt: str):
    # Check if the key is loaded and present
    if not GEMINI_API_KEY:
        return None, "GEMINI_API_KEY environment variable is missing or empty."
        
    API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    MAX_RETRIES = 3
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "systemInstruction": {
            "parts": [{"text": "You are a helpful academic assistant for students and professors. Provide concise and relevant answers."}]
        }
    }
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.post(API_URL, headers={'Content-Type': 'application/json'}, data=json.dumps(payload))
            response.raise_for_status()
            result = response.json()
            text = result.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text')
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
    data = request.json or {}; q = data.get("question") or data.get("q") or ""
    if not q:
        return jsonify({"success": False, "message": "Question required"}), 400
    answer, error_msg = call_gemini_api(q)
    if answer:
        return jsonify({"success": True, "answer": answer})
    else:
        return jsonify({"success": False, "message": error_msg or "Failed to get response from AI model."}), 500


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

    os.makedirs(RECEIPT_TMP_DIR, exist_ok=True)


# -------------------- START --------------------

if __name__ == "__main__":
    with app.app_context():
        init_db()
        print("Using GEMINI_API_KEY:", (GEMINI_API_KEY[:8] + "********") if GEMINI_API_KEY else "NOT SET")
        print("JWT_SECRET_KEY loaded:", True if JWT_SECRET_KEY else False)
    app.run(debug=True, host='0.0.0.0', port=FLASK_RUN_PORT)