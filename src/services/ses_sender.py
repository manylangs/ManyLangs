import sqlite3
import boto3
from pathlib import Path
from datetime import datetime
from botocore.exceptions import ClientError

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "manylangs_crm.db"

AWS_REGION = "ap-southeast-2"
FROM_EMAIL = "noreply@manylangs.studio"
DAILY_SEND_LIMIT = 50

try:
    from src.services.unsubscribe import is_suppressed
except ImportError:
    from unsubscribe import is_suppressed


def get_connection():
    return sqlite3.connect(DB_PATH)


# ──────────────────────────────────────────
# 1. 발송 가능 리드 조회 (조건 강화)
# ──────────────────────────────────────────

def get_available_leads(limit=50):
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
            country,
            city
        FROM schools
        WHERE campaign_status = 'READY_TO_SEND'
          AND is_contacted = 0
          AND email IS NOT NULL
          AND email != ''
          AND lead_status IN ('HOT', 'WARM')
        ORDER BY lead_score DESC
        LIMIT ?
        """,
        (limit,)
    )

    rows = cursor.fetchall()
    conn.close()

    leads = []
    for row in rows:
        email = row[3]
        if is_suppressed(email):
            continue
        leads.append({
            "id":          row[0],
            "school_name": row[1],
            "website":     row[2],
            "email":       email,
            "lead_score":  row[4],
            "lead_status": row[5],
            "country":     row[6],
            "city":        row[7],
        })

    return leads


# ──────────────────────────────────────────
# 2. 단건 발송 (SES 에러 구분 출력)
# ──────────────────────────────────────────

def send_email(to_email: str, subject: str, body: str) -> dict:
    try:
        client = boto3.client("ses", region_name=AWS_REGION)

        response = client.send_email(
            Source=FROM_EMAIL,
            Destination={"ToAddresses": [to_email]},
            Message={
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {
                    "Text": {"Data": body, "Charset": "UTF-8"}
                },
            }
        )

        return {
            "success":    True,
            "message_id": response["MessageId"],
            "status":     "SENT"
        }

    except ClientError as e:
        code    = e.response["Error"]["Code"]
        message = e.response["Error"]["Message"]

        if code == "MessageRejected":
            reason = "[SES] MessageRejected: 아직 Sandbox 상태. Production 승인 후 재시도"
        elif code == "AccessDenied":
            reason = "[SES] AccessDenied: IAM 권한 부족. SES 발송 권한 확인"
        elif "credential" in message.lower() or code == "AuthFailure":
            reason = "[SES] Credential 없음: aws configure 실행 필요"
        else:
            reason = f"[SES] {code}: {message}"

        return {
            "success":    False,
            "message_id": None,
            "status":     "FAILED",
            "error":      reason
        }

    except Exception as e:
        error_str = str(e)
        if "credential" in error_str.lower():
            reason = "[SES] Credential 없음: aws configure 실행 필요"
        else:
            reason = f"[ERROR] {error_str}"

        return {
            "success":    False,
            "message_id": None,
            "status":     "FAILED",
            "error":      reason
        }


# ──────────────────────────────────────────
# 3. 발송 결과 DB 반영 (last_sent_at + RETRY)
# ──────────────────────────────────────────

def update_send_status(
    lead_id: int,
    email: str,
    subject: str,
    status: str,
    ses_message_id: str = None
):
    conn = get_connection()
    cursor = conn.cursor()

    if status == "SENT":
        cursor.execute(
            """
            UPDATE schools
            SET
                is_contacted    = 1,
                campaign_status = 'SENT',
                last_sent_at    = CURRENT_TIMESTAMP,
                updated_at      = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (lead_id,)
        )
    else:
        cursor.execute(
            """
            UPDATE schools
            SET
                campaign_status = 'RETRY',
                updated_at      = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (lead_id,)
        )

    cursor.execute(
        """
        INSERT INTO send_history
        (school_id, email, subject, send_status, ses_message_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            lead_id,
            email,
            subject,
            status,
            ses_message_id,
            datetime.now().isoformat()
        )
    )

    conn.commit()
    conn.close()


# ──────────────────────────────────────────
# 4. RETRY 리드 재시도용 리셋
# ──────────────────────────────────────────

def reset_retry():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        UPDATE schools
        SET campaign_status = 'READY_TO_SEND'
        WHERE campaign_status = 'RETRY'
        """
    )

    affected = cursor.rowcount
    conn.commit()
    conn.close()

    print(f"[RETRY] {affected} leads reset to READY_TO_SEND")
    return affected


# ──────────────────────────────────────────
# 5. 배치 발송
# ──────────────────────────────────────────

def send_batch(limit=DAILY_SEND_LIMIT) -> dict:
    leads = get_available_leads(limit)

    print(f"[AVAILABLE] {len(leads)} leads")

    attempted = 0
    sent      = 0
    failed    = 0

    subject = "ManyLangs Partnership Opportunity"
    body = """\
Hello,

We are reaching out from ManyLangs, a multilingual learning platform.

We would like to introduce a possible partnership opportunity for language education.

Best regards,
ManyLangs Team

Unsubscribe:
https://manylangs.studio/unsubscribe
"""

    for lead in leads:
        attempted += 1
        result = send_email(lead["email"], subject, body)

        update_send_status(
            lead_id        = lead["id"],
            email          = lead["email"],
            subject        = subject,
            status         = result["status"],
            ses_message_id = result.get("message_id")
        )

        if result["success"]:
            sent += 1
            print(f"[SENT]   {lead['school_name']} -> {lead['email']}")
        else:
            failed += 1
            print(f"[FAILED] {lead['school_name']} -> {lead['email']}")
            print(f"         {result.get('error')}")

    print(f"[SUMMARY] attempted={attempted} sent={sent} failed={failed}")

    return {
        "attempted": attempted,
        "sent":      sent,
        "failed":    failed
    }


# ──────────────────────────────────────────
# 6. 엔트리포인트
# ──────────────────────────────────────────

if __name__ == "__main__":
    send_batch()
