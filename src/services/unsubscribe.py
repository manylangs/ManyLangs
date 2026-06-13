import sqlite3
import secrets
from pathlib import Path
from datetime import datetime
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "manylangs_crm.db"

UNSUBSCRIBE_BASE_URL = "https://manylangs.studio/unsubscribe"


def get_connection():
    return sqlite3.connect(DB_PATH)


def generate_token(email: str) -> str:
    conn = get_connection()
    cursor = conn.cursor()
    token = secrets.token_urlsafe(16)
    cursor.execute(
        "INSERT OR IGNORE INTO unsubscribe_list (email, token) VALUES (?, ?)",
        (email.lower().strip(), token)
    )
    conn.commit()
    conn.close()
    return f"{UNSUBSCRIBE_BASE_URL}?token={token}"


def verify_token(token: str) -> Optional[dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT email FROM unsubscribe_list WHERE token = ?",
        (token,)
    )
    row = cursor.fetchone()
    conn.close()
    if row:
        return {"email": row[0]}
    return None


def unsubscribe_lead(email: str, token: str = "manual") -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR IGNORE INTO unsubscribe_list (email, token) VALUES (?, ?)",
        (email.lower().strip(), token)
    )
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0


def add_suppression(email: str, reason: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR IGNORE INTO suppression_list (email, reason) VALUES (?, ?)",
        (email.lower().strip(), reason.upper())
    )
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0


def is_suppressed(email: str) -> bool:
    email = email.lower().strip()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM suppression_list WHERE email = ?", (email,))
    if cursor.fetchone():
        conn.close()
        return True
    cursor.execute("SELECT id FROM unsubscribe_list WHERE email = ?", (email,))
    if cursor.fetchone():
        conn.close()
        return True
    conn.close()
    return False


def count_suppression() -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM suppression_list")
    count = cursor.fetchone()[0]
    conn.close()
    return count


def count_unsubscribe() -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM unsubscribe_list")
    count = cursor.fetchone()[0]
    conn.close()
    return count


if __name__ == "__main__":
    link = generate_token("test@example.com")
    print(f"[TOKEN]       {link}")

    token = link.split("token=")[-1]
    result = verify_token(token)
    print(f"[VERIFY]      {result}")

    add_suppression("bounce@example.com", "BOUNCE")
    add_suppression("spam@example.com", "COMPLAINT")
    unsubscribe_lead("unsub@example.com")

    for email in [
        "bounce@example.com",
        "spam@example.com",
        "unsub@example.com",
        "test@example.com",
        "clean@example.com",
    ]:
        status = "BLOCKED" if is_suppressed(email) else "OK"
        print(f"[CHECK] {email:<30} -> {status}")

    print(f"\n[SUPPRESSION] {count_suppression()} records")
    print(f"[UNSUBSCRIBE] {count_unsubscribe()} records")
