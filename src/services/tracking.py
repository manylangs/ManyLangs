import sqlite3
import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH  = BASE_DIR / "manylangs_crm.db"


def get_connection():
    return sqlite3.connect(DB_PATH)


def create_tracking_table():
    conn   = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS email_tracking (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            tracking_id  TEXT UNIQUE,
            school_id    INTEGER,
            email        TEXT,
            campaign_id  TEXT,
            open_count   INTEGER DEFAULT 0,
            click_count  INTEGER DEFAULT 0,
            opened_at    TIMESTAMP,
            clicked_at   TIMESTAMP,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()
    print("[OK] email_tracking table ready")


def create_tracking(
    school_id:   int,
    email:       str,
    campaign_id: Optional[str] = None,
) -> str:
    tracking_id = uuid.uuid4().hex

    if not campaign_id:
        campaign_id = f"CAMP_{datetime.now().strftime('%Y%m%d')}"

    conn   = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT OR IGNORE INTO email_tracking
        (tracking_id, school_id, email, campaign_id)
        VALUES (?, ?, ?, ?)
        """,
        (tracking_id, school_id, email.lower().strip(), campaign_id)
    )

    conn.commit()
    conn.close()

    return tracking_id


def track_open(tracking_id: str) -> bool:
    conn   = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, open_count FROM email_tracking WHERE tracking_id = ?",
        (tracking_id,)
    )
    row = cursor.fetchone()

    if not row:
        conn.close()
        return False

    now = datetime.now().isoformat()

    cursor.execute(
        """
        UPDATE email_tracking
        SET
            open_count = open_count + 1,
            opened_at  = CASE WHEN opened_at IS NULL THEN ? ELSE opened_at END
        WHERE tracking_id = ?
        """,
        (now, tracking_id)
    )

    conn.commit()
    conn.close()
    return True


def track_click(tracking_id: str) -> Optional[str]:
    conn   = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id FROM email_tracking WHERE tracking_id = ?",
        (tracking_id,)
    )
    row = cursor.fetchone()

    if not row:
        conn.close()
        return None

    now = datetime.now().isoformat()

    cursor.execute(
        """
        UPDATE email_tracking
        SET
            click_count = click_count + 1,
            clicked_at  = CASE WHEN clicked_at IS NULL THEN ? ELSE clicked_at END
        WHERE tracking_id = ?
        """,
        (now, tracking_id)
    )

    conn.commit()
    conn.close()

    return "https://manylangs.studio/demo"


def get_tracking_stats(campaign_id: Optional[str] = None) -> dict:
    conn   = get_connection()
    cursor = conn.cursor()

    if campaign_id:
        cursor.execute(
            """
            SELECT
                COUNT(*) AS total_sent,
                SUM(CASE WHEN open_count  > 0 THEN 1 ELSE 0 END) AS total_opened,
                SUM(CASE WHEN click_count > 0 THEN 1 ELSE 0 END) AS total_clicked,
                SUM(open_count)  AS total_opens,
                SUM(click_count) AS total_clicks
            FROM email_tracking
            WHERE campaign_id = ?
            """,
            (campaign_id,)
        )
    else:
        cursor.execute(
            """
            SELECT
                COUNT(*) AS total_sent,
                SUM(CASE WHEN open_count  > 0 THEN 1 ELSE 0 END) AS total_opened,
                SUM(CASE WHEN click_count > 0 THEN 1 ELSE 0 END) AS total_clicked,
                SUM(open_count)  AS total_opens,
                SUM(click_count) AS total_clicks
            FROM email_tracking
            """
        )

    row = cursor.fetchone()
    conn.close()

    total_sent    = row[0] or 0
    total_opened  = row[1] or 0
    total_clicked = row[2] or 0

    return {
        "total_sent":    total_sent,
        "total_opened":  total_opened,
        "total_clicked": total_clicked,
        "total_opens":   row[3] or 0,
        "total_clicks":  row[4] or 0,
        "open_rate":     round(total_opened  / total_sent * 100, 1) if total_sent else 0,
        "click_rate":    round(total_clicked / total_sent * 100, 1) if total_sent else 0,
    }


def get_tracking_by_id(tracking_id: str) -> Optional[dict]:
    conn   = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT
            tracking_id, school_id, email, campaign_id,
            open_count, click_count, opened_at, clicked_at, created_at
        FROM email_tracking
        WHERE tracking_id = ?
        """,
        (tracking_id,)
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    return {
        "tracking_id": row[0],
        "school_id":   row[1],
        "email":       row[2],
        "campaign_id": row[3],
        "open_count":  row[4],
        "click_count": row[5],
        "opened_at":   row[6],
        "clicked_at":  row[7],
        "created_at":  row[8],
    }


if __name__ == "__main__":
    create_tracking_table()

    tid = create_tracking(school_id=1, email="test@school.com", campaign_id="TEST_001")
    print(f"[CREATED] tracking_id={tid}")

    track_open(tid)
    track_open(tid)
    track_click(tid)

    info = get_tracking_by_id(tid)
    print(f"[INFO]    open={info['open_count']} click={info['click_count']}")

    stats = get_tracking_stats()
    print(f"[STATS]   sent={stats['total_sent']} open_rate={stats['open_rate']}% click_rate={stats['click_rate']}%")
