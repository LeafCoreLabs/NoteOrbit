import time

from sqlalchemy.exc import OperationalError

from shared.database import SessionLocal, init_db
from shared.seed import seed_database

MAX_ATTEMPTS = 30
RETRY_SECONDS = 2


def main() -> None:
    last_error: Exception | None = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            init_db()
            db = SessionLocal()
            try:
                seed_database(db)
            finally:
                db.close()
            print("Database bootstrap complete.")
            return
        except OperationalError as exc:
            last_error = exc
            print(f"DB not ready (attempt {attempt}/{MAX_ATTEMPTS}): {exc}")
            time.sleep(RETRY_SECONDS)
    raise RuntimeError("Database bootstrap failed") from last_error


if __name__ == "__main__":
    main()
