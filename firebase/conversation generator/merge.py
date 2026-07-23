#!/usr/bin/env python3
"""merge.py — test copy"""
import argparse
import json
import sys
from pathlib import Path

ALL_LANGS = ["target", "en", "es", "fr", "pt", "kr", "jp", "zh"]
TEMPLATE_LANGS = ["target", "en", "es", "fr", "pt", "kr", "jp", "zh"]
SPEAKER_ORDER = ["A", "B", "A", "B", "A", "B"]
EXPECTED_SET_COUNT = 10
EXPECTED_LINES_PER_SET = 6


def empty_sentences(filled_lang, text):
    d = {lang: "" for lang in TEMPLATE_LANGS}
    d[filled_lang] = text
    return d


def validate_sets(sets, lang):
    if len(sets) != EXPECTED_SET_COUNT:
        raise ValueError(f"[{lang}] set count error: {len(sets)}")
    for set_id, lines in sets.items():
        if len(lines) != EXPECTED_LINES_PER_SET:
            raise ValueError(f"[{lang}] line count error at {set_id}")
        for i, line in enumerate(lines):
            if not str(line).strip():
                raise ValueError(f"[{lang}] empty line at {set_id} idx {i}")


def build_target(compact):
    sets = compact["sets"]
    validate_sets(sets, "target")
    if "level" not in compact:
        raise ValueError("level required for target")
    blocks = []
    for set_id in sorted(sets.keys()):
        lines = sets[set_id]
        block_lines = [
            {"speaker": speaker, "sentences": empty_sentences("target", sentence)}
            for speaker, sentence in zip(SPEAKER_ORDER, lines)
        ]
        blocks.append({"set_id": set_id, "lines": block_lines})
    return {
        "meta": {"series": "conversation", "level": compact["level"], "id": compact["id"]},
        "title": empty_sentences("target", compact["title"]),
        "blocks": blocks,
    }


def fill_translation(base, compact, lang):
    sets = compact["sets"]
    validate_sets(sets, lang)
    base_set_ids = {b["set_id"] for b in base["blocks"]}
    compact_set_ids = set(sets.keys())
    if base_set_ids != compact_set_ids:
        raise ValueError(f"[{lang}] set_id mismatch")
    base["title"][lang] = compact["title"]
    for block in base["blocks"]:
        set_id = block["set_id"]
        lang_lines = sets[set_id]
        for line, text in zip(block["lines"], lang_lines):
            line["sentences"][lang] = text
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
        base["title"][args.lang] = base["title"]["target"]
        for block in base["blocks"]:
            for line in block["lines"]:
                line["sentences"][args.lang] = line["sentences"]["target"]
        out_path = Path(args.out) if args.out else base_path.parent / f"{base['meta']['id']}-{args.lang}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(base, f, ensure_ascii=False, indent=2)
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
        default_out = f"{compact['id']}-{args.lang}.json"

    out_path = Path(args.out) if args.out else compact_path.parent / default_out
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"OK [{args.lang}]: {out_path}")


if __name__ == "__main__":
    main()