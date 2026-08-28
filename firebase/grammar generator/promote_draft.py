#!/usr/bin/env python3
"""
promote_draft.py — 검수 통과한 {batch}-draft.{tag}.json만 merge.py가 읽는
{batch}-compact.{tag}.json으로 승격한다. tag는 "target" 또는 언어약어
(en, es, fr, pt, kr, jp, zh).

파일명 규칙: 단계(draft/compact)가 항상 맨 앞에 온다. 검수기가
*-compact.*.json 글롭 하나로 승격된 파일 전체를 스캔할 수 있고,
*.target.json vs *.{언어}.json으로 원문/번역도 바로 구분된다.

원칙: draft는 "아직 검수 안 됨", compact는 "검수 통과, merge 투입 가능"을
의미한다. compact가 없으면 merge.py가 그 언어를 건너뛰므로, 검수를
통과하지 못한 언어는 자동으로 최종 결과물에서 빠지게 된다.

Usage:
  # 단일 파일 승격
  python3 promote_draft.py data/001/001-draft.target.json

  # 수정안(REPLACEMENTS 스타일 딕셔너리)을 반영한 뒤 승격
  python3 promote_draft.py data/001/001-draft.target.json --apply-review fixes.py

  # 폴더 전체 일괄 승격 (검수를 이미 다 통과했다고 확신할 때만)
  python3 promote_draft.py --root data --all
"""
import argparse
import importlib.util
import json
import sys
from pathlib import Path

EXPECTED_EXP = 5
EXPECTED_CORE = 4
EXPECTED_VAR = 4
EXPECTED_EXT = 4


def basic_validate(obj: dict, path: Path):
    if not str(obj.get("title", "")).strip():
        raise ValueError(f"{path}: title 비어있음")

    groups = [
        ("explanations", EXPECTED_EXP),
        ("core_patterns", EXPECTED_CORE),
        ("variations", EXPECTED_VAR),
        ("extended_usage", EXPECTED_EXT),
    ]
    for key, expected in groups:
        values = obj.get(key)
        if not isinstance(values, list) or len(values) != expected:
            raise ValueError(f"{path}: {key} 개수 오류 (expected {expected})")
        for i, v in enumerate(values):
            if not isinstance(v, str) or not v.strip():
                raise ValueError(f"{path}: {key}[{i}] 빈 문장")


def apply_review_fixes(obj: dict, fixes_module_path: Path):
    """review.py 스타일 REPLACEMENTS 딕셔너리가 담긴 .py 파일을 로드해서
    obj에 적용한다. 이 draft는 이미 특정 언어 하나뿐이므로, 키는
    (group, index) 형태를 기대한다. group은
    "explanations"/"core_patterns"/"variations"/"extended_usage" 중 하나,
    index는 1부터 시작.

    예: REPLACEMENTS = {("core_patterns", 2): "수정된 문장", ...}
        TITLE_REPLACEMENT = "수정된 제목"   (선택)
    """
    spec = importlib.util.spec_from_file_location("fixes", fixes_module_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    title_fix = getattr(mod, "TITLE_REPLACEMENT", None)
    if title_fix:
        obj["title"] = title_fix

    replacements = getattr(mod, "REPLACEMENTS", {})
    applied = 0
    for key, new_text in replacements.items():
        group, idx = key
        if group not in obj:
            print(f"  [경고] group {group} 없음, 건너뜀")
            continue
        i = idx - 1
        if not (0 <= i < len(obj[group])):
            print(f"  [경고] {group}[{idx}] 범위 밖, 건너뜀")
            continue
        obj[group][i] = new_text
        applied += 1

    print(f"  [수정 적용] {applied}건")
    return obj


def promote_one(draft_path: Path, apply_review: Path = None, force: bool = False):
    compact_path = draft_path.parent / draft_path.name.replace("-draft.", "-compact.", 1)

    if compact_path.exists() and not force:
        print(f"  [건너뜀] 이미 존재함 (덮어쓰려면 --force): {compact_path}")
        return False

    with open(draft_path, encoding="utf-8") as f:
        obj = json.load(f)

    if apply_review:
        obj = apply_review_fixes(obj, apply_review)

    try:
        basic_validate(obj, draft_path)
    except ValueError as e:
        print(f"  [승격 실패] {e}")
        return False

    with open(compact_path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"  [승격 완료] {draft_path.name} -> {compact_path.name}")
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("draft_path", nargs="?", help="승격할 단일 {batch}-draft.{tag}.json 경로")
    parser.add_argument("--root", help="--all과 함께: 이 폴더 아래 모든 *-draft.*.json을 찾음")
    parser.add_argument("--all", action="store_true", help="--root 아래 draft 파일 전부 승격")
    parser.add_argument("--apply-review", help="REPLACEMENTS(/TITLE_REPLACEMENT)가 담긴 .py 파일")
    parser.add_argument("--force", action="store_true", help="이미 compact.json이 있어도 덮어씀")
    args = parser.parse_args()

    if args.all:
        if not args.root:
            print("[오류] --all은 --root와 함께 써야 함", file=sys.stderr)
            sys.exit(1)
        files = sorted(Path(args.root).rglob("*-draft.*.json"))
        if not files:
            print("승격할 draft 파일이 없습니다.")
            return
        ok, fail = 0, 0
        for f in files:
            print(f"- {f}")
            if promote_one(f, force=args.force):
                ok += 1
            else:
                fail += 1
        print(f"\n총 {len(files)}개 중 {ok}개 승격, {fail}개 실패/건너뜀")
    else:
        if not args.draft_path:
            print("[오류] draft_path를 지정하거나 --all --root를 쓰세요", file=sys.stderr)
            sys.exit(1)
        review_path = Path(args.apply_review) if args.apply_review else None
        promote_one(Path(args.draft_path), apply_review=review_path, force=args.force)


if __name__ == "__main__":
    main()
