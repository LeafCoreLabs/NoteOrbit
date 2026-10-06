from __future__ import annotations

import os
import json
import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from shared.config import settings
from shared.database import get_db
from shared.email_utils import send_professional_email
from shared.helpers import cents_to_rupees_str, ensure_receipt_pdf, upload_receipt
from shared.models import (
    FeeNotification,
    FeeTarget,
    Hostel,
    HostelAllocation,
    HostelComplaint,
    Order,
    Payment,
    Receipt,
    Room,
    User,
)
from shared.security import get_current_user, get_token_payload, require_admin
from shared.storage import allowed_file, presigned_get, upload_to_minio

router = APIRouter(tags=["campus"])


class HostelBody(BaseModel):
    name: str | None = None
    address: str | None = None


class RoomBody(BaseModel):
    hostel_id: int | None = None
    room_number: str | None = None
    capacity: int = 1


class AssignRoomBody(BaseModel):
    srn: str | None = None
    room_id: int | None = None


class ComplaintStatusBody(BaseModel):
    status: str | None = None
    note: str = ""


class ResolveComplaintBody(BaseModel):
    complaint_id: str | None = None


class FeeCreateBody(BaseModel):
    title: str | None = None
    amount_cents: int = 0
    description: str | None = None
    category: str = "misc"
    due_date: str | None = None
    target: str = "batch"
    degree: str | None = None
    semester: int | str | None = None
    sections: str = ""
    srns: list[str] | None = None
    single_srn: str | None = None


class FeePayBody(BaseModel):
    target_id: str | None = None


VALID_COMPLAINT_STATUSES = ["Open", "Under Review", "Under Progress", "Resolved", "Closed"]


def _fail(message: str, status: int = 400) -> JSONResponse:
    return JSONResponse({"success": False, "message": message}, status_code=status)


def _hostel_stats(db: Session, h: Hostel) -> dict:
    total_rooms = db.query(Room).filter_by(hostel_id=h.id).count()
    occupied_rooms = db.query(Room).filter(Room.hostel_id == h.id, Room.current_occupancy > 0).count()
    total_capacity = db.query(func.sum(Room.capacity)).filter(Room.hostel_id == h.id).scalar() or 0
    current_occupancy = (
        db.query(func.sum(Room.current_occupancy)).filter(Room.hostel_id == h.id).scalar() or 0
    )
    return {
        "id": h.id,
        "name": h.name,
        "address": h.address,
        "total_rooms": total_rooms,
        "occupied_rooms": occupied_rooms,
        "total_capacity": total_capacity,
        "current_occupancy": current_occupancy,
        "vacant_beds": total_capacity - current_occupancy,
    }


@router.get("/admin/hostel/hostels")
def list_hostels(
    _: Annotated[str, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    hostels = db.query(Hostel).all()
    return {"success": True, "hostels": [_hostel_stats(db, h) for h in hostels]}


@router.post("/admin/hostel/hostels")
def create_hostel(
    body: HostelBody,
    _: Annotated[str, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    if not body.name:
        return _fail("Hostel name required", 400)
    if db.query(Hostel).filter_by(name=body.name).first():
        return _fail("Hostel already exists", 400)
    hostel = Hostel(name=body.name, address=body.address)
    db.add(hostel)
    db.commit()
    return {"success": True, "message": f"Hostel '{body.name}' added.", "id": hostel.id}


@router.get("/admin/hostel/rooms")
def list_rooms(
    _: Annotated[str, Depends(require_admin)],
    db: Session = Depends(get_db),
    hostel_id: str | None = None,
):
    q = db.query(Room)
    if hostel_id:
        q = q.filter_by(hostel_id=int(hostel_id))
    rooms = q.order_by(Room.hostel_id, Room.room_number).all()
    out = []
    for r in rooms:
        hostel = db.query(Hostel).get(r.hostel_id)
        out.append(
            {
                "id": r.id,
                "hostel_id": r.hostel_id,
                "hostel_name": hostel.name if hostel else "N/A",
                "room_number": r.room_number,
                "capacity": r.capacity,
                "occupancy": r.current_occupancy,
                "is_vacant": r.current_occupancy < r.capacity,
            }
        )
    return {"success": True, "rooms": out}


@router.post("/admin/hostel/rooms")
def create_room(
    body: RoomBody,
    _: Annotated[str, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    capacity = int(body.capacity or 1)
    if not (body.hostel_id and body.room_number) or capacity < 1:
        return _fail("Missing fields or invalid capacity", 400)
    if not db.query(Hostel).get(body.hostel_id):
        return _fail("Hostel not found", 404)
    if db.query(Room).filter_by(hostel_id=body.hostel_id, room_number=body.room_number).first():
        return _fail("Room already exists in this hostel", 400)

    room = Room(hostel_id=body.hostel_id, room_number=body.room_number, capacity=capacity, current_occupancy=0)
    db.add(room)
    db.commit()
    hostel = db.query(Hostel).get(body.hostel_id)
    return {
        "success": True,
        "message": f"Room {body.room_number} added to {hostel.name if hostel else 'hostel'}.",
        "id": room.id,
    }


@router.post("/admin/hostel/assign-room")
def assign_room_to_student(
    body: AssignRoomBody,
    _: Annotated[str, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    if not (body.srn and body.room_id):
        return _fail("Missing SRN or room_id", 400)

    student = db.query(User).filter_by(srn=body.srn).first()
    if not student or student.role != "student":
        return _fail("Student not found or user is not a student", 404)

    room = db.query(Room).get(body.room_id)
    if not room:
        return _fail("Room not found", 404)
    if room.current_occupancy >= room.capacity:
        return _fail("Room is fully occupied", 400)

    existing = db.query(HostelAllocation).filter_by(student_id=student.id).first()
    if existing:
        old_room = db.query(Room).get(existing.room_id)
        if old_room:
            old_room.current_occupancy = max(0, old_room.current_occupancy - 1)
        db.delete(existing)

    db.add(
        HostelAllocation(student_id=student.id, hostel_id=room.hostel_id, room_id=body.room_id)
    )
    room.current_occupancy += 1
    db.commit()
    return {
        "success": True,
        "message": f"Room {room.room_number} assigned to {student.name} (SRN: {body.srn}).",
    }


@router.post("/hostel/complaints")
def submit_hostel_complaint(
    title: str = Form(...),
    description: str = Form(...),
    attachment: UploadFile | None = File(None),
    payload: Annotated[dict, Depends(get_token_payload)] = None,
    db: Session = Depends(get_db),
):
    if payload.get("role") not in ["student"]:
        return _fail("Insufficient permissions", 403)

    student_id = int(payload.get("sub"))
    allocation = db.query(HostelAllocation).filter_by(student_id=student_id).first()
    if not allocation:
        return _fail(
            "Complaint submission not allowed. No hostel is currently allotted to your account.",
            403,
        )

    attachment_key = None
    if attachment and attachment.filename:
        if not allowed_file(attachment.filename):
            return _fail("Attachment file type not allowed.", 400)
        ext = attachment.filename.rsplit(".", 1)[1].lower()
        fname = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex}.{ext}"
        attachment_key = f"hostel-complaints/{fname}"
        upload_to_minio(attachment.file, attachment_key, attachment.content_type or "application/octet-stream")

    initial_trail = json.dumps(
        [{"status": "Open", "timestamp": datetime.utcnow().isoformat(), "note": "Complaint submitted.", "by": "Student"}]
    )
    complaint = HostelComplaint(
        student_id=student_id,
        hostel_id=allocation.hostel_id,
        room_id=allocation.room_id,
        title=title,
        description=description,
        attachment=attachment_key,
        status="Open",
        audit_trail=initial_trail,
    )
    db.add(complaint)
    db.commit()
    return {"success": True, "message": "Complaint submitted successfully. Status: Open"}


@router.get("/student/hostel/complaints")
def student_view_hostel_complaints(
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    if payload.get("role") not in ["student", "parent"]:
        return _fail("Insufficient permissions", 403)

    student_id = int(payload.get("sub"))
    rows = (
        db.query(HostelComplaint, Hostel, Room)
        .filter(HostelComplaint.student_id == student_id)
        .outerjoin(Hostel, HostelComplaint.hostel_id == Hostel.id)
        .outerjoin(Room, HostelComplaint.room_id == Room.id)
        .order_by(HostelComplaint.created_at.desc())
        .all()
    )

    out = []
    for c, hostel, room in rows:
        try:
            audit_log = json.loads(c.audit_trail)
        except Exception:
            audit_log = [
                {
                    "status": c.status,
                    "timestamp": c.created_at.isoformat() if c.created_at else "N/A",
                    "note": "Initial status",
                }
            ]
        out.append(
            {
                "id": c.id,
                "title": c.title,
                "description": c.description,
                "status": c.status,
                "hostel_name": hostel.name if hostel else "N/A",
                "room_number": room.room_number if room else "N/A",
                "file_url": presigned_get(c.attachment) if c.attachment else None,
                "audit_trail": audit_log,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
        )
    return {"success": True, "complaints": out}


@router.get("/admin/hostel/complaints")
def view_hostel_complaints(
    _: Annotated[str, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    rows = (
        db.query(HostelComplaint, User, Hostel, Room)
        .join(User, HostelComplaint.student_id == User.id)
        .outerjoin(Hostel, HostelComplaint.hostel_id == Hostel.id)
        .outerjoin(Room, HostelComplaint.room_id == Room.id)
        .order_by(HostelComplaint.created_at.desc())
        .all()
    )
    out = []
    for c, student, hostel, room in rows:
        try:
            audit_log = json.loads(c.audit_trail)
        except Exception:
            audit_log = [
                {
                    "status": c.status,
                    "timestamp": c.created_at.isoformat() if c.created_at else "N/A",
                    "note": "Initial status",
                }
            ]
        out.append(
            {
                "id": c.id,
                "title": c.title,
                "description": c.description,
                "status": c.status,
                "student_id": student.id,
                "student_name": student.name if student else "Unknown",
                "hostel_name": hostel.name if hostel else "N/A",
                "room_number": room.room_number if room else "N/A",
                "file_url": presigned_get(c.attachment) if c.attachment else None,
                "audit_trail": audit_log,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
        )
    return {"success": True, "complaints": out}


def _update_complaint_status(
    complaint_id: str,
    new_status: str,
    note: str,
    admin_user: User | None,
    db: Session,
) -> JSONResponse | dict:
    if new_status not in VALID_COMPLAINT_STATUSES:
        return _fail("Invalid status value", 400)

    complaint = db.query(HostelComplaint).get(complaint_id)
    if not complaint:
        return _fail("Complaint not found", 404)

    complaint.status = new_status
    trail = json.loads(complaint.audit_trail)
    trail.append(
        {
            "status": new_status,
            "timestamp": datetime.utcnow().isoformat(),
            "by": admin_user.name if admin_user else "Admin",
            "note": note,
        }
    )
    complaint.audit_trail = json.dumps(trail)
    db.commit()

    s = db.query(User).get(complaint.student_id)
    if s:
        details = {
            "Complaint ID": f"#{complaint.id[:8]}",
            "Title": complaint.title,
            "New Status": new_status,
            "Admin Note": note,
        }
        send_professional_email(
            s.email,
            f"Complaint Update: {new_status}",
            "Hostel Complaint Updated",
            details,
            f"The status of your hostel complaint '<strong>{complaint.title}</strong>' has been updated.",
        )

    return {"success": True, "message": f"Complaint status updated to {new_status}.", "new_status": new_status}


@router.patch("/admin/hostel/complaints/{complaint_id}/status")
def update_hostel_complaint_status(
    complaint_id: str,
    body: ComplaintStatusBody,
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    if payload.get("role") != "admin":
        return _fail("Admin access required", 403)
    admin_user = db.query(User).get(int(payload.get("sub")))
    return _update_complaint_status(complaint_id, body.status or "", body.note, admin_user, db)


@router.post("/admin/hostel/resolve")
def resolve_hostel_complaint(
    body: ResolveComplaintBody,
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    if payload.get("role") != "admin":
        return _fail("Admin access required", 403)
    if not body.complaint_id:
        return _fail("Missing complaint_id", 400)
    admin_user = db.query(User).get(int(payload.get("sub")))
    return _update_complaint_status(
        body.complaint_id,
        "Resolved",
        "Complaint resolved by Admin using shortcut.",
        admin_user,
        db,
    )


@router.post("/admin/fees/create")
def admin_create_fee_notification(
    body: FeeCreateBody,
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    if payload.get("role") != "admin":
        return _fail("Admin access required", 403)

    amount_cents = int(body.amount_cents or 0)
    if not body.title or amount_cents <= 0:
        return _fail("title and positive amount_cents required", 400)

    notif = FeeNotification(
        title=body.title,
        description=body.description,
        amount_cents=amount_cents,
        category=body.category,
        issued_by=int(payload.get("sub")),
        due_date=(datetime.strptime(body.due_date, "%Y-%m-%d") if body.due_date else None),
        target=body.target,
    )
    db.add(notif)
    db.flush()

    created_targets = 0
    target = notif.target

    def notify_student(user: User, title: str, amount: int, due: str | None):
        details = {"Title": title, "Amount": f"INR {amount / 100}", "Due Date": str(due)}
        send_professional_email(user.email, f"Fee Demand: {title}", "New Fee Notification", details, "A new fee payment is due.")
        if user.parent_email:
            send_professional_email(
                user.parent_email,
                f"Fee Demand: {user.name}",
                f"Fee Notification for {user.name}",
                details,
                "A new fee payment is requested for your ward.",
            )

    if target in ("batch", "sem"):
        q = db.query(User).filter_by(role="student")
        if body.degree:
            q = q.filter_by(degree=body.degree)
        if body.semester:
            q = q.filter_by(semester=int(body.semester))
        if body.sections:
            secs = [s.strip().upper() for s in body.sections.split(",") if s.strip()]
            students = q.filter(User.section.in_(secs)).all()
        else:
            students = q.all()
        for s in students:
            db.add(FeeTarget(notification_id=notif.id, student_id=s.id))
            created_targets += 1
            notify_student(s, body.title, amount_cents, body.due_date)
    elif target == "custom":
        for srn in body.srns or []:
            user = db.query(User).filter_by(srn=srn).first()
            if user:
                db.add(FeeTarget(notification_id=notif.id, student_id=user.id))
                created_targets += 1
                notify_student(user, body.title, amount_cents, body.due_date)
    elif target == "single":
        user = db.query(User).filter_by(srn=body.single_srn).first()
        if user:
            db.add(FeeTarget(notification_id=notif.id, student_id=user.id))
            created_targets += 1
            notify_student(user, body.title, amount_cents, body.due_date)

    db.commit()
    return {"success": True, "notification_id": notif.id, "targets_created": created_targets}


@router.get("/fees/list")
def student_fees_list(
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    uid = int(payload.get("sub"))
    results = (
        db.query(FeeTarget, FeeNotification)
        .join(FeeNotification, FeeTarget.notification_id == FeeNotification.id)
        .filter(FeeTarget.student_id == uid)
        .order_by(FeeNotification.created_at.desc())
        .all()
    )
    items = []
    for ft, notif in results:
        items.append(
            {
                "target_id": ft.id,
                "notification_id": notif.id,
                "title": notif.title,
                "description": notif.description,
                "amount_cents": notif.amount_cents,
                "amount": cents_to_rupees_str(notif.amount_cents),
                "category": notif.category,
                "due_date": notif.due_date.isoformat() if notif.due_date else None,
                "status": ft.status,
                "paid_at": ft.paid_at.isoformat() if ft.paid_at else None,
                "payment_id": ft.order_id or None,
            }
        )
    return {"success": True, "fees": items}


@router.post("/fees/pay")
def create_demo_order(
    body: FeePayBody,
    payload: Annotated[dict, Depends(get_token_payload)],
    db: Session = Depends(get_db),
):
    ft = db.query(FeeTarget).filter_by(id=body.target_id).first()
    if not ft:
        return _fail("Target not found", 404)
    notif = db.query(FeeNotification).get(ft.notification_id)
    if not notif:
        return _fail("Notification not found", 404)
    if ft.status == "paid":
        return _fail("Fee already paid", 400)

    order = Order(
        student_id=int(payload.get("sub")),
        amount_cents=notif.amount_cents,
        description=notif.title,
    )
    db.add(order)
    db.commit()
    ft.order_id = order.id
    db.commit()
    return {"success": True, "order_id": order.id, "amount_cents": order.amount_cents}


@router.get("/demo/checkout/{order_id}", response_class=HTMLResponse)
@router.post("/demo/checkout/{order_id}", response_class=HTMLResponse)
async def demo_checkout(order_id: str, request: Request, db: Session = Depends(get_db)):
    order = db.query(Order).get(order_id)
    if not order:
        return HTMLResponse("Order not found", status_code=404)

    if request.method == "GET":
        return HTMLResponse(
            f"""
        <html><body style="font-family: system-ui, Arial; padding: 24px;">
        <h2>Demo Checkout — NoteOrbit</h2><p>Order: {order.id} — Amount: ₹{cents_to_rupees_str(order.amount_cents)}</p>
        <form method="POST"><label>Card number (fake): <input name="card" /></label><br/><br/>
        <label>Name on card: <input name="name" /></label><br/><br/><button type="submit">Pay (Demo)</button></form>
        </body></html>
        """
        )

    form = await request.form()
    payment = Payment(
        order_id=order.id,
        amount_cents=order.amount_cents,
        payment_method="card-demo",
        transaction_id=f"DEMO-{uuid.uuid4()}",
        status="success",
        extra_metadata={"card": form.get("card")},
    )
    db.add(payment)
    order.status = "paid"
    db.commit()

    ft = db.query(FeeTarget).filter_by(order_id=order.id).first()
    if ft:
        ft.status = "paid"
        ft.paid_at = datetime.utcnow()
        ft.order_id = payment.id
        db.commit()

    student = db.query(User).get(order.student_id)
    student_name = student.name if student else "Student"
    student_srn = student.srn if student else "SRN-NA"
    receipt_id = str(uuid.uuid4())
    html = f"""
    <html><body><h2>NoteOrbit — Payment Receipt (Demo)</h2><p><strong>Receipt ID:</strong> {receipt_id}</p>
    <p><strong>Student:</strong> {student_name} ({student_srn})</p><p><strong>Order ID:</strong> {order.id}</p>
    <p><strong>Payment ID:</strong> {payment.id}</p>
    <p><strong>Amount:</strong> ₹{cents_to_rupees_str(order.amount_cents)}</p><p><strong>Txn ID:</strong> {payment.transaction_id}</p>
    <p><small>Demo receipt generated by NoteOrbit. No real money exchanged.</small></p></body></html>
    """
    local_pdf = ensure_receipt_pdf(html, f"receipt_{payment.id}")
    storage_key, public_url = upload_receipt(
        local_pdf, dest_key=settings.receipt_prefix + os.path.basename(local_pdf)
    )
    db.add(Receipt(payment_id=payment.id, storage_key=storage_key))
    db.commit()
    return HTMLResponse(
        f"""
    <html><body><h2>Payment Success (Demo)</h2><p>Transaction id: {payment.transaction_id}</p>
    <p><a href="{public_url}" target="_blank">Download Receipt (valid 1 hour)</a></p></body></html>
    """
    )


@router.get("/fees/receipt/{payment_id}")
def get_receipt_for_payment(
    payment_id: str,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pay = db.query(Payment).get(payment_id)
    if not pay:
        return _fail("Payment not found", 404)
    rec = db.query(Receipt).filter_by(payment_id=payment_id).first()
    if not rec:
        return _fail("Receipt not found", 404)
    url = presigned_get(rec.storage_key)
    return {"success": True, "receipt_url": url}
