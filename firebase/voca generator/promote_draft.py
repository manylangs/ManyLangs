#!/usr/bin/env python3
"""
promote_draft.py — 검수 통과한 {batch}-draft.{tag}.json만 merge.py가 읽는
{batch}-compact.{tag}.json으로 승격한다. tag는 "target" 또는 언어약어
(en, es, fr, pt, kr, jp, zh).

원칙: draft는 "아직 검수 안 됨(사람 검수 게이트를 아직 안 지남)",
compact는 "검수 통과, merge 투입 가능"을 의미한다. Manual A/번역 프롬프트
자체의 STAGE1_STATUS 셀프체크는 이미 통과했더라도, 사람이 실제로 훑어보고
승격하기 전에는 draft 상태로 남는다.

Usage:
  # 단일 파일 승격
  python3 promote_draft.py data/001/001-draft.target.json

  # voca_checker.py의 REPLACEMENTS 스타일 수정안을 반영한 뒤 승격
  python3 promote_draft.py data/001/001-draft.target.json --apply-review fixes.py

  # 폴더 전체 일괄 승격 (검수를 이미 다 통과했다고 확신할 때만)
  python3 promote_draft.py --root data --all
"""
import argparse
import importlib.util
import json
import sys
from pathlib import Path

EXPECTED_BLOCK_COUNT = 5
EXPECTED_EXAMPLES_PER_BLOCK = 3


def basic_validate(obj: dict, path: Path):
    """target draft: {"meta":{...}, "title":{"target":..., "<mirror>":...},
    "blocks":[{"id":..., "word":{"target":{core,meaning_zone}, "<mirror>":{...}},
    "examples":[{"target":..., "<mirror>":...} x3]} x5]}
    번역 draft(TRANSLATION_BLOCK)도 동일한 blocks 구조를 쓴다 (word/examples에
    해당 언어 키 하나만 존재)."""
    blocks = obj.get("blocks")
    if not isinstance(blocks, list) or len(blocks) != EXPECTED_BLOCK_COUNT:
        raise ValueError(f"{path}: block 개수 오류 (expected {EXPECTED_BLOCK_COUNT})")

    for block in blocks:
        if not isinstance(block, dict) or not block.get("id"):
            raise ValueError(f"{path}: block에 id 없음")

        examples = block.get("examples")
        if not isinstance(examples, list) or len(examples) != EXPECTED_EXAMPLES_PER_BLOCK:
            raise ValueError(f"{path}: {block.get('id')} example 개수 오류")

    title = obj.get("title")
    if not isinstance(title, dict) or not any(str(v).strip() for v in title.values()):
        raise ValueError(f"{path}: title 비어있음")


def apply_review_fixes(obj: dict, fixes_module_path: Path):
    """review.py 스타일 REPLACEMENTS 딕셔너리가 담긴 .py 파일을 로드해서
    obj에 적용한다. 이 draft는 이미 특정 언어 하나뿐이므로, 키는
    (block_id, "word"|"example", index) 형태를 기대한다. index는
    word 수정 시 무시되고, example 수정 시 1~3.

    예:
      REPLACEMENTS = {
          ("block_002", "word", None): {"core": "수정된 core", "meaning_zone": ["..."]},
          ("block_002", "example", 2): "수정된 예문",
      }
      TITLE_REPLACEMENT = "수정된 제목"   (선택)
    """
    spec = importlib.util.spec_from_file_location("fixes", fixes_module_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    lang = obj.get("lang")

    title_fix = getattr(mod, "TITLE_REPLACEMENT", None)
    if title_fix:
        if "title" not in obj or not isinstance(obj["title"], dict):
            obj["title"] = {}
        obj["title"][lang] = title_fix

    replacements = getattr(mod, "REPLACEMENTS", {})
    applied = 0
    by_id = {b["id"]: b for b in obj.get("blocks", [])}
    for key, new_value in replacements.items():
        block_id, kind, index = key
        block = by_id.get(block_id)
        if block is None:
            print(f"  [경고] block_id {block_id} 없음, 건너뜀")
            continue
        if kind == "word":
            block.setdefault("word", {})[lang] = new_value
            applied += 1
        elif kind == "example":
            i = index - 1
            if not (0 <= i < len(block.get("examples", []))):
                print(f"  [경고] {block_id} example {index} 범위 밖, 건너뜀")
                continue
            block["examples"][i][lang] = new_value
            applied += 1
        else:
            print(f"  [경고] 알 수 없는 kind: {kind}, 건너뜀")

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
