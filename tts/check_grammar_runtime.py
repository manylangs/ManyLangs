#!/usr/bin/env python3
"""
grammar runtime JSON 검사 + 단순 오류 자동 복구 스크립트 (v3)

기능:
  1. 검사  : 모든 언어({BASE}/{lang}/{a1~c2}/{id}/data/*.runtime.json)의
             내용 줄 수(252) / 내부 빈 줄 / JSON 파싱을 검사
  2. 판정  : - 표준 재직렬화 시 252줄이 되는 파일 → [복구 가능] (포맷 문제일 뿐)
             - 재직렬화해도 252줄이 아닌 파일   → [구조 불일치] (작업 전/필드 누락 등, 미수정)
  3. 복구  : --fix 옵션 시 [복구 가능] 파일을 표준 포맷으로 재저장 (.bak 백업 생성)

사용법:
  python3 check_grammar_runtime.py                # 전체 검사만 (수정 없음)
  python3 check_grammar_runtime.py --fix          # 검사 + 단순 오류 자동 복구
  python3 check_grammar_runtime.py --lang kr      # 특정 언어만
  python3 check_grammar_runtime.py --fix --no-backup   # 백업 없이 복구
"""

import argparse
import json
import sys
from pathlib import Path

DEFAULT_BASE = Path("/Users/junghasuk/Desktop/content/grammar")
EXPECTED_LINES = 252
VALID_LEVELS = ("a1", "a2", "b1", "b2", "c1", "c2")


def canonical_dump(data) -> str:
    """표준 포맷(들여쓰기 4칸, 유니코드 그대로)으로 직렬화."""
    return json.dumps(data, ensure_ascii=False, indent=4)


def check_file(path: Path, expected_lines: int) -> dict:
    result = {
        "path": path,
        "line_count": None,          # 앞뒤 빈 줄 제외한 내용 줄 수
        "line_count_ok": False,
        "blank_lines": [],           # 내용 내부 빈 줄 번호
        "json_ok": False,
        "json_error": None,
        "fixable": False,            # 재직렬화하면 252줄이 되는가
        "needs_fix": False,          # 통과는 못 했지만 fixable인가
        "canonical": None,           # 복구 시 쓸 표준 텍스트
    }

    raw = path.read_text(encoding="utf-8")
    lines = raw.splitlines()

    # 앞뒤 빈 줄 제외 범위
    start, end = 0, len(lines)
    while start < end and lines[start].strip() == "":
        start += 1
    while end > start and lines[end - 1].strip() == "":
        end -= 1
    content_lines = lines[start:end]

    result["line_count"] = len(content_lines)
    result["line_count_ok"] = (len(content_lines) == expected_lines)

    for i, line in enumerate(content_lines, start=start + 1):
        if line.strip() == "":
            result["blank_lines"].append(i)

    # JSON 파싱 + 표준 재직렬화 판정
    try:
        data = json.loads(raw)
        result["json_ok"] = True
        canonical = canonical_dump(data)
        if len(canonical.splitlines()) == expected_lines:
            result["fixable"] = True
            result["canonical"] = canonical + "\n"
    except json.JSONDecodeError as e:
        result["json_error"] = f"{e.msg} (line {e.lineno})"

    passed = result["line_count_ok"] and not result["blank_lines"] and result["json_ok"]
    # 원본이 표준 포맷과 정확히 같지 않아도, 검사 3종만 통과하면 통과로 인정
    result["passed"] = passed
    result["needs_fix"] = (not passed) and result["fixable"]
    return result


def apply_fix(r: dict, backup: bool) -> bool:
    """복구 가능 파일을 표준 포맷으로 재저장. 성공 시 True."""
    path: Path = r["path"]
    try:
        if backup:
            path.with_suffix(path.suffix + ".bak").write_text(
                path.read_text(encoding="utf-8"), encoding="utf-8"
            )
        path.write_text(r["canonical"], encoding="utf-8")
        return True
    except OSError as e:
        print(f"      ! 복구 실패: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="grammar runtime JSON 검증 + 자동 복구")
    parser.add_argument("base", nargs="?", default=str(DEFAULT_BASE))
    parser.add_argument("--lines", type=int, default=EXPECTED_LINES)
    parser.add_argument("--lang", default=None, help="특정 언어만 검사 (예: kr)")
    parser.add_argument("--fix", action="store_true", help="단순 오류 자동 복구")
    parser.add_argument("--no-backup", action="store_true", help="복구 시 .bak 백업 생략")
    args = parser.parse_args()

    base = Path(args.base)
    if not base.is_dir():
        print(f"[오류] 경로가 존재하지 않습니다: {base}")
        sys.exit(1)

    langs = sorted(p.name for p in base.iterdir() if p.is_dir())
    if args.lang:
        langs = [l for l in langs if l == args.lang]
    if not langs:
        print(f"[오류] 언어 폴더가 없습니다: {base}")
        sys.exit(1)

    all_results, unknown_levels = [], []
    for lang in langs:
        for level_dir in sorted(p for p in (base / lang).iterdir() if p.is_dir()):
            if level_dir.name not in VALID_LEVELS:
                unknown_levels.append(level_dir)
                continue
            for f in sorted(level_dir.glob("*/data/*.runtime.json")):
                all_results.append((lang, check_file(f, args.lines)))

    if not all_results:
        print(f"[경고] 검사할 *.runtime.json 파일을 찾지 못했습니다: {base}")
        sys.exit(1)

    print("=" * 70)
    print("grammar runtime JSON 검사 보고서")
    print(f"기준 경로 : {base}")
    print(f"기대 줄 수: {args.lines}줄 / 모드: {'검사+복구' if args.fix else '검사만'}")
    print("=" * 70)

    passed, fixed, fixables, structural = [], [], [], []
    per_lang = {}

    for lang, r in all_results:
        per_lang.setdefault(lang, {"pass": 0, "fixable": 0, "structural": 0})
        if r["passed"]:
            per_lang[lang]["pass"] += 1
            passed.append(r)
        elif r["needs_fix"]:
            per_lang[lang]["fixable"] += 1
            fixables.append((lang, r))
        else:
            per_lang[lang]["structural"] += 1
            structural.append((lang, r))

    # 복구 실행
    if args.fix and fixables:
        print(f"\n[자동 복구] 대상 {len(fixables)}건")
        for lang, r in fixables:
            rel = r["path"].relative_to(base)
            ok = apply_fix(r, backup=not args.no_backup)
            print(f"  {'✔ 복구 완료' if ok else '✗ 복구 실패'}: {rel} "
                  f"({r['line_count']}줄 → {args.lines}줄)")
            if ok:
                fixed.append(r)

    print("\n[언어별 요약]")
    for lang in langs:
        if lang in per_lang:
            c = per_lang[lang]
            total = c["pass"] + c["fixable"] + c["structural"]
            fixed_note = " (복구됨)" if args.fix and c["fixable"] else ""
            print(f"  {lang}: {total}개 — 통과 {c['pass']} / "
                  f"단순 오류 {c['fixable']}{fixed_note} / 구조 불일치 {c['structural']}")

    if fixables and not args.fix:
        print(f"\n[단순 오류 — 복구 가능] ({len(fixables)}건)  → --fix 옵션으로 자동 복구")
        for lang, r in fixables:
            rel = r["path"].relative_to(base)
            issues = []
            if not r["line_count_ok"]:
                issues.append(f"{r['line_count']}줄 ({r['line_count'] - args.lines:+d})")
            if r["blank_lines"]:
                issues.append(f"내부 빈 줄 {len(r['blank_lines'])}곳")
            print(f"  ⚠ {rel}: {', '.join(issues)}")

    if structural:
        print(f"\n[구조 불일치 — 수동 확인 필요, 미수정] ({len(structural)}건)")
        for lang, r in structural:
            rel = r["path"].relative_to(base)
            if not r["json_ok"]:
                print(f"  ✗ {rel}: JSON 파싱 실패 — {r['json_error']}")
            else:
                print(f"  ✗ {rel}: {r['line_count']}줄 "
                      f"({r['line_count'] - args.lines:+d}) — 필드 누락/추가 추정")

    if unknown_levels:
        print(f"\n[참고] 표준 레벨(a1~c2)이 아닌 폴더:")
        for p in unknown_levels:
            print(f"  - {p}")

    remaining = len(fixables) - len(fixed) + len(structural)
    print("\n" + "=" * 70)
    print(f"총 {len(all_results)}개 — 통과 {len(passed)} / 복구 {len(fixed)} / 남은 문제 {remaining}")
    sys.exit(1 if remaining else 0)


if __name__ == "__main__":
    main()
