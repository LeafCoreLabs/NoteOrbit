from sqlalchemy.orm import Session

from shared.config import settings
from shared.models import Degree, Hostel, Room, Section, User
from shared.security import legacy_hash_password


def seed_database(db: Session) -> None:
    admin = db.query(User).filter(User.email == settings.default_admin_email).first()
    if not admin:
        db.add(
            User(
                srn=None,
                name="Default Admin",
                email=settings.default_admin_email,
                password_hash=legacy_hash_password(settings.default_admin_password),
                role="admin",
                status="APPROVED",
            )
        )
        db.commit()
        print(f"Created default admin: {settings.default_admin_email}")
    else:
        admin.password_hash = legacy_hash_password(settings.default_admin_password)
        admin.role = "admin"
        admin.status = "APPROVED"
        db.commit()
        print(f"Updated default admin: {settings.default_admin_email}")

    if db.query(Degree).count() == 0:
        for d in ["BCA", "BE", "MCA", "MBA"]:
            db.add(Degree(name=d))
        db.commit()

    if db.query(Section).count() == 0:
        for deg in ["BE"]:
            for sem in [1, 2, 3, 4, 5, 6, 7, 8]:
                for sec in ["A", "B", "C"]:
                    db.add(Section(degree=deg, semester=sem, name=sec))
        db.commit()

    if db.query(Hostel).count() == 0:
        h1 = Hostel(name="Boys Hostel A", address="South Campus")
        h2 = Hostel(name="Girls Hostel B", address="North Campus")
        db.add_all([h1, h2])
        db.flush()
        if h1.id:
            db.add(Room(hostel_id=h1.id, room_number="A101", capacity=2))
            db.add(Room(hostel_id=h1.id, room_number="A102", capacity=3))
        if h2.id:
            db.add(Room(hostel_id=h2.id, room_number="B201", capacity=2))
        db.commit()
