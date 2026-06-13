import sqlite3
from pathlib import Path
from datetime import datetime


def generate_batch_id():
    return datetime.now().strftime("BATCH_%Y%m%d_%H%M%S")


BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "manylangs_crm.db"


def get_connection():
    return sqlite3.connect(DB_PATH)


def create_database():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS schools (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        school_name TEXT,
        website TEXT UNIQUE,
        email TEXT,
        phone TEXT,
        address TEXT,
        source TEXT DEFAULT 'unknown',
        country TEXT,
        city TEXT,
        score INTEGER DEFAULT 0,
        status TEXT DEFAULT 'NEW',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS send_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        school_id INTEGER,
        email TEXT,
        subject TEXT,
        send_status TEXT,
        ses_message_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS suppression_list (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS unsubscribe_list (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        token TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    conn.commit()
    conn.close()


def migrate_database():
    conn = get_connection()
    cursor = conn.cursor()

    existing = [
        row[1]
        for row in cursor.execute("PRAGMA table_info(schools)")
    ]

    if "source" not in existing:
        cursor.execute(
            "ALTER TABLE schools ADD COLUMN source TEXT DEFAULT 'unknown'"
        )

    if "country" not in existing:
        cursor.execute(
            "ALTER TABLE schools ADD COLUMN country TEXT"
        )

    if "city" not in existing:
        cursor.execute(
            "ALTER TABLE schools ADD COLUMN city TEXT"
        )

    if "lead_type" not in existing:
        cursor.execute(
            "ALTER TABLE schools ADD COLUMN lead_type TEXT DEFAULT 'LANGUAGE_SCHOOL'"
        )

    if "contact_page" not in existing:
        cursor.execute(
            "ALTER TABLE schools ADD COLUMN contact_page TEXT"
        )

    if "facebook" not in existing:
        cursor.execute(
            "ALTER TABLE schools ADD COLUMN facebook TEXT"
        )

    if "instagram" not in existing:
        cursor.execute(
            "ALTER TABLE schools ADD COLUMN instagram TEXT"
        )

    if "youtube" not in existing:
        cursor.execute(
            "ALTER TABLE schools ADD COLUMN youtube TEXT"
        )

    if "linkedin" not in existing:
        cursor.execute(
            "ALTER TABLE schools ADD COLUMN linkedin TEXT"
        )

    conn.commit()
    conn.close()


def insert_school(
    school_name,
    website,
    email=None,
    phone=None,
    address=None,
    source=None,
    country=None,
    city=None,
    lead_type="LANGUAGE_SCHOOL",
    discovery_batch=None
):
    if discovery_batch is None:
        discovery_batch = generate_batch_id()

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT OR IGNORE INTO schools
        (
            school_name,
            website,
            email,
            phone,
            address,
            source,
            country,
            city,
            lead_type,
            discovery_batch,
            is_merged,
            is_contacted,
            lead_score,
            lead_status,
            campaign_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            school_name,
            website,
            email,
            phone,
            address,
            source,
            country,
            city,
            lead_type,
            discovery_batch,
            0,
            0,
            0,
            "COLD",
            "NEW"
        )
    )

    conn.commit()
    conn.close()


def update_school(
    website,
    email=None,
    phone=None,
    address=None,
    source=None,
    country=None,
    city=None,
    score=None,
    status=None,
    contact_page=None,
    facebook=None,
    instagram=None,
    youtube=None,
    linkedin=None
):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        UPDATE schools
        SET
            email = COALESCE(?, email),
            phone = COALESCE(?, phone),
            address = COALESCE(?, address),
            source = COALESCE(?, source),
            country = COALESCE(?, country),
            city = COALESCE(?, city),
            score = COALESCE(?, score),
            status = COALESCE(?, status),
            contact_page = COALESCE(?, contact_page),
            facebook = COALESCE(?, facebook),
            instagram = COALESCE(?, instagram),
            youtube = COALESCE(?, youtube),
            linkedin = COALESCE(?, linkedin),
            updated_at = CURRENT_TIMESTAMP
        WHERE website = ?
        """,
        (
            email,
            phone,
            address,
            source,
            country,
            city,
            score,
            status,
            contact_page,
            facebook,
            instagram,
            youtube,
            linkedin,
            website
        )
    )

    conn.commit()
    conn.close()


def count_schools():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM schools")

    count = cursor.fetchone()[0]

    conn.close()

    return count


def find_duplicate(website):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id FROM schools WHERE website = ?",
        (website,)
    )

    result = cursor.fetchone()

    conn.close()

    return result is not None


def get_ready_to_send(limit=100):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT
            id,
            school_name,
            website,
            email,
            lead_score,
            lead_status,
            campaign_status,
            country,
            city
        FROM schools
        WHERE campaign_status = 'READY_TO_SEND'
        ORDER BY lead_score DESC
        LIMIT ?
        """,
        (limit,)
    )

    rows = cursor.fetchall()

    conn.close()

    return rows


def suppression_check(email):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id FROM suppression_list WHERE email = ?",
        (email,)
    )

    result = cursor.fetchone()

    conn.close()

    return result is not None


def mark_bounce(email):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT OR IGNORE INTO suppression_list
        (email, reason)
        VALUES (?, ?)
        """,
        (email, "BOUNCE")
    )

    conn.commit()
    conn.close()


def mark_complaint(email):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT OR IGNORE INTO suppression_list
        (email, reason)
        VALUES (?, ?)
        """,
        (email, "COMPLAINT")
    )

    conn.commit()
    conn.close()


def mark_unsubscribe(email, token="manual"):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT OR IGNORE INTO unsubscribe_list
        (email, token)
        VALUES (?, ?)
        """,
        (email, token)
    )

    conn.commit()
    conn.close()


def count_ready_to_send():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT COUNT(*) FROM schools WHERE campaign_status = 'READY_TO_SEND'"
    )

    count = cursor.fetchone()[0]

    conn.close()

    return count


def count_suppression():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM suppression_list")

    count = cursor.fetchone()[0]

    conn.close()

    return count


def count_unsubscribe():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM unsubscribe_list")

    count = cursor.fetchone()[0]

    conn.close()

    return count


def upgrade_database_v25():
    conn = get_connection()
    cursor = conn.cursor()

    columns = [row[1] for row in cursor.execute("PRAGMA table_info(schools)").fetchall()]

    upgrades = [
        ("lead_type",       "TEXT DEFAULT 'LANGUAGE_SCHOOL'"),
        ("discovery_batch", "TEXT"),
        ("is_merged",       "INTEGER DEFAULT 0"),
        ("is_contacted",    "INTEGER DEFAULT 0"),
        ("lead_score",      "INTEGER DEFAULT 0"),
        ("lead_status",     "TEXT DEFAULT 'COLD'"),
        ("campaign_status", "TEXT DEFAULT 'NEW'"),
        ("last_scored_at",  "TIMESTAMP"),
        ("last_sent_at",    "TIMESTAMP"),
    ]

    for column_name, column_def in upgrades:
        if column_name not in columns:
            cursor.execute(
                f"ALTER TABLE schools ADD COLUMN {column_name} {column_def}"
            )
            print(f"[UPGRADE] Added column: {column_name}")

    conn.commit()
    conn.close()

    print("[SUCCESS] Database upgraded to v2.5")


if __name__ == "__main__":
    create_database()
    migrate_database()
    upgrade_database_v25()
