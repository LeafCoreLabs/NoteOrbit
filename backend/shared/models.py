"""SQLAlchemy models ported from legacy Flask app (HRD/placement models excluded)."""
from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base


class Hostel(Base):
    __tablename__ = "hostel"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    address: Mapped[str | None] = mapped_column(String(255))
    vacant_beds: Mapped[int] = mapped_column(Integer, default=0)


class Room(Base):
    __tablename__ = "room"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    hostel_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("hostel.id", ondelete="CASCADE"))
    room_number: Mapped[str] = mapped_column(String(20), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, default=1)
    current_occupancy: Mapped[int] = mapped_column(Integer, default=0)

    __table_args__ = (UniqueConstraint("hostel_id", "room_number", name="uq_room_hostel"),)


class HostelAllocation(Base):
    __tablename__ = "hostel_allocation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("user.id", ondelete="CASCADE"), unique=True)
    hostel_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("hostel.id"))
    room_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("room.id"))
    allocated_on: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class AIChatSession(Base):
    __tablename__ = "ai_chat_session"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), default="New Chat")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    messages: Mapped[list["AIChatMessage"]] = relationship(back_populates="session", cascade="all, delete-orphan")


class AIChatMessage(Base):
    __tablename__ = "ai_chat_message"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("ai_chat_session.id", ondelete="CASCADE"))
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    attachment: Mapped[str | None] = mapped_column(String(255))
    session: Mapped["AIChatSession"] = relationship(back_populates="messages")


class Degree(Base):
    __tablename__ = "degree"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)


class Section(Base):
    __tablename__ = "section"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    degree: Mapped[str] = mapped_column(String(50), nullable=False)
    semester: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(20), nullable=False)

    __table_args__ = (UniqueConstraint("degree", "semester", "name", name="uq_section_deg_sem_name"),)


class Subject(Base):
    __tablename__ = "subject"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    degree: Mapped[str] = mapped_column(String(50), nullable=False)
    semester: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)

    __table_args__ = (UniqueConstraint("degree", "semester", "name", name="uq_subject_degree_sem_name"),)


class User(Base):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    srn: Mapped[str | None] = mapped_column(String(100), unique=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="student")
    degree: Mapped[str | None] = mapped_column(String(50))
    semester: Mapped[int | None] = mapped_column(Integer)
    section: Mapped[str | None] = mapped_column(String(10))
    status: Mapped[str] = mapped_column(String(20), default="PENDING")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    emp_id: Mapped[str | None] = mapped_column(String(100), unique=True)
    parent_email: Mapped[str | None] = mapped_column(String(200))
    parent_password_hash: Mapped[str | None] = mapped_column(String(256))

    __table_args__ = (
        Index("idx_user_email_role", "email", "role"),
        Index("idx_user_role_status", "role", "status"),
        Index("idx_user_degree_sem_sec", "degree", "semester", "section"),
        Index("idx_user_parent_email", "parent_email"),
    )


class Note(Base):
    __tablename__ = "note"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str | None] = mapped_column(String(300))
    degree: Mapped[str | None] = mapped_column(String(50))
    semester: Mapped[int | None] = mapped_column(Integer)
    section: Mapped[str | None] = mapped_column(String(50))
    subject: Mapped[str | None] = mapped_column(String(200))
    document_type: Mapped[str | None] = mapped_column(String(100))
    file_path: Mapped[str | None] = mapped_column(String(500))
    uploaded_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("user.id"))
    timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("idx_note_degree_sem_sec", "degree", "semester", "section"),
        Index("idx_note_subject", "subject"),
        Index("idx_note_uploaded_by", "uploaded_by"),
    )


class Notice(Base):
    __tablename__ = "notice"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str | None] = mapped_column(String(300))
    message: Mapped[str | None] = mapped_column(Text)
    degree: Mapped[str | None] = mapped_column(String(50))
    semester: Mapped[int | None] = mapped_column(Integer)
    section: Mapped[str | None] = mapped_column(String(50))
    subject: Mapped[str | None] = mapped_column(String(200))
    deadline: Mapped[datetime | None] = mapped_column(DateTime)
    attachment: Mapped[str | None] = mapped_column(String(500))
    professor_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("user.id"))
    professor_name: Mapped[str | None] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("idx_notice_degree_sem", "degree", "semester"),
        Index("idx_notice_created_at", "created_at"),
    )


class Book(Base):
    __tablename__ = "books"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    author: Mapped[str | None] = mapped_column(String(200))
    isbn: Mapped[str | None] = mapped_column(String(100))
    degree: Mapped[str | None] = mapped_column(String(50))
    semester: Mapped[int | None] = mapped_column(Integer)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    uploaded_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("user.id"))
    timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class HostelComplaint(Base):
    __tablename__ = "hostel_complaints"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("user.id"))
    hostel_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("hostel.id"))
    room_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("room.id"))
    title: Mapped[str | None] = mapped_column(String(300))
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="Open")
    attachment: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    audit_trail: Mapped[str] = mapped_column(Text, default="[]")


class FeeNotification(Base):
    __tablename__ = "fee_notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str | None] = mapped_column(String(300))
    description: Mapped[str | None] = mapped_column(Text)
    amount_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="misc")
    issued_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("user.id"))
    due_date: Mapped[datetime | None] = mapped_column(DateTime)
    target: Mapped[str] = mapped_column(String(50), default="batch")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class FeeTarget(Base):
    __tablename__ = "fee_targets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    notification_id: Mapped[str] = mapped_column(String(36), ForeignKey("fee_notifications.id", ondelete="CASCADE"))
    student_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("user.id"))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    paid_at: Mapped[datetime | None] = mapped_column(DateTime)
    order_id: Mapped[str | None] = mapped_column(String(64))

    __table_args__ = (
        Index("idx_fee_targets_student_status", "student_id", "status"),
    )


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[int] = mapped_column(Integer, nullable=False)
    amount_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="INR")
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="created")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id: Mapped[str] = mapped_column(String(36), ForeignKey("orders.id", ondelete="CASCADE"))
    amount_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    payment_method: Mapped[str | None] = mapped_column(String(64))
    transaction_id: Mapped[str | None] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    extra_metadata: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Receipt(Base):
    __tablename__ = "receipts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    payment_id: Mapped[str] = mapped_column(String(36), ForeignKey("payments.id", ondelete="CASCADE"))
    storage_key: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Mark(Base):
    __tablename__ = "marks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("user.id"))
    subject: Mapped[str | None] = mapped_column(String(200))
    exam_type: Mapped[str | None] = mapped_column(String(50))
    marks_obtained: Mapped[float | None] = mapped_column()
    max_marks: Mapped[float | None] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    uploaded_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("user.id"))

    __table_args__ = (
        Index("idx_marks_student_subject", "student_id", "subject"),
    )


class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("user.id"))
    subject: Mapped[str | None] = mapped_column(String(200))
    faculty_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("user.id"))
    text: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class FacultyAllocation(Base):
    __tablename__ = "faculty_allocations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    faculty_id: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"), nullable=False)
    degree: Mapped[str] = mapped_column(String(50), nullable=False)
    semester: Mapped[int] = mapped_column(Integer, nullable=False)
    section: Mapped[str] = mapped_column(String(50), nullable=False)
    subject: Mapped[str] = mapped_column(String(200), nullable=False)

    __table_args__ = (
        UniqueConstraint("faculty_id", "degree", "semester", "section", "subject", name="_faculty_class_uc"),
    )


class Attendance(Base):
    __tablename__ = "attendance"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"), nullable=False)
    faculty_id: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"), nullable=False)
    degree: Mapped[str] = mapped_column(String(50), nullable=False)
    semester: Mapped[int] = mapped_column(Integer, nullable=False)
    section: Mapped[str] = mapped_column(String(50), nullable=False)
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("student_id", "subject", "date", name="_student_subject_date_uc"),
        Index("idx_attendance_student_date", "student_id", "date"),
        Index("idx_attendance_degree_sem_sec", "degree", "semester", "section"),
    )


class StudentRoutine(Base):
    __tablename__ = "student_routine"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"), nullable=False)
    day_of_week: Mapped[str] = mapped_column(String(10), nullable=False)
    subjects: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (UniqueConstraint("user_id", "day_of_week", name="uq_std_routine_day"),)


class StudentAttendanceLog(Base):
    __tablename__ = "student_attendance_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    subject: Mapped[str | None] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "date", "subject", name="uq_std_log_date_sub"),
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sender: Mapped[str] = mapped_column(String(20), nullable=False)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"), nullable=False)
    faculty_id: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"), nullable=False)
    subject: Mapped[str | None] = mapped_column(String(200))
    body: Mapped[str | None] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("idx_msg_student_faculty", "student_id", "faculty_id"),
        Index("idx_msg_created_at", "created_at"),
    )


class FileObject(Base):
    """Generic uploaded file metadata (storage-api)."""
    __tablename__ = "file_objects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"), index=True)
    bucket_name: Mapped[str] = mapped_column(String(128), nullable=False)
    object_key: Mapped[str] = mapped_column(String(512), unique=True, index=True)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(120), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
