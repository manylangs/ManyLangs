#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
idiom_checker.py — IDIOM 시리즈 전용 검증 스크립트

검사 항목:
  1) 폴더/파일 구조
     - audio/idiom_{level}_{chapter}.wav
     - audio/idiom_{level}_{chapter}.cues.json
     - data/data.json

  2) JSON 기본 내용
     - JSON 파싱 가능 여부
     - meta.id와 챕터 폴더 번호 일치 여부
     - blocks 존재 여부
     - expression.target 존재 여부
     - examples가 5개인지 여부

  3) 7개 학습언어 존재 여부
     - kr, en, pt, fr, jp, zh, es
     - meta를 제외한 title / blocks(expression, explanation, examples 등)를
       "블록 단위"로 취합해서 검사
     - 블록 안에 7개 언어가 모두 있으면 정상(출력 없음),
       하나라도 빠지거나 비어 있으면 그 블록에 대해 한 줄만 요약 출력

실행:
    python3 idiom_checker.py
"""

from pathlib import Path
import json
import re

CONTENT_ROOT = Path("/Users/junghasuk/Desktop/content")
SERIES = "idiom"
CHAPTER_PATTERN = re.compile(r"\d{3}")
LANGS = {"kr", "en", "pt", "fr", "jp", "zh", "es"}

# ---- 구조 검사 결과 ----
missing_dirs = []
empty_dirs = []
missing_files = []
empty_files = []
unexpected_jsons = []
bad_json = []

# ---- ID / 언어 검사 결과 ----
id_errors = []
language_errors = []

# ---- 내용 검사 결과 ----
# chapter_expressions[lang][level][chapter] = [표현1, 표현2, ...]
chapter_expressions = {}


def check_dir(path: Path) -> bool:
    """폴더가 존재하고, 비어 있지 않은지 확인."""
    if not path.exists():
        missing_dirs.append(path)
        return False
    if not any(path.iterdir()):
        empty_dirs.append(path)
        return False
    return True


def check_file(path: Path) -> bool:
    """파일이 존재하고, 0바이트가 아닌지 확인."""
    if not path.exists():
        missing_files.append(path)
        return False
    if path.stat().st_size == 0:
        empty_files.append(path)
        return False
    return True


def check_only_expected_json(data_dir: Path, expected_name: str):
    """data 폴더 안에 expected_name 외의 JSON이 있으면 기록."""
    if not data_dir.exists():
        return

    for file in data_dir.glob("*.json"):
        if file.name != expected_name:
            unexpected_jsons.append(file)


def collect_language_status(value, missing_acc: set, empty_acc: set):
    """
    value를 재귀적으로 순회하면서, 언어 객체(target 키 또는 7개 언어 키 중
    하나 이상을 가진 dict)를 찾아 missing_acc / empty_acc에 누적한다.

    개별 필드 위치(location)는 기록하지 않고, 상위(블록/타이틀) 단위로
    "빠진 언어들의 합집합"만 취합해서 간략하게 보고하기 위한 함수.
    """
    if isinstance(value, dict):
        keys = set(value.keys())
        is_language_dict = "target" in keys or bool(keys & LANGS)

        if is_language_dict:
            missing_acc.update(LANGS - keys)

            for lang in LANGS:
                if lang in value and (
                    value[lang] is None
                    or (isinstance(value[lang], str) and not value[lang].strip())
                ):
                    empty_acc.add(lang)

        for child in value.values():
            collect_language_status(child, missing_acc, empty_acc)

    elif isinstance(value, list):
        for child in value:
            collect_language_status(child, missing_acc, empty_acc)


def chapter_label(data_json: Path) -> str:
    """
    data.json 경로에서 '언어/레벨/세자리숫자'만 뽑아 표시용 라벨을 만든다.
    예) .../content/idiom/en/a1/004/data/data.json -> idiom/en/a1/004
    """
    chapter_dir = data_json.parent.parent  # .../idiom/en/a1/004
    try:
        return str(chapter_dir.relative_to(CONTENT_ROOT))
    except ValueError:
        return str(chapter_dir)


def check_languages_summarized(data: dict, data_json: Path):
    """
    meta를 제외한 title + blocks[*] 전체를 한데 취합해서, 파일(챕터) 단위로
    missing/empty 각각 한 줄씩만 language_errors에 기록한다.
    (블록별/필드별 위치는 표시하지 않음 — 경로만 알면 충분하므로)
    """
    missing, empty = set(), set()

    title = data.get("title")
    if title is not None:
        collect_language_status(title, missing, empty)

    blocks = data.get("blocks") or []
    for block in blocks:
        collect_language_status(block, missing, empty)

    label = chapter_label(data_json)

    if missing:
        language_errors.append(f"[LANG] {label} missing {sorted(missing)}")
    if empty:
        language_errors.append(f"[LANG EMPTY] {label} empty {sorted(empty)}")


def extract_expressions(data_json: Path, chapter_number: str):
    """
    data.json을 읽고 다음을 검사한다.
      - meta.id == 챕터 폴더 번호
      - 7개 언어 키 존재 여부 (블록 단위로 요약)
      - blocks / expression.target / examples 구조

    표현 목록을 반환하며, 읽기 실패 시 None을 반환한다.
    """
    try:
        with open(data_json, "r", encoding="utf-8") as file:
            data = json.load(file)
    except json.JSONDecodeError as error:
        bad_json.append((data_json, f"JSON 파싱 오류: {error}"))
        return None
    except Exception as error:
        bad_json.append((data_json, f"읽기 오류: {error}"))
        return None

    # 1. meta.id와 챕터 폴더 번호 일치 여부
    json_id = data.get("meta", {}).get("id")
    if json_id != chapter_number:
        id_errors.append(
            f"[ID] {data_json} | folder={chapter_number} json={json_id}"
        )

    # 2. 7개 언어 존재 여부 (meta 제외, 블록 단위 요약)
    check_languages_summarized(data, data_json)

    # 3. idiom 블록 내용 검사
    blocks = data.get("blocks")
    if not blocks:
        bad_json.append((data_json, "blocks 없음/비어있음"))
        return None

    expressions = []

    for index, block in enumerate(blocks, start=1):
        expression = block.get("expression", {})
        target = expression.get("target")

        if not target:
            bad_json.append(
                (
                    data_json,
                    f"blocks[{index}].expression.target 없음 "
                    f"(frequency_rank: {block.get('frequency_rank', '?')})",
                )
            )
            expressions.append(None)
        else:
            expressions.append(target)

        examples = block.get("examples")
        if not examples:
            bad_json.append(
                (data_json, f"blocks[{index}].examples 없음/비어있음 (표현: {target})")
            )
        elif len(examples) != 5:
            bad_json.append(
                (
                    data_json,
                    f"blocks[{index}].examples 개수 이상함: {len(examples)}개 "
                    f"(표현: {target})",
                )
            )

    return expressions


def check_idiom_chapter(chapter: Path, level: str, chap: str, lang: str):
    audio_dir = chapter / "audio"
    data_dir = chapter / "data"

    if check_dir(audio_dir):
        check_file(audio_dir / f"idiom_{level}_{chap}.wav")
        check_file(audio_dir / f"idiom_{level}_{chap}.cues.json")

    if check_dir(data_dir):
        expected_name = "data.json"
        data_json = data_dir / expected_name

        if check_file(data_json):
            check_only_expected_json(data_dir, expected_name)
            expressions = extract_expressions(data_json, chap)
            chapter_expressions.setdefault(lang, {}).setdefault(level, {})[chap] = expressions


def walk_idiom(root: Path):
    if not root.exists():
        missing_dirs.append(root)
        return

    label = root.relative_to(CONTENT_ROOT)
    print(f"\n===== {label} =====")

    for lang in sorted(root.iterdir()):
        if not lang.is_dir():
            continue

        for level in sorted(lang.iterdir()):
            if not level.is_dir():
                continue

            for chapter in sorted(level.iterdir()):
                if not chapter.is_dir():
                    continue

                if not CHAPTER_PATTERN.fullmatch(chapter.name):
                    continue

                check_idiom_chapter(chapter, level.name, chapter.name, lang.name)


def print_results():
    # ---- 표현 목록 출력 ----
    print("\n" + "=" * 70)
    print("IDIOM 표현 목록 (챕터별 전체 idiom — 실제 내용 확인용)")

    for lang in sorted(chapter_expressions):
        print(f"\n[{lang}]")
        for level in sorted(chapter_expressions[lang]):
            print(f"  {level.upper()}")
            for chap in sorted(chapter_expressions[lang][level]):
                expressions = chapter_expressions[lang][level][chap]
                if expressions is None:
                    print(f"    {chap} : ⚠️ data.json 읽기 실패 (BAD data.json 참고)")
                    continue

                display = ", ".join(
                    expression if expression else "⚠️없음"
                    for expression in expressions
                )
                print(f"    {chap} ({len(expressions)}개) : {display}")

    # ---- 구조 검사 결과 ----
    print("\n" + "=" * 70)
    print("STRUCTURE CHECK")

    print(f"\nMISSING DIR     : {len(missing_dirs)}")
    for path in missing_dirs:
        print("[DIR ]", path)

    print(f"\nEMPTY DIR       : {len(empty_dirs)}")
    for path in empty_dirs:
        print("[EMPTY DIR]", path)

    print(f"\nMISSING FILE    : {len(missing_files)}")
    for path in missing_files:
        print("[FILE]", path)

    print(f"\nEMPTY FILE      : {len(empty_files)}")
    for path in empty_files:
        print("[EMPTY FILE]", path)

    print(f"\nUNEXPECTED JSON : {len(unexpected_jsons)}")
    for path in unexpected_jsons:
        print("[JSON]", path)

    print(f"\nBAD data.json   : {len(bad_json)}")
    for path, reason in bad_json:
        print("[BAD JSON]", path, "-", reason)

    # ---- ID / 7개 언어 검사 결과 ----
    print("\n" + "=" * 70)
    print("ID / 7 LANGUAGE CHECK (블록 단위 요약, 정상 블록은 표시 안 함)")

    print(f"\nID ERRORS       : {len(id_errors)}")
    for error in id_errors:
        print(error)

    print(f"\nLANG ERRORS     : {len(language_errors)}")
    for error in language_errors:
        print(error)

    total_errors = (
        len(missing_dirs)
        + len(empty_dirs)
        + len(missing_files)
        + len(empty_files)
        + len(unexpected_jsons)
        + len(bad_json)
        + len(id_errors)
        + len(language_errors)
    )

    print("\n" + "=" * 70)
    if total_errors == 0:
        print("✅ 모든 IDIOM 파일 통과")
    else:
        print(f"❌ 전체 오류/경고: {total_errors}개")
    print("DONE")


def main():
    # 일반 idiom + demo/idiom 둘 다 검사
    walk_idiom(CONTENT_ROOT / SERIES)
    walk_idiom(CONTENT_ROOT / "demo" / SERIES)
    print_results()


if __name__ == "__main__":
    main()