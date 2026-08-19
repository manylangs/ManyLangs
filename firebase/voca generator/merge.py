#!/usr/bin/env python3
"""
merge.py — 보카(vocabulary) 프로젝트용 병합 스크립트.

병합 원칙:
- 병합기는 번역 내용의 의미·품질을 검사하지 않는다.
- core와 meaning_zone[0]의 일치 여부를 검사하지 않는다.
- 언어마다 meaning_zone의 내용과 개수가 달라도 그대로 병합한다.
- 블록 5개, block id·순서, 예문 3개, 언어 키 존재 여부만 확인한다.
- 검수는 별도의 voca_checker.py와 검수 프롬프트에서 수행한다.
"""

import argparse
import json
import sys
from pathlib import Path


ALL_LANGS = [
    "target",
    "en",
    "es",
    "fr",
    "pt",
    "kr",
    "jp",
    "zh",
]

TRANSLATE_LANGS = [
    "en",
    "es",
    "fr",
    "pt",
    "kr",
    "jp",
    "zh",
]

EXPECTED_BLOCK_COUNT = 5
EXPECTED_EXAMPLES_PER_BLOCK = 3


def empty_word():
    return {
        "core": "",
        "meaning_zone": [],
    }


def validate_blocks(blocks, lang, need_word=True):
    """
    병합에 필요한 최소 구조만 검사한다.

    검사:
    - blocks가 배열인가
    - 블록이 정확히 5개인가
    - 각 블록에 id가 있는가
    - word.<lang>이 존재하는가
    - examples가 배열이고 정확히 3개인가
    - 각 example에 해당 언어 키가 존재하는가

    검사하지 않음:
    - core 빈값 여부
    - meaning_zone 빈값 여부
    - meaning_zone 개수
    - meaning_zone[0] == core
    - 번역의 의미 및 자연스러움
    """

    if not isinstance(blocks, list):
        raise ValueError(
            f"[{lang}] blocks가 배열이 아닙니다."
        )

    if len(blocks) != EXPECTED_BLOCK_COUNT:
        raise ValueError(
            f"[{lang}] block count error: "
            f"{len(blocks)} "
            f"(expected {EXPECTED_BLOCK_COUNT})"
        )

    for index, block in enumerate(blocks, start=1):
        if not isinstance(block, dict):
            raise ValueError(
                f"[{lang}] block {index}가 객체가 아닙니다."
            )

        block_id = block.get("id")

        if not isinstance(block_id, str) or not block_id:
            raise ValueError(
                f"[{lang}] block {index}: id가 없습니다."
            )

        if need_word:
            word = block.get("word")

            if not isinstance(word, dict):
                raise ValueError(
                    f"[{lang}] {block_id}: word가 객체가 아닙니다."
                )

            if lang not in word:
                raise ValueError(
                    f"[{lang}] {block_id}: word.{lang}이 없습니다."
                )

            if not isinstance(word[lang], dict):
                raise ValueError(
                    f"[{lang}] {block_id}: "
                    f"word.{lang}이 객체가 아닙니다."
                )

        examples = block.get("examples")

        if not isinstance(examples, list):
            raise ValueError(
                f"[{lang}] {block_id}: "
                f"examples가 배열이 아닙니다."
            )

        if len(examples) != EXPECTED_EXAMPLES_PER_BLOCK:
            raise ValueError(
                f"[{lang}] {block_id}: "
                f"example count error: {len(examples)} "
                f"(expected {EXPECTED_EXAMPLES_PER_BLOCK})"
            )

        for example_index, example in enumerate(examples):
            if not isinstance(example, dict):
                raise ValueError(
                    f"[{lang}] {block_id}: "
                    f"examples[{example_index}]가 객체가 아닙니다."
                )

            if lang not in example:
                raise ValueError(
                    f"[{lang}] {block_id}: "
                    f"examples[{example_index}].{lang}이 없습니다."
                )


def build_target(compact):
    """
    target compact를 표준 통합 JSON 구조로 변환한다.

    target만 채우고 en/es/fr/pt/kr/jp/zh는 빈 슬롯으로 만든다.
    각 언어 compact는 이후 fill_translation()에서 병합된다.
    """

    blocks_in = compact.get("blocks")

    validate_blocks(
        blocks_in,
        "target",
        need_word=True,
    )

    meta = compact.get("meta")

    if not isinstance(meta, dict):
        raise ValueError(
            "[target] meta가 객체가 아닙니다."
        )

    level = meta.get("level")
    batch_id = meta.get("id")

    if not isinstance(level, str) or not level:
        raise ValueError(
            "[target] meta.level이 없습니다."
        )

    if not isinstance(batch_id, str) or not batch_id:
        raise ValueError(
            "[target] meta.id가 없습니다."
        )

    compact_title = compact.get("title")

    if not isinstance(compact_title, dict):
        raise ValueError(
            "[target] title이 객체가 아닙니다."
        )

    if "target" not in compact_title:
        raise ValueError(
            "[target] title.target이 없습니다."
        )

    title = {
        lang: ""
        for lang in ALL_LANGS
    }
    title["target"] = compact_title["target"]

    blocks = []

    for source_block in blocks_in:
        word = {
            lang: empty_word()
            for lang in ALL_LANGS
        }

        word["target"] = source_block["word"]["target"]

        examples = []

        for source_example in source_block["examples"]:
            example_row = {
                lang: ""
                for lang in ALL_LANGS
            }

            example_row["target"] = source_example["target"]
            examples.append(example_row)

        blocks.append(
            {
                "id": source_block["id"],
                "word": word,
                "examples": examples,
            }
        )

    return {
        "meta": {
            "series": "vocabulary",
            "level": level,
            "id": batch_id,
        },
        "title": title,
        "blocks": blocks,
    }


def fill_translation(base, compact, lang):
    """
    compact의 언어 데이터를 동일한 block id와 예문 위치에 병합한다.

    core와 meaning_zone의 내용은 검사하거나 변경하지 않고
    compact에 들어 있는 객체를 그대로 삽입한다.
    """

    if lang not in TRANSLATE_LANGS:
        raise ValueError(
            f"fill_translation not applicable to lang={lang}"
        )

    compact_blocks = compact.get("blocks")

    validate_blocks(
        compact_blocks,
        lang,
        need_word=True,
    )

    base_blocks = base.get("blocks")

    if not isinstance(base_blocks, list):
        raise ValueError(
            f"[{lang}] base.blocks가 배열이 아닙니다."
        )

    if len(base_blocks) != EXPECTED_BLOCK_COUNT:
        raise ValueError(
            f"[{lang}] base block count error: "
            f"{len(base_blocks)} "
            f"(expected {EXPECTED_BLOCK_COUNT})"
        )

    base_ids = [
        block.get("id")
        for block in base_blocks
    ]

    compact_ids = [
        block.get("id")
        for block in compact_blocks
    ]

    if base_ids != compact_ids:
        raise ValueError(
            f"[{lang}] block id mismatch/order: "
            f"{base_ids} vs {compact_ids}"
        )

    compact_by_id = {
        block["id"]: block
        for block in compact_blocks
    }

    for base_block in base_blocks:
        block_id = base_block["id"]
        source_block = compact_by_id[block_id]

        if "word" not in base_block:
            base_block["word"] = {}

        base_block["word"][lang] = source_block["word"][lang]

        base_examples = base_block.get("examples")

        if not isinstance(base_examples, list):
            raise ValueError(
                f"[{lang}] {block_id}: "
                f"base examples가 배열이 아닙니다."
            )

        if len(base_examples) != EXPECTED_EXAMPLES_PER_BLOCK:
            raise ValueError(
                f"[{lang}] {block_id}: "
                f"base example count error: "
                f"{len(base_examples)}"
            )

        for index, base_example in enumerate(base_examples):
            base_example[lang] = (
                source_block["examples"][index][lang]
            )

    if "title" not in base or not isinstance(base["title"], dict):
        base["title"] = {
            language: ""
            for language in ALL_LANGS
        }

    if not str(base["title"].get(lang, "")).strip():
        base["title"][lang] = base["title"].get(
            "target",
            "",
        )

    return base


def mirror_lang(base, lang):
    """
    target 내용을 지정 언어에 그대로 복사한다.
    target 언어와 학습 언어가 같은 경우에 사용한다.
    """

    if lang == "target":
        raise ValueError(
            "mirror not for target"
        )

    if "title" not in base or not isinstance(base["title"], dict):
        raise ValueError(
            "base.title이 객체가 아닙니다."
        )

    base["title"][lang] = base["title"]["target"]

    for block in base["blocks"]:
        block["word"][lang] = block["word"]["target"]

        for example in block["examples"]:
            example[lang] = example["target"]

    return base


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "lang",
        choices=ALL_LANGS,
    )

    parser.add_argument(
        "compact_file",
        nargs="?",
        default=None,
    )

    parser.add_argument("--base")
    parser.add_argument("--out")
    parser.add_argument(
        "--mirror",
        action="store_true",
    )

    args = parser.parse_args()

    compact_path = (
        Path(args.compact_file)
        if args.compact_file
        else None
    )

    if args.mirror:
        if args.lang == "target":
            print("mirror not for target")
            sys.exit(1)

        if not args.base:
            print("base required")
            sys.exit(1)

        base_path = Path(args.base)

        with base_path.open(
            "r",
            encoding="utf-8",
        ) as file:
            base = json.load(file)

        result = mirror_lang(
            base,
            args.lang,
        )

        out_path = (
            Path(args.out)
            if args.out
            else base_path.parent
            / f"{base['meta']['id']}-{args.lang}.json"
        )

        with out_path.open(
            "w",
            encoding="utf-8",
        ) as file:
            json.dump(
                result,
                file,
                ensure_ascii=False,
                indent=2,
            )
            file.write("\n")

        print(
            f"OK [{args.lang}] (mirror): {out_path}"
        )
        return

    if compact_path is None:
        print("compact_file required")
        sys.exit(1)

    with compact_path.open(
        "r",
        encoding="utf-8",
    ) as file:
        compact = json.load(file)

    if args.lang == "target":
        result = build_target(compact)

        default_name = (
            f"{compact['meta']['id']}-target.json"
        )

    else:
        if not args.base:
            print("base required")
            sys.exit(1)

        base_path = Path(args.base)

        with base_path.open(
            "r",
            encoding="utf-8",
        ) as file:
            base = json.load(file)

        result = fill_translation(
            base,
            compact,
            args.lang,
        )

        default_name = (
            f"{compact.get('id', base['meta']['id'])}"
            f"-{args.lang}.json"
        )

    out_path = (
        Path(args.out)
        if args.out
        else compact_path.parent / default_name
    )

    with out_path.open(
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            result,
            file,
            ensure_ascii=False,
            indent=2,
        )
        file.write("\n")

    print(
        f"OK [{args.lang}]: {out_path}"
    )


if __name__ == "__main__":
    main()