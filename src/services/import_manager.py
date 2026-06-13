import sqlite3
import shutil
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH  = BASE_DIR / "manylangs_crm.db"

IMPORTS_DIR = BASE_DIR / "data" / "imports"
IMPORTS_DIR.mkdir(parents=True, exist_ok=True)


def get_connection():
    return sqlite3.connect(DB_PATH)


# ──────────────────────────────────────────
# 1. import_batches 테이블 생성
# ──────────────────────────────────────────

def create_import_batches_table():
    conn   = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS import_batches (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id      TEXT UNIQUE,
            source        TEXT,
            filename      TEXT,
            total_rows    INTEGER DEFAULT 0,
            imported_rows INTEGER DEFAULT 0,
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()
    print("[OK] import_batches table ready")


# ──────────────────────────────────────────
# 2. CSV 보관 (imports/ 폴더로 복사)
# ──────────────────────────────────────────

def archive_csv(src_path: str, source: str) -> Path:
    src  = Path(src_path)
    date = datetime.now().strftime("%Y%m%d")
    dest_name = f"{source.lower()}_{date}_{src.name}"
    dest = IMPORTS_DIR / dest_name

    # 동일 파일 이미 있으면 덮어쓰지 않음
    if not dest.exists():
        shutil.copy2(src, dest)
        print(f"[ARCHIVED] {dest_name}")
    else:
        print(f"[SKIP] already archived: {dest_name}")

    return dest


# ──────────────────────────────────────────
# 3. Import 기록 저장
# ──────────────────────────────────────────

def save_batch_record(
    batch_id:      str,
    source:        str,
    filename:      str,
    total_rows:    int,
    imported_rows: int,
):
    conn   = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT OR IGNORE INTO import_batches
        (batch_id, source, filename, total_rows, imported_rows)
        VALUES (?, ?, ?, ?, ?)
        """,
        (batch_id, source.upper(), filename, total_rows, imported_rows)
    )

    conn.commit()
    conn.close()
    print(f"[SAVED] batch record: {batch_id}")


# ──────────────────────────────────────────
# 4. Import 이력 조회
# ──────────────────────────────────────────

def list_batches(source: str = None) -> list[dict]:
    conn   = get_connection()
    cursor = conn.cursor()

    if source:
        cursor.execute(
            """
            SELECT id, batch_id, source, filename, total_rows, imported_rows, created_at
            FROM import_batches
            WHERE source = ?
            ORDER BY created_at DESC
            """,
            (source.upper(),)
        )
    else:
        cursor.execute(
            """
            SELECT id, batch_id, source, filename, total_rows, imported_rows, created_at
            FROM import_batches
            ORDER BY created_at DESC
            """
        )

    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id":            row[0],
            "batch_id":      row[1],
            "source":        row[2],
            "filename":      row[3],
            "total_rows":    row[4],
            "imported_rows": row[5],
            "created_at":    row[6],
        }
        for row in rows
    ]


# ──────────────────────────────────────────
# 5. 재수입 (archived 파일 기준)
# ──────────────────────────────────────────

def reimport_batch(batch_id: str) -> dict:
    conn   = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT source, filename FROM import_batches WHERE batch_id = ?",
        (batch_id,)
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise ValueError(f"batch_id not found: {batch_id}")

    source, filename = row
    archived_path = IMPORTS_DIR / filename

    if not archived_path.exists():
        raise FileNotFoundError(f"Archived file not found: {archived_path}")

    # apollo_importer 재사용
    from apollo_importer import import_apollo_csv
    result = import_apollo_csv(str(archived_path))

    # 새 batch 기록 저장
    save_batch_record(
        batch_id      = result["batch_id"],
        source        = source,
        filename      = filename,
        total_rows    = result["total"],
        imported_rows = result["imported"],
    )

    return result


# ──────────────────────────────────────────
# 6. 통합 Import 진입점
#    CSV → archive → import → 기록 저장
# ──────────────────────────────────────────

def run_import(csv_path: str, source: str = "APOLLO") -> dict:
    create_import_batches_table()

    # 1) 보관
    archived = archive_csv(csv_path, source)

    # 2) Import
    if source.upper() == "APOLLO":
        from apollo_importer import import_apollo_csv
        result = import_apollo_csv(str(archived))
    else:
        raise ValueError(f"Unsupported source: {source}")

    # 3) 기록
    save_batch_record(
        batch_id      = result["batch_id"],
        source        = source,
        filename      = archived.name,
        total_rows    = result["total"],
        imported_rows = result["imported"],
    )

    return result


# ──────────────────────────────────────────
# 7. 이력 출력 헬퍼
# ──────────────────────────────────────────

def print_history(source: str = None):
    batches = list_batches(source)

    if not batches:
        print("[EMPTY] No import history")
        return

    print(f"\n{'ID':<4} {'SOURCE':<10} {'FILENAME':<35} {'TOTAL':>6} {'IMPORTED':>8} {'DATE'}")
    print("-" * 80)
    for b in batches:
        print(
            f"{b['id']:<4} {b['source']:<10} {b['filename']:<35} "
            f"{b['total_rows']:>6} {b['imported_rows']:>8} {b['created_at'][:16]}"
        )


# ──────────────────────────────────────────
# 8. 엔트리포인트
# ──────────────────────────────────────────

if __name__ == "__main__":
    import sys

    create_import_batches_table()

    if len(sys.argv) == 2:
        result = run_import(sys.argv[1], source="APOLLO")
        print(result)
        print_history()
    else:
        print("Usage: python import_manager.py <path_to_apollo.csv>")
        print("\n[HISTORY]")
        print_history()
