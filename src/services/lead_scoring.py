import sqlite3
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "manylangs_crm.db"


def get_connection():
    return sqlite3.connect(DB_PATH)


# ──────────────────────────────────────────
# 1. 점수 계산
# ──────────────────────────────────────────

OFFICIAL_PREFIXES = {"contact", "info", "office", "admissions", "support", "hello"}
SALES_PREFIXES    = {"sales", "marketing", "admin"}
FREE_DOMAINS      = {"gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "naver.com"}

LEAD_TYPE_SCORE = {
    "UNIVERSITY_LANGUAGE_CENTER": 30,
    "LANGUAGE_SCHOOL":            20,
    "GENERAL_SCHOOL":             15,
    "TEACHER":                     5,
}


def calculate_score(lead: dict) -> int:
    score = 0

    # 이메일 품질
    email = (lead.get("email") or "").lower().strip()
    if email and "@" in email:
        prefix, _, domain = email.partition("@")
        if prefix in OFFICIAL_PREFIXES:
            score += 30
        elif prefix in SALES_PREFIXES:
            score += 20
        if domain in FREE_DOMAINS:
            score -= 20

    # 정보 완성도
    if lead.get("website"):
        score += 20
    if lead.get("phone"):
        score += 10

    # SNS (최대 +10)
    sns_score = 0
    if lead.get("facebook"):
        sns_score += 3
    if lead.get("instagram"):
        sns_score += 3
    if lead.get("youtube"):
        sns_score += 2
    if lead.get("linkedin"):
        sns_score += 2
    score += min(sns_score, 10)

    # 리드 타입
    lead_type = (lead.get("lead_type") or "").upper()
    score += LEAD_TYPE_SCORE.get(lead_type, 0)

    return score


# ──────────────────────────────────────────
# 2. 분류
# ──────────────────────────────────────────

def classify_score(score: int) -> str:
    if score >= 90:
        return "HOT"
    elif score >= 60:
        return "WARM"
    elif score >= 30:
        return "COLD"
    else:
        return "BLOCKED"


def get_campaign_status(lead_status: str) -> str:
    if lead_status in ("HOT", "WARM"):
        return "READY_TO_SEND"
    elif lead_status == "BLOCKED":
        return "BLOCKED"
    else:
        return "NEW"


# ──────────────────────────────────────────
# 3. DB 업데이트
# ──────────────────────────────────────────

def update_lead_score(
    lead_id: int,
    score: int,
    lead_status: str,
    campaign_status: str
):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        UPDATE schools
        SET
            lead_score      = ?,
            lead_status     = ?,
            campaign_status = ?,
            last_scored_at  = ?,
            updated_at      = ?
        WHERE id = ?
        """,
        (
            score,
            lead_status,
            campaign_status,
            datetime.now().isoformat(),
            datetime.now().isoformat(),
            lead_id,
        )
    )

    conn.commit()
    conn.close()


# ──────────────────────────────────────────
# 4. 단일 리드 평가
# ──────────────────────────────────────────

def score_school(school_id: int):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT
            id, school_name, website, email, phone,
            lead_type, facebook, instagram, youtube, linkedin
        FROM schools
        WHERE id = ?
        """,
        (school_id,)
    )

    row = cursor.fetchone()
    conn.close()

    if not row:
        print(f"[WARN] school_id {school_id} not found")
        return

    lead = {
        "id":          row[0],
        "school_name": row[1],
        "website":     row[2],
        "email":       row[3],
        "phone":       row[4],
        "lead_type":   row[5],
        "facebook":    row[6],
        "instagram":   row[7],
        "youtube":     row[8],
        "linkedin":    row[9],
    }

    score           = calculate_score(lead)
    lead_status     = classify_score(score)
    campaign_status = get_campaign_status(lead_status)

    update_lead_score(lead["id"], score, lead_status, campaign_status)

    print(
        f"[SCORED] {lead['school_name']} | "
        f"score={score} | {lead_status} | {campaign_status}"
    )


# ──────────────────────────────────────────
# 5. 전체 리드 평가
# ──────────────────────────────────────────

def score_all(limit=None):
    conn = get_connection()
    cursor = conn.cursor()

    query = """
        SELECT
            id, school_name, website, email, phone,
            lead_type, facebook, instagram, youtube, linkedin
        FROM schools
    """
    if limit:
        query += f" LIMIT {int(limit)}"

    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()

    updated = 0
    for row in rows:
        lead = {
            "id":          row[0],
            "school_name": row[1],
            "website":     row[2],
            "email":       row[3],
            "phone":       row[4],
            "lead_type":   row[5],
            "facebook":    row[6],
            "instagram":   row[7],
            "youtube":     row[8],
            "linkedin":    row[9],
        }

        score           = calculate_score(lead)
        lead_status     = classify_score(score)
        campaign_status = get_campaign_status(lead_status)

        update_lead_score(lead["id"], score, lead_status, campaign_status)
        updated += 1

    return updated


# ──────────────────────────────────────────
# 6. 상태별 집계
# ──────────────────────────────────────────

def count_by_status() -> dict:
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT lead_status, COUNT(*)
        FROM schools
        GROUP BY lead_status
        """
    )

    rows = cursor.fetchall()
    conn.close()

    return {row[0]: row[1] for row in rows}


# ──────────────────────────────────────────
# 7. 실행 엔트리포인트
# ──────────────────────────────────────────

if __name__ == "__main__":
    updated = score_all()
    counts  = count_by_status()

    print(f"[SCORED] {updated} leads updated")
    print(f"HOT:     {counts.get('HOT',     0)}")
    print(f"WARM:    {counts.get('WARM',    0)}")
    print(f"COLD:    {counts.get('COLD',    0)}")
    print(f"BLOCKED: {counts.get('BLOCKED', 0)}")