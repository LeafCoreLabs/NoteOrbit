-- NoteOrbit database schema (SQLite / generic SQL)
-- Use to show DB design in report or to create same structure in PostgreSQL with minor changes.

CREATE TABLE user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    srn TEXT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'student',
    degree TEXT,
    semester INTEGER,
    section TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subject (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    degree TEXT,
    semester INTEGER,
    name TEXT
);

CREATE TABLE note (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    degree TEXT,
    semester INTEGER,
    subject TEXT,
    document_type TEXT,
    file_path TEXT,
    uploaded_by INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notice (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    message TEXT,
    degree TEXT,
    semester INTEGER,
    section TEXT,
    subject TEXT,
    deadline DATETIME,
    attachment TEXT,
    professor_id INTEGER,
    professor_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
