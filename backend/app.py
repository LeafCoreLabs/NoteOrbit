import os
import hashlib
import requests
from datetime import datetime, timedelta
from urllib.parse import urljoin
from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS 
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
)
from werkzeug.utils import secure_filename
import json
import time

# --- HARDCODED CONFIGURATION START ---
JWT_SECRET_KEY = "noteorbit-secret-key-hardcoded"
GEMINI_API_KEY = "REPLACE_ME_WITH_YOUR_ACTUAL_GEMINI_API_KEY"
PASSWORD_SALT = "noteorbit_salt_v1"
DEFAULT_ADMIN_EMAIL = "admin@noteorbit.edu"
DEFAULT_ADMIN_PASSWORD = "admin123"
# --- HARDCODED CONFIGURATION END ---

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)

# --- CORS Configuration ---
CORS(
    app, 
    resources={r"*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}},
    allow_headers=["Authorization", "Content-Type"],
    supports_credentials=True,
    methods=["GET", "POST", "OPTIONS"]
)

DB_PATH = os.path.join(BASE_DIR, "noteorbit.db")
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

app.config["JWT_SECRET_KEY"] = JWT_SECRET_KEY
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50 MB

db = SQLAlchemy(app)
jwt = JWTManager(app)

SALT = PASSWORD_SALT

def hash_password(password: str, salt: str = SALT) -> str:
    return hashlib.sha256((password + salt).encode()).hexdigest()

def allowed_file(filename: str):
    ALLOWED = {"pdf", "doc", "docx", "ppt", "pptx", "txt"}
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED

# --- Database Models ---
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
    role = db.Column(db.String(20), default="student")  # student / professor / admin
    degree = db.Column(db.String(50), nullable=True)
    semester = db.Column(db.Integer, nullable=True)
    section = db.Column(db.String(10), nullable=True)
    status = db.Column(db.String(20), default="PENDING")  # PENDING / APPROVED / REJECTED
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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

# Initialize DB and seed default admin + catalogs
def init_db():
    db.create_all()
    admin_email = DEFAULT_ADMIN_EMAIL
    admin_password = DEFAULT_ADMIN_PASSWORD
    if not User.query.filter_by(email=admin_email).first():
        u = User(
            srn=None,
            name="Default Admin",
            email=admin_email,
            password_hash=hash_password(admin_password),
            role="admin",
            status="APPROVED"
        )
        db.session.add(u)
        db.session.commit()
        print("Created default admin:", admin_email)
    if Degree.query.count() == 0:
        for d in ["BCA", "BE", "MCA", "MBA"]:
            db.session.add(Degree(name=d))
        db.session.commit()
    if Section.query.count() == 0:
        for s in ["A", "B", "C"]:
            db.session.add(Section(name=s))
        db.session.commit()

# RBAC helpers
def roles_allowed(roles):
    def decorator(fn):
        from functools import wraps
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            identity = get_jwt_identity()
            user = User.query.get(identity)
            if not user or user.role not in roles:
                return jsonify({"success": False, "message": "Insufficient permissions"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator 

# --- Auth Routes ---
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

    access_token = create_access_token(identity=str(user.id), additional_claims={"role": user.role}, expires_delta=timedelta(days=7))
    return jsonify({
        "success": True,
        "token": access_token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "degree": user.degree,
            "semester": user.semester,
            "section": user.section,
            "status": user.status
        }
    })

# --- Admin Routes ---
def admin_only(fn):
    from functools import wraps
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get("role") != "admin":
            return jsonify({"success": False, "message": "Admin access required"}), 403
        return fn(*args, **kwargs)
    return wrapper

@app.route("/admin/pending-students", methods=["GET"])
@admin_only
def pending_students():
    students = User.query.filter_by(role="student", status="PENDING").all()
    out = []
    for s in students:
        out.append({
            "id": s.id,
            "srn": s.srn,
            "name": s.name,
            "email": s.email,
            "degree": s.degree,
            "semester": s.semester,
            "section": s.section,
            "created_at": s.created_at.isoformat()
        })
    return jsonify({"success": True, "pending": out})

@app.route("/admin/approve-student", methods=["POST"])
@admin_only
def approve_student():
    data = request.json or {}
    student_id = data.get("student_id")
    action = data.get("action", "approve")
    s = User.query.filter_by(id=student_id, role="student").first()
    if not s:
        return jsonify({"success": False, "message": "Student not found"}), 404
    s.status = "APPROVED" if action == "approve" else "REJECTED"
    db.session.commit()
    return jsonify({"success": True, "message": f"Student {action}d"})

# Admin: catalog CRUD (minimal)
@app.route("/admin/degrees", methods=["GET", "POST"])
def manage_degrees():
    if request.method == "POST":
        try:
            get_jwt() 
        except:
             return jsonify({"success": False, "message": "Authentication required to modify degrees"}), 401

        user = User.query.get(get_jwt_identity())
        if user.role != "admin":
             return jsonify({"success": False, "message": "Admin access required to modify degrees"}), 403
             
        name = (request.json or {}).get("name")
        if not name or Degree.query.filter_by(name=name).first():
            return jsonify({"success": False, "message": "Invalid or duplicate degree"}), 400
        db.session.add(Degree(name=name))
        db.session.commit()
        
    data = [d.name for d in Degree.query.order_by(Degree.name).all()]
    return jsonify({"success": True, "degrees": data})

@app.route("/admin/sections", methods=["GET", "POST"])
def manage_sections():
    if request.method == "POST":
        try:
            get_jwt() 
        except:
             return jsonify({"success": False, "message": "Authentication required to modify sections"}), 401

        user = User.query.get(get_jwt_identity())
        if user.role != "admin":
             return jsonify({"success": False, "message": "Admin access required to modify sections"}), 403

        name = (request.json or {}).get("name")
        if not name or Section.query.filter_by(name=name).first():
            return jsonify({"success": False, "message": "Invalid or duplicate section"}), 400
        db.session.add(Section(name=name))
        db.session.commit()
        
    data = [s.name for s in Section.query.order_by(Section.name).all()]
    return jsonify({"success": True, "sections": data})

@app.route("/admin/subjects", methods=["GET", "POST"])
@roles_allowed(["admin", "professor", "student"]) 
def manage_subjects():
    if request.method == "POST":
        admin_claims = get_jwt()
        if admin_claims.get("role") not in ["admin", "professor"]:
             return jsonify({"success": False, "message": "Admin/Professor access required to modify subjects"}), 403
        
        payload = request.json or {}
        degree = payload.get("degree")
        semester = payload.get("semester")
        name = payload.get("name")
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
        db.session.add(Subject(degree=degree, semester=sem, name=name))
        db.session.commit()
    # Filters (GET request)
    degree = request.args.get("degree")
    semester = request.args.get("semester")
    q = Subject.query
    if degree:
        q = q.filter_by(degree=degree)
    if semester:
        try:
            q = q.filter_by(semester=int(semester))
        except:
            pass 
    items = [{"degree": s.degree, "semester": s.semester, "name": s.name} for s in q.order_by(Subject.name).all()]
    return jsonify({"success": True, "subjects": items})

# --- Resource Routes ---
@app.route("/upload-note", methods=["POST"])
@roles_allowed(["professor", "admin"])
def upload_note():
    title = request.form.get("title")
    degree = request.form.get("degree")
    semester = request.form.get("semester")
    subject = request.form.get("subject")
    document_type = request.form.get("document_type")
    file = request.files.get("file")

    if not (title and degree and semester and subject and document_type and file):
        return jsonify({"success": False, "message": "Missing fields"}), 400
    if not Degree.query.filter_by(name=degree).first():
        return jsonify({"success": False, "message": "Invalid degree"}), 400
    try:
        semester_int = int(semester)
        if semester_int < 1 or semester_int > 8:
            raise ValueError()
    except ValueError:
        return jsonify({"success": False, "message": "Semester must be 1-8"}), 400
    if not Subject.query.filter_by(degree=degree, semester=semester_int, name=subject).first():
        return jsonify({"success": False, "message": "Invalid subject for degree/semester"}), 400
    if not allowed_file(file.filename):
        return jsonify({"success": False, "message": "File type not allowed"}), 400

    filename = secure_filename(f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{file.filename}")
    dest = os.path.join(UPLOAD_FOLDER, filename)
    file.save(dest)

    identity = get_jwt_identity()
    uploader = User.query.get(identity)
    note = Note(
        title=title,
        degree=degree,
        semester=semester_int,
        subject=subject,
        document_type=document_type,
        file_path=filename,
        uploaded_by=uploader.id
    )
    db.session.add(note)
    db.session.commit()
    return jsonify({"success": True, "message": "Note uploaded"})

@app.route("/notes", methods=["GET"])
@jwt_required()
def get_notes():
    user = User.query.get(get_jwt_identity())
    degree = request.args.get("degree") or user.degree
    semester = request.args.get("semester") or user.semester
    subject = request.args.get("subject")

    if not degree or not semester:
        return jsonify({"success": False, "message": "degree and semester are required"}), 400

    try:
        sem = int(semester)
    except:
        return jsonify({"success": False, "message": "Invalid semester"}), 400

    q = Note.query.filter_by(degree=degree, semester=sem)
    if subject:
        q = q.filter_by(subject=subject)
    notes = q.order_by(Note.timestamp.desc()).all()

    base = request.host_url.rstrip("/")
    out = []
    for n in notes:
        out.append({
            "id": n.id,
            "title": n.title,
            "degree": n.degree,
            "semester": n.semester,
            "subject": n.subject,
            "document_type": n.document_type,
            "file_url": urljoin(base + "/", f"download/{n.file_path}"),
            "uploaded_by": n.uploaded_by,
            "timestamp": n.timestamp.isoformat()
        })
    return jsonify({"success": True, "notes": out})

@app.route("/download/<path:filename>", methods=["GET"])
def download_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename, as_attachment=True)

# Notices
@app.route("/create-notice", methods=["POST"])
@roles_allowed(["professor", "admin"])
def create_notice():
    data = request.form or {}
    title = data.get("title")
    message = data.get("message")
    degree = data.get("degree")
    semester = data.get("semester")
    section = data.get("section") 
    subject = data.get("subject")
    deadline_raw = data.get("deadline")
    file = request.files.get("attachment")

    if not (title and message and degree and semester and section and subject):
        return jsonify({"success": False, "message": "Missing fields"}), 400
    if not Degree.query.filter_by(name=degree).first():
        return jsonify({"success": False, "message": "Invalid degree"}), 400
    try:
        semester_int = int(semester)
        if semester_int < 1 or semester_int > 8:
            raise ValueError()
    except ValueError:
        return jsonify({"success": False, "message": "Semester must be 1-8"}), 400
    if not Subject.query.filter_by(degree=degree, semester=semester_int, name=subject).first():
        return jsonify({"success": False, "message": "Invalid subject for degree/semester"}), 400
    sections = [s.strip().upper() for s in section.split(",") if s.strip()]
    known = {s.name.upper() for s in Section.query.all()}
    if not sections or any(sec not in known for sec in sections):
        return jsonify({"success": False, "message": "Invalid section(s)"}), 400

    attachment_filename = None
    if file:
        if not allowed_file(file.filename):
            return jsonify({"success": False, "message": "Attachment type not allowed"}), 400
        attachment_filename = secure_filename(f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{file.filename}")
        file.save(os.path.join(UPLOAD_FOLDER, attachment_filename))

    deadline = None
    if deadline_raw:
        try:
            deadline = datetime.strptime(deadline_raw, "%Y-%m-%d")
        except:
            return jsonify({"success": False, "message": "Invalid deadline format (YYYY-MM-DD)"}), 400

    identity = get_jwt_identity()
    prof = User.query.get(identity)
    notice = Notice(
        title=title,
        message=message,
        degree=degree,
        semester=semester_int,
        section=",".join(sections),
        subject=subject,
        deadline=deadline,
        attachment=attachment_filename,
        professor_id=prof.id,
        professor_name=prof.name
    )
    db.session.add(notice)
    db.session.commit()
    return jsonify({"success": True, "message": "Notice created"})

@app.route("/notices", methods=["GET"])
@jwt_required()
def get_notices():
    identity = get_jwt_identity()
    user = User.query.get(identity)

    q = Notice.query
    subject = request.args.get("subject")

    if user.role == "student":
        q = q.filter_by(degree=user.degree, semester=user.semester)
        items = q.order_by(Notice.created_at.desc()).all()
        filtered = []
        for n in items:
            sections = [s.strip().upper() for s in n.section.split(",")]
            if user.section and user.section.upper() in sections and n.subject == subject:
                 filtered.append(n)
        results = filtered
    else:
        # Professors/Admins can filter
        degree = request.args.get("degree")
        semester = request.args.get("semester")
        section = request.args.get("section")
        if degree: q = q.filter_by(degree=degree)
        if semester:
            try: q = q.filter_by(semester=int(semester))
            except: return jsonify({"success": False, "message": "Invalid semester parameter."}), 400
        if section: q = q.filter(Notice.section.like(f"%{section}%"))
        if subject: q = q.filter_by(subject=subject)
        results = q.order_by(Notice.created_at.desc()).all()

    base = request.host_url.rstrip("/")
    out = []
    for n in results:
        out.append({
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "degree": n.degree,
            "semester": n.semester,
            "section": n.section,
            "subject": n.subject,
            "deadline": n.deadline.isoformat() if n.deadline else None,
            "attachment_url": urljoin(base + "/", f"download/{n.attachment}") if n.attachment else None,
            "professor_id": n.professor_id,
            "professor_name": n.professor_name,
            "created_at": n.created_at.isoformat()
        })
    return jsonify({"success": True, "notices": out})

# --- AI Chat Route ---
def call_gemini_api(prompt: str):
    if not GEMINI_API_KEY or GEMINI_API_KEY == "REPLACE_ME_WITH_YOUR_ACTUAL_GEMINI_API_KEY":
        return None, "GEMINI_API_KEY is not configured."
        
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
                return None, "API returned an empty response."
        except requests.exceptions.HTTPError as e:
            if response.status_code in [429, 500, 503] and attempt < MAX_RETRIES - 1:
                time.sleep(2 ** attempt)
                continue
            return None, f"HTTP Error: {e}"
        except requests.exceptions.RequestException as e:
            return None, f"Request failed: {e}"
        except Exception as e:
            return None, f"An unexpected error occurred: {e}"
    return None, f"Failed to connect to API after {MAX_RETRIES} attempts."


@app.route("/chat", methods=["POST"])
@jwt_required()
def chat():
    data = request.json or {}
    q = data.get("question", "")
    if not q:
        return jsonify({"success": False, "message": "Question required"}), 400
    answer, error_msg = call_gemini_api(q)
    if answer:
        return jsonify({"success": True, "answer": answer})
    else:
        return jsonify({"success": False, "message": error_msg or "Failed to get response from AI model."}), 500

@app.route("/me", methods=["GET"])
@jwt_required()
def me():
    identity = get_jwt_identity()
    user = User.query.get(identity)
    return jsonify({
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "degree": user.degree,
        "semester": user.semester,
        "section": user.section,
        "status": user.status
    })

if __name__ == "__main__":
    with app.app_context():
        init_db()
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get("FLASK_RUN_PORT", 5000)))