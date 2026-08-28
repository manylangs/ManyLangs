#!/usr/bin/env python3
"""merge.py — grammar 파이프라인용 병합 스크립트.

compact.target.json + compact.{lang}.json (승격된 것만) 을 checker.py가
기대하는 17블록 runtime JSON(meta/title/blocks, blocks[].sentences)으로
합친다. 언어 목록은 languages.py 하나에서만 관리한다 (하드코딩 금지).
"""
import argparse
import json
import sys
from pathlib import Path

from languages import TRANSLATE_LANGS

ALL_LANGS = ["target"] + TRANSLATE_LANGS
EXPECTED_EXP = 5
EXPECTED_CORE = 4
EXPECTED_VAR = 4
EXPECTED_EXT = 4
EXPECTED_BLOCK_COUNT = EXPECTED_EXP + EXPECTED_CORE + EXPECTED_VAR + EXPECTED_EXT  # 17

GROUP_ORDER = [
    ("explanations", "grammar_explanation", None, EXPECTED_EXP),
    ("core_patterns", "grammar_example", "core_patterns", EXPECTED_CORE),
    ("variations", "grammar_example", "variations", EXPECTED_VAR),
    ("extended_usage", "grammar_example", "extended_usage", EXPECTED_EXT),
]


def empty_sentences(filled_lang, text):
    d = {lang: "" for lang in ALL_LANGS}
    d[filled_lang] = text
    return d


def validate_compact(compact, lang):
    for key, _btype, _variant, expected in GROUP_ORDER:
        values = compact.get(key)
        if not isinstance(values, list) or len(values) != expected:
            raise ValueError(f"[{lang}] {key} 개수 오류: {values if values is None else len(values)} "
                              f"(expected {expected})")
        for i, v in enumerate(values):
            if not isinstance(v, str) or not v.strip():
                raise ValueError(f"[{lang}] {key}[{i}] 빈 문장")
    if not str(compact.get("title", "")).strip():
        raise ValueError(f"[{lang}] title 비어있음")


def build_target(compact):
    validate_compact(compact, "target")
    if "level" not in compact:
        raise ValueError("level required for target")
    if "id" not in compact:
        raise ValueError("id required for target")

    blocks = []
    for key, btype, variant, _expected in GROUP_ORDER:
        for text in compact[key]:
            block = {"type": btype}
            if variant is not None:
                block["variant"] = variant
            block["sentences"] = empty_sentences("target", text)
            blocks.append(block)

    assert len(blocks) == EXPECTED_BLOCK_COUNT

    return {
        "meta": {"series": "grammar", "level": compact["level"], "id": compact["id"]},
        "title": empty_sentences("target", compact["title"]),
        "blocks": blocks,
    }


def fill_translation(base, compact, lang):
    validate_compact(compact, lang)

    flat = []
    for key, _btype, _variant, _expected in GROUP_ORDER:
        flat.extend(compact[key])

    if len(flat) != len(base["blocks"]):
        raise ValueError(f"[{lang}] block count mismatch: {len(flat)} vs {len(base['blocks'])}")

    base["title"][lang] = compact["title"]
    for block, text in zip(base["blocks"], flat):
        block["sentences"][lang] = text
    return base


def mirror_lang(base, lang):
    """target 언어와 학습 언어가 같은 경우, target 내용을 그대로 복사한다."""
    if lang == "target":
        raise ValueError("mirror not for target")
    base["title"][lang] = base["title"]["target"]
    for block in base["blocks"]:
        block["sentences"][lang] = block["sentences"]["target"]
    return base


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("lang", choices=ALL_LANGS)
    parser.add_argument("compact_file", nargs="?", default=None)
    parser.add_argument("--base")
    parser.add_argument("--out")
    parser.add_argument("--mirror", action="store_true")
    args = parser.parse_args()

    compact_path = Path(args.compact_file) if args.compact_file else None

    if args.mirror:
        if args.lang == "target":
            print("mirror not for target"); sys.exit(1)
        if not args.base:
            print("base required"); sys.exit(1)
        base_path = Path(args.base)
        with open(base_path, "r", encoding="utf-8") as f:
            base = json.load(f)
        result = mirror_lang(base, args.lang)
        out_path = Path(args.out) if args.out else base_path.parent / f"{base['meta']['id']}-{args.lang}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(f"OK [{args.lang}] (mirror): {out_path}")
        return

    if compact_path is None:
        print("compact_file required"); sys.exit(1)
    with open(compact_path, "r", encoding="utf-8") as f:
        compact = json.load(f)

    if args.lang == "target":
        result = build_target(compact)
        default_out = f"{compact['id']}-target.json"
    else:
        if not args.base:
            print("base required"); sys.exit(1)
        base_path = Path(args.base)
        with open(base_path, "r", encoding="utf-8") as f:
            base = json.load(f)
        result = fill_translation(base, compact, args.lang)
        default_out = f"{compact.get('id', base['meta']['id'])}-{args.lang}.json"

    out_path = Path(args.out) if args.out else compact_path.parent / default_out
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"OK [{args.lang}]: {out_path}")


if __name__ == "__main__":
    main()
