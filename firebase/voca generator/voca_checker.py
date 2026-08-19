#!/usr/bin/env python3
"""
voca 구조 완전성 검사기 (checker)

review.py와 마찬가지로 KR-target / EN-target 데이터 모두에
공용으로 사용하는 단일 스크립트다.

review.py는 "수정"을 적용하는 스크립트이고, 이 checker.py는
"수정 없이 읽기만" 하면서 아래 항목을 검사한다.

  1) 언어 키 완전성 (S-04/S-05 계열)
     title / word / examples 각 항목에 8개 언어
     (target 포함: target, en, es, fr, pt, kr, jp, zh) 키가
     모두 존재하는가.

  2) word.{lang}의 core/meaning_zone 구조 규칙
     (Manual A Section 3.4, Meaning Zone Rules 중 구조적으로
     검증 가능한 항목)
     - word가 {"core": str, "meaning_zone": [str, ...]} 형태인가
     - meaning_zone 길이가 1~3인가
     - meaning_zone[0] == core 인가
     - meaning_zone에 중복 표현이 없는가

  3) 폴더와 meta.id의 대응
     data 폴더는 001~144까지 연속 번호를 사용하지만,
     meta.id는 각 레벨마다 001~024로 다시 시작한다.

     폴더 범위와 예상 meta.id:
       001~024 -> 001~024
       025~048 -> 001~024
       049~072 -> 001~024
       073~096 -> 001~024
       097~120 -> 001~024
       121~144 -> 001~024

  같은 zone인지 / 의미 확장·축소인지 / 품사 이동인지처럼 의미
  판단이 필요한 규칙은 이 스크립트가 검사할 수 없다 — 그건
  검수프롬프트(voca_kr_검수프롬프트_v2.md /
  voca_en_검수프롬프트_v2.md)가 사람 대신 판단하는 영역이다.
"""

import json
from pathlib import Path

ROOT = Path(
    "/Users/junghasuk/Desktop/ManyLangs/web/firebase/"
    "voca generator/data"
)

############################################################
# 언어 완전성 검사용 전체 8개 언어 (target 포함)
############################################################

LANGS = {"target", "en", "kr", "pt", "fr", "jp", "zh", "es"}

BATCH_START = 1
BATCH_END = 144

# 각 레벨의 챕터 수
CHAPTERS_PER_LEVEL = 24

errors = []


############################################################
# word.{lang} 구조 검사
#
# 스키마:
# {"core": "문자열", "meaning_zone": ["문자열", ...]}
############################################################

def check_word_entry(word_value, location: str) -> None:
    if not isinstance(word_value, dict):
        errors.append(
            f"[WORD-TYPE] {location} | word 값이 객체가 아닙니다: "
            f"{word_value!r}"
        )
        return

    extra_keys = set(word_value.keys()) - {"core", "meaning_zone"}

    if extra_keys:
        errors.append(
            f"[WORD-KEYS] {location} | core/meaning_zone 이외의 키: "
            f"{sorted(extra_keys)}"
        )

    core = word_value.get("core")
    meaning_zone = word_value.get("meaning_zone")

    if not isinstance(core, str) or not core.strip():
        errors.append(
            f"[WORD-CORE] {location} | core가 비어 있거나 문자열이 "
            f"아닙니다: {core!r}"
        )
        core_ok = False
    else:
        core_ok = True

    if not isinstance(meaning_zone, list):
        errors.append(
            f"[WORD-MZ-TYPE] {location} | meaning_zone이 배열이 "
            f"아닙니다: {meaning_zone!r}"
        )
        return

    if len(meaning_zone) < 1:
        errors.append(
            f"[WORD-MZ-MIN] {location} | meaning_zone이 비어 있습니다 "
            f"(최소 1개 필요)"
        )
        return

    if len(meaning_zone) > 3:
        errors.append(
            f"[WORD-MZ-MAX] {location} | meaning_zone이 3개를 "
            f"초과합니다 (현재 {len(meaning_zone)}개): "
            f"{meaning_zone!r}"
        )

    for item in meaning_zone:
        if not isinstance(item, str) or not item.strip():
            errors.append(
                f"[WORD-MZ-ITEM] {location} | meaning_zone 항목이 "
                f"비어 있거나 문자열이 아닙니다: {meaning_zone!r}"
            )
            return

    if core_ok and meaning_zone[0] != core:
        errors.append(
            f"[WORD-MZ-FIRST] {location} | meaning_zone[0]이 core와 "
            f"다릅니다 (core={core!r}, "
            f"meaning_zone[0]={meaning_zone[0]!r})"
        )

    if len(set(meaning_zone)) != len(meaning_zone):
        errors.append(
            f"[WORD-MZ-DUP] {location} | meaning_zone에 중복된 표현이 "
            f"있습니다: {meaning_zone!r}"
        )


############################################################
# data.json 하나 검사
############################################################

def check_data(data, json_file: Path) -> None:
    chapter = json_file.parent.name

    ##########################
    # 최상위 데이터 타입
    ##########################

    if not isinstance(data, dict):
        errors.append(
            f"[DATA-TYPE] {json_file} | 최상위 JSON이 객체가 아닙니다."
        )
        return

    ##########################
    # meta
    ##########################

    meta = data.get("meta", {})

    if not isinstance(meta, dict):
        errors.append(
            f"[META-TYPE] {json_file} | meta가 객체가 아닙니다."
        )
    else:
        json_id = meta.get("id")

        try:
            folder_number = int(chapter)
            expected_id = (
                f"{((folder_number - 1) % CHAPTERS_PER_LEVEL) + 1:03d}"
            )

            if json_id != expected_id:
                errors.append(
                    f"[ID] {json_file} | folder={chapter} "
                    f"expected={expected_id} json={json_id}"
                )
        except ValueError:
            errors.append(
                f"[FOLDER-ID] {json_file} | 폴더명이 3자리 숫자가 "
                f"아닙니다: {chapter!r}"
            )

    ##########################
    # title: 언어 완전성
    ##########################

    title = data.get("title", {})

    if not isinstance(title, dict):
        errors.append(
            f"[TITLE-TYPE] {json_file} | title이 객체가 아닙니다."
        )
    else:
        missing_title = LANGS - set(title.keys())

        if missing_title:
            errors.append(
                f"[LANG-TITLE] {json_file} | "
                f"missing {sorted(missing_title)}"
            )

        for lang in LANGS:
            if lang not in title:
                continue

            title_value = title[lang]

            if not isinstance(title_value, str) or not title_value.strip():
                errors.append(
                    f"[TITLE-EMPTY] {json_file} | title.{lang} 값이 "
                    f"비어 있거나 문자열이 아닙니다: {title_value!r}"
                )

    ##########################
    # blocks
    ##########################

    blocks = data.get("blocks", [])

    if not isinstance(blocks, list):
        errors.append(
            f"[BLOCKS-TYPE] {json_file} | blocks가 배열이 아닙니다: "
            f"{blocks!r}"
        )
        return

    if len(blocks) != 5:
        errors.append(
            f"[BLOCK-COUNT] {json_file} | blocks가 5개가 아닙니다 "
            f"(현재 {len(blocks)}개)"
        )

    for block_idx, block in enumerate(blocks):
        if not isinstance(block, dict):
            errors.append(
                f"[BLOCK-TYPE] {json_file} | block index "
                f"{block_idx}가 객체가 아닙니다: {block!r}"
            )
            continue

        block_id = block.get("id", f"index {block_idx}")

        ######################
        # word
        ######################

        word = block.get("word", {})

        if not isinstance(word, dict):
            errors.append(
                f"[WORD-CONTAINER-TYPE] {json_file} | block {block_id} "
                f"| word가 객체가 아닙니다: {word!r}"
            )
        else:
            missing_word = LANGS - set(word.keys())

            if missing_word:
                errors.append(
                    f"[LANG-WORD] {json_file} | block {block_id} "
                    f"missingmissing {sorted(missing_word)}"
                )

            for lang, word_value in word.items():
                if lang not in LANGS:
                    continue

                check_word_entry(
                    word_value,
                    f"{json_file} | block {block_id} | word.{lang}",
                )

        ######################
        # examples
        ######################

        examples = block.get("examples", [])

        if not isinstance(examples, list):
            errors.append(
                f"[EXAMPLES-TYPE] {json_file} | block {block_id} "
                f"| examples가 배열이 아닙니다: {examples!r}"
            )
            continue

        if len(examples) != 3:
            errors.append(
                f"[EXAMPLE-COUNT] {json_file} | block {block_id} "
                f"examples가 3개가 아닙니다 "
                f"(현재 {len(examples)}개)"
            )

        for ex_idx, example in enumerate(examples):
            if not isinstance(example, dict):
                errors.append(
                    f"[EXAMPLE-TYPE] {json_file} | block {block_id} "
                    f"example {ex_idx + 1}이 객체가 아닙니다: "
                    f"{example!r}"
                )
                continue

            missing = LANGS - set(example.keys())

            if missing:
                errors.append(
                    f"[LANG-EXAMPLE] {json_file} | block {block_id} "
                    f"example {ex_idx + 1} "
                    f"missing {sorted(missing)}"
                )

            for lang, text in example.items():
                if lang not in LANGS:
                    continue

                if not isinstance(text, str) or not text.strip():
                    errors.append(
                        f"[EXAMPLE-EMPTY] {json_file} | "
                        f"block {block_id} example {ex_idx + 1} "
                        f"[{lang}] 값이 비어 있거나 문자열이 아닙니다: "
                        f"{text!r}"
                    )


############################################################
# review.py 등에서 개별 데이터 검증 시 사용하는 함수
############################################################

def run_checker_validation(data, json_file):
    global errors
    errors = []

    check_data(data, Path(json_file))

    return errors


############################################################
# 전체 배치 검사
############################################################

def main():
    global errors
    errors = []

    for i in range(BATCH_START, BATCH_END + 1):
        batch_id = f"{i:03d}"
        batch_dir = ROOT / batch_id

        if not batch_dir.is_dir():
            errors.append(f"[MISSING DIR] {batch_dir}")
            continue

        json_file = batch_dir / "data.json"

        if not json_file.is_file():
            errors.append(f"[MISSING FILE] {json_file}")
            continue

        try:
            with json_file.open("r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            errors.append(f"[JSON ERROR] {json_file}: {e}")
            continue

        check_data(data, json_file)

    if errors:
        print("=" * 80)
        print(f"ERRORS : {len(errors)}")
        print("=" * 80)

        for error in errors:
            print(error)
    else:
        print(
            f"✅ 모든 파일 통과 "
            f"({BATCH_START:03d}~{BATCH_END:03d})"
        )


if __name__ == "__main__":
    main()