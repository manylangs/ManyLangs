#!/usr/bin/env python3
"""
check_titles.py

144배치 전체의 title 필드를 스캔해서, ConceptID 코드가 그대로 노출된 것
(예: "C2_COMM_006", "C2_REL_VIS_A_VIS, ...")이 남아있는 배치를 찾는다.

정상 title은 사람이 읽을 수 있는 단어 나열(예: "vis-à-vis, contingent on, ...")
이고, 버그 title은 대문자+언더스코어로 된 내부 코드 형태다.

Usage:
  python3 check_titles.py --root ./data
"""

import argparse
import json
import re
from pathlib import Path

CONCEPT_ID_PATTERN = re.compile(r'\b[A-Z]\d(_[A-Z0-9]+)+\b')


def resolve_batch_file(batch_dir: Path):
    runtime_path = batch_dir / f"{batch_dir.name}.runtime.json"
    if runtime_path.exists():
        return runtime_path
    legacy_path = batch_dir / "data.json"
    if legacy_path.exists():
        return legacy_path
    return None


def main():
    parser = argparse.ArgumentParser(description="144배치 title 필드에서 ConceptID 코드 노출 버그 스캔")
    parser.add_argument("--root", required=True, help="voca generator/data 경로")
    args = parser.parse_args()

    root = Path(args.root)
    if not root.exists():
        print(f"[오류] 경로 없음: {root}")
        return

    total_batches = 0
    broken = []

    for batch_dir in sorted(root.iterdir()):
        if not batch_dir.is_dir() or not batch_dir.name.isdigit():
            continue
        f = resolve_batch_file(batch_dir)
        if f is None:
            continue
        total_batches += 1

        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"  [경고] {f} 파싱 실패: {e}")
            continue

        title = data.get("title", {})
        for lang, val in title.items():
            if isinstance(val, str) and CONCEPT_ID_PATTERN.search(val):
                broken.append((batch_dir.name, lang, val))
                break

    print(f"[스캔 완료] 총 {total_batches}개 배치 확인")
    print(f"[결과] title 버그 발견: {len(broken)}건\n")

    if broken:
        for bid, lang, val in broken:
            print(f"  batch={bid} lang={lang}: {val}")
    else:
        print("  버그 없음 — 모든 title이 정상입니다.")

    print()
    print("[참고] target/en(또는 kr, 미러 언어)에 버그가 있으면 수정 불가(미러 제약) —")
    print("       재검토 대기 목록에 기록. 나머지 6개 언어는 voca_review.py로 수정 가능.")


if __name__ == "__main__":
    main()
