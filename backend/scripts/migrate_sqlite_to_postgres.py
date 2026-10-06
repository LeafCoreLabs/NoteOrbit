"""
One-time migration: legacy SQLite (backend/noteorbit.db) -> PostgreSQL.
Preserves password_hash verbatim for legacy SHA256+salt login.
"""
from __future__ import annotations

import os
import shutil
import sqlite3
import sys

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEGACY_DB = os.path.join(ROOT, "..", "backend.legacy", "noteorbit.db")
BACKUP_DB = os.path.join(ROOT, "..", "backend.legacy", "noteorbit.db.bak")

sys.path.insert(0, ROOT)

from shared.config import settings  # noqa: E402
from shared.database import Base, init_db  # noqa: E402
from shared import models  # noqa: E402


TABLES_ORDER = [
    "hostel",
    "degree",
    "section",
    "subject",
    "user",
    "room",
    "hostel_allocation",
    "note",
    "notice",
    "books",
    "hostel_complaints",
    "fee_notifications",
    "fee_targets",
    "orders",
    "payments",
    "receipts",
    "marks",
    "feedback",
    "faculty_allocations",
    "attendance",
    "student_routine",
    "student_attendance_log",
    "messages",
    "ai_chat_session",
    "ai_chat_message",
    "file_objects",
]

SKIP_TABLES = {
    "hrd_users",
    "companies",
    "placement_drives",
    "student_placement_profiles",
    "drive_applications",
    "interview_rounds",
    "interview_results",
    "placement_offers",
    "hrd_announcements",
    "ai_analysis_cache",
    "placement_activity_logs",
    "hrd_subjects",
    "trainer_allocations",
    "hrd_marks",
    "hrd_attendance",
}


def sqlite_tables(conn: sqlite3.Connection) -> list[str]:
    cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    return [r[0] for r in cur.fetchall() if not r[0].startswith("sqlite_")]


def migrate() -> None:
    src = os.path.abspath(LEGACY_DB)
    if not os.path.exists(src):
        print(f"No SQLite DB at {src}; skipping data migration.")
        init_db()
        return

    if not os.path.exists(BACKUP_DB):
        shutil.copy2(src, BACKUP_DB)
        print(f"Backup created: {BACKUP_DB}")

    sqlite_conn = sqlite3.connect(src)
    sqlite_conn.row_factory = sqlite3.Row

    engine = create_engine(settings.database_url)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    pg = Session()

    existing = {r[0] for r in pg.execute(text("SELECT tablename FROM pg_tables WHERE schemaname='public'")).fetchall()}

    for table in TABLES_ORDER:
        if table in SKIP_TABLES or table not in sqlite_tables(sqlite_conn):
            continue
        if table not in existing:
            print(f"Skip missing PG table: {table}")
            continue
        count = pg.execute(text(f'SELECT COUNT(1) FROM "{table}"')).scalar()
        if count and count > 0:
            print(f"Skip {table}: already has {count} rows")
            continue
        rows = sqlite_conn.execute(f'SELECT * FROM "{table}"').fetchall()
        if not rows:
            continue
        cols = rows[0].keys()
        col_list = ", ".join(f'"{c}"' for c in cols)
        placeholders = ", ".join(f":{c}" for c in cols)
        for row in rows:
            data = dict(row)
            pg.execute(
                text(f'INSERT INTO "{table}" ({col_list}) VALUES ({placeholders}) ON CONFLICT DO NOTHING'),
                data,
            )
        pg.commit()
        print(f"Migrated {len(rows)} rows -> {table}")

    users = pg.execute(text('SELECT COUNT(1) FROM "user"')).scalar()
    students = pg.execute(text("SELECT COUNT(1) FROM \"user\" WHERE role='student'")).scalar()
    print(f"Postgres users={users}, students={students}")
    pg.close()
    sqlite_conn.close()


if __name__ == "__main__":
    migrate()
