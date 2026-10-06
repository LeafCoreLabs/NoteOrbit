from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from shared.config import settings


engine = create_engine(settings.effective_database_url, pool_pre_ping=True)

# Ensure schema isolation for PostgreSQL (Neon / Supabase)
if "postgresql" in settings.effective_database_url:
    @event.listens_for(engine, "connect")
    def set_search_path(dbapi_connection, connection_record):
        try:
            cursor = dbapi_connection.cursor()
            cursor.execute("SET search_path TO noteorbit, public;")
            cursor.close()
        except Exception:
            pass

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from sqlalchemy import text
    from shared import models  # noqa: F401 - ensure metadata is imported

    if "postgresql" in settings.effective_database_url:
        try:
            with engine.connect() as conn:
                conn.execute(text("CREATE SCHEMA IF NOT EXISTS noteorbit;"))
                conn.execute(text("SET search_path TO noteorbit, public;"))
                conn.commit()
        except Exception:
            pass

    Base.metadata.create_all(bind=engine)

