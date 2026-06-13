import csv
import sqlite3
import re
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "manylangs_crm.db"


def get_connection():
    return sqlite3.connect(DB_PATH)


def generate_batch_id() -> str:
    return f"APOLLO_{datetime.now().strftime('%Y%m%d_%H%M%S')}"


# ──────────────────────────────────────────
# 1. 이메일 정규화
# ──────────────────────────────────────────

def normalize_email(raw: str) -> str | None:
    if not raw:
        return None
    email = raw.strip().lower()
    pattern = r'^[\w\.\+\-]+@[\w\-]+\.[\w\-\.]+$'
    if re.match(pattern, email):
        return email
    return None


# ──────────────────────────────────────────
# 2. 웹사이트 정규화
# ──────────────────────────────────────────

def normalize_website(raw: str) -> str | None:
    if not raw:
        return None
    url = raw.strip().lower()
    if not url.startswith("http"):
        url = "https://" + url
    # trailing slash 제거
    return url.rstrip("/")


# ──────────────────────────────────────────
# 3. lead_type 자동 분류
# ──────────────────────────────────────────

UNIVERSITY_KEYWORDS = ["university", "college", "institute", "academia"]
LANGUAGE_KEYWORDS   = ["language", "english", "esl", "ielts", "toefl", "lingua"]

def classify_lead_type(name: str, website: str) -> str:
    text = f"{name} {website}".lower()
    if any(k in text for k in UNIVERSITY_KEYWORDS):
        return "UNIVERSITY_LANGUAGE_CENTER"
    if any(k in text for k in LANGUAGE_KEYWORDS):
        return "LANGUAGE_SCHOOL"
    return "LANGUAGE_SCHOOL"  # Apollo 기본값


# ──────────────────────────────────────────
# 4. Apollo CSV 컬럼 매핑
#    Apollo 실제 export 헤더 기준
# ──────────────────────────────────────────

def map_row(row: dict) -> dict:
    """Apollo CSV row → CRM 필드 dict"""

    def get(*keys):
        for k in keys:
            v = row.get(k, "").strip()
            if v:
                return v
        return None

    name    = get("Company", "Organization Name", "School Name", "Name")
    website = normalize_website(get("Website", "Company Website", "Domain"))
    email   = normalize_email(get("Email", "Work Email", "Person Email"))
    phone   = get("Phone", "Work Phone", "Direct Phone")
    country = get("Country", "Company Country")
    city    = get("City", "Company City")
    linkedin= get("LinkedIn URL", "Person Linkedin Url", "Company Linkedin Url")

    lead_type = classify_lead_type(name or "", website or "")

    return {
        "school_name": name,
        "website":     website,
        "email":       email,
        "phone":       phone,
        "country":     country,
        "city":        city,
        "linkedin":    linkedin,
        "lead_type":   lead_type,
        "source":      "APOLLO",
    }


# ──────────────────────────────────────────
# 5. 중복 검사 (website 기준)
# ──────────────────────────────────────────

def is_duplicate(cursor, website: str) -> bool:
    cursor.execute(
        "SELECT id FROM schools WHERE website = ?",
        (website,)
    )
    return cursor.fetchone() is not None


# ──────────────────────────────────────────
# 6. 단건 삽입
# ──────────────────────────────────────────

def insert_lead(cursor, lead: dict, batch_id: str):
    cursor.execute(
        """
        INSERT OR IGNORE INTO schools (
            school_name,
            website,
            email,
            phone,
            country,
            city,
            linkedin,
            lead_type,
            source,
            discovery_batch,
            is_merged,
            is_contacted,
            lead_score,
            lead_status,
            campaign_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'COLD', 'NEW')
        """,
        (
            lead["school_name"],
            lead["website"],
            lead["email"],
            lead["phone"],
            lead["country"],
            lead["city"],
            lead["linkedin"],
            lead["lead_type"],
            lead["source"],
            batch_id,
        )
    )
    return cursor.rowcount  # 1=삽입, 0=중복


# ──────────────────────────────────────────
# 7. 메인 Import 함수
# ──────────────────────────────────────────

def import_apollo_csv(csv_path: str) -> dict:
    path = Path(csv_path)
    if not path.exists():
        raise FileNotFoundError(f"CSV not found: {csv_path}")

    batch_id = generate_batch_id()
    print(f"\n[APOLLO IMPORT] batch_id={batch_id}")
    print(f"[FILE] {path.name}\n")

    conn   = get_connection()
    cursor = conn.cursor()

    total      = 0
    imported   = 0
    duplicates = 0
    skipped    = 0   # website 없는 행

    with open(path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        for row in reader:
            total += 1
            lead  = map_row(row)

            # website 없으면 CRM에 넣지 않음 (중복 키 기준)
            if not lead["website"]:
                skipped += 1
                continue

            if is_duplicate(cursor, lead["website"]):
                duplicates += 1
                continue

            inserted = insert_lead(cursor, lead, batch_id)
            if inserted:
                imported += 1

    conn.commit()
    conn.close()

    summary = {
        "batch_id":   batch_id,
        "file":       path.name,
        "total":      total,
        "imported":   imported,
        "duplicates": duplicates,
        "skipped":    skipped,
    }

    print(f"[RESULT]")
    print(f"  total      : {total}")
    print(f"  imported   : {imported}")
    print(f"  duplicates : {duplicates}")
    print(f"  skipped    : {skipped}  (website 없음)")
    print(f"  batch_id   : {batch_id}\n")

    return summary


# ──────────────────────────────────────────
# 8. 엔트리포인트
# ──────────────────────────────────────────

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python apollo_importer.py <path_to_apollo.csv>")
        sys.exit(1)

    result = import_apollo_csv(sys.argv[1])
    print(result)
