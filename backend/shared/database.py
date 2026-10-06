from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from shared.config import settings


engine = create_engine(settings.effective_database_url, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


from sqlalchemy import text

INDEXES_SQL = [
    'CREATE INDEX IF NOT EXISTS idx_user_email_role ON "user" (email, role);',
    'CREATE INDEX IF NOT EXISTS idx_user_role_status ON "user" (role, status);',
    'CREATE INDEX IF NOT EXISTS idx_user_degree_sem_sec ON "user" (degree, semester, section);',
    'CREATE INDEX IF NOT EXISTS idx_user_parent_email ON "user" (parent_email);',
    'CREATE INDEX IF NOT EXISTS idx_user_srn ON "user" (srn);',
    'CREATE INDEX IF NOT EXISTS idx_note_degree_sem_sec ON "note" (degree, semester, section);',
    'CREATE INDEX IF NOT EXISTS idx_note_subject ON "note" (subject);',
    'CREATE INDEX IF NOT EXISTS idx_note_uploaded_by ON "note" (uploaded_by);',
    'CREATE INDEX IF NOT EXISTS idx_notice_degree_sem ON "notice" (degree, semester);',
    'CREATE INDEX IF NOT EXISTS idx_notice_created_at ON "notice" (created_at DESC);',
    'CREATE INDEX IF NOT EXISTS idx_fee_targets_student_status ON "fee_targets" (student_id, status);',
    'CREATE INDEX IF NOT EXISTS idx_marks_student_subject ON "marks" (student_id, subject);',
    'CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON "attendance" (student_id, date);',
    'CREATE INDEX IF NOT EXISTS idx_attendance_degree_sem_sec ON "attendance" (degree, semester, section);',
    'CREATE INDEX IF NOT EXISTS idx_msg_student_faculty ON "messages" (student_id, faculty_id);',
    'CREATE INDEX IF NOT EXISTS idx_msg_created_at ON "messages" (created_at DESC);',
    'CREATE INDEX IF NOT EXISTS idx_books_degree_sem ON "books" (degree, semester);',
    'CREATE INDEX IF NOT EXISTS idx_hostel_complaints_student ON "hostel_complaints" (student_id);',
    'CREATE INDEX IF NOT EXISTS idx_hostel_complaints_status ON "hostel_complaints" (status);',
]


def ensure_indexes(target_engine=None) -> list[str]:
    """Execute CREATE INDEX IF NOT EXISTS for all defined performance indexes."""
    eng = target_engine or engine
    applied = []
    try:
        with eng.begin() as conn:
            for stmt in INDEXES_SQL:
                try:
                    conn.execute(text(stmt))
                    # Extract index name for logging
                    words = stmt.split()
                    idx_name = words[5] if len(words) > 5 else "index"
                    applied.append(idx_name)
                except Exception as ex:
                    # Ignore table not existing yet or dialect quirks
                    pass
    except Exception as e:
        print(f"[NoteOrbit DB] Notice during index verification: {e}")
    return applied


def init_db() -> None:
    from shared import models  # noqa: F401 - ensure metadata is imported

    Base.metadata.create_all(bind=engine)
    created = ensure_indexes(engine)
    if created:
        print(f"[NoteOrbit DB] Verified {len(created)} indexes on database.")

