#!/usr/bin/env python3
"""
merge.py — 이디엄(IDIOM) 시리즈 전용 병합 스크립트

conversation 시리즈의 merge.py(title + sets 구조)와 달리, 이디엄 시리즈는
frequency_rank로 식별되는 5개 이디엄 블록(expression/explanation/examples)을 다룬다.

핵심 설계 (10_KR_IDIOM_TARGET_GENERATOR.md 및 11~17번 TRANSLATOR류와 반드시 일치해야 함):
- expression 필드는 target 하나만 존재한다. 다른 언어 키를 추가하지 않는다.
- explanation, examples는 8개 언어(target/en/es/fr/pt/kr/zh/jp) 전체를 갖는다.
- title은 배치마다 달라지는 것이 아니라 시리즈 전체에 고정된 값이다(IDIOM_TITLE 상수).
- en은 target에서 직접 번역되고, es/fr/pt/zh/jp는 en에서 번역되며, kr은 target이 한국어인
  현재 파이프라인에서는 미러(mirror)이다. 이 우선순위는 merge.py가 강제하지 않고 각 TRANSLATOR
  문서가 지키지만, --mirror 옵션은 대상 언어를 target과 동일하게 복사하는 기능을 제공한다.

사용법 예:
  python3 merge.py target 001-target.compact.json
  python3 merge.py en     001-en.compact.json     --base 001.runtime.json
  python3 merge.py es     001-es.compact.json     --base 001.runtime.json
  python3 merge.py kr --mirror --base 001.runtime.json
"""
import argparse
import json
import sys
from pathlib import Path

ALL_LANGS = ["target", "en", "es", "fr", "pt", "kr", "zh", "jp"]
EXPECTED_IDIOM_COUNT = 5
EXPECTED_EXAMPLE_COUNT = 5
FUNCTION_ORDER = [
    "basic_meaning",
    "situational_application",
    "extended_meaning",
    "natural_spoken_example",
    "learner_friendly_simple",
]

# 시리즈 전체에 고정된 제목 (배치마다 달라지지 않음)
IDIOM_TITLE = {
    "target": "한국어 관용어",
    "kr": "한국어 관용어",
    "en": "Korean Idioms",
    "es": "Modismos Coreanos",
    "fr": "Expressions Idiomatiques Coréennes",
    "pt": "Expressões Idiomáticas Coreanas",
    "zh": "韩语惯用语",
    "jp": "韓国語の慣用句",
}


def empty_lang_dict(filled_lang, text):
    d = {lang: "" for lang in ALL_LANGS}
    d[filled_lang] = text
    return d


def validate_target_idioms(idioms):
    if len(idioms) != EXPECTED_IDIOM_COUNT:
        raise ValueError(f"[target] idiom count error: {len(idioms)} (expected {EXPECTED_IDIOM_COUNT})")
    seen_ranks = set()
    for idiom in idioms:
        for key in ("frequency_rank", "frequency_stars", "expression", "explanation", "examples"):
            if key not in idiom:
                raise ValueError(f"[target] missing key '{key}' in idiom: {idiom}")
        rank = idiom["frequency_rank"]
        if rank in seen_ranks:
            raise ValueError(f"[target] duplicate frequency_rank: {rank}")
        seen_ranks.add(rank)
        examples = idiom["examples"]
        if len(examples) != EXPECTED_EXAMPLE_COUNT:
            raise ValueError(f"[target] rank {rank}: example count error: {len(examples)}")
        for ex, expected_fn in zip(examples, FUNCTION_ORDER):
            if ex.get("function") != expected_fn:
                raise ValueError(
                    f"[target] rank {rank}: function tag order error "
                    f"(expected {expected_fn}, got {ex.get('function')})"
                )
            if not str(ex.get("text", "")).strip():
                raise ValueError(f"[target] rank {rank}: empty example text ({expected_fn})")
        if not str(idiom["expression"]).strip():
            raise ValueError(f"[target] rank {rank}: empty expression")
        if not str(idiom["explanation"]).strip():
            raise ValueError(f"[target] rank {rank}: empty explanation")


def validate_translation_idioms(idioms, lang):
    if len(idioms) != EXPECTED_IDIOM_COUNT:
        raise ValueError(f"[{lang}] idiom count error: {len(idioms)} (expected {EXPECTED_IDIOM_COUNT})")
    seen_ranks = set()
    for idiom in idioms:
        if "frequency_rank" not in idiom:
            raise ValueError(f"[{lang}] missing frequency_rank in idiom: {idiom}")
        rank = idiom["frequency_rank"]
        if rank in seen_ranks:
            raise ValueError(f"[{lang}] duplicate frequency_rank: {rank}")
        seen_ranks.add(rank)
        if not str(idiom.get("explanation", "")).strip():
            raise ValueError(f"[{lang}] rank {rank}: empty explanation")
        examples = idiom.get("examples")
        if not isinstance(examples, list) or len(examples) != EXPECTED_EXAMPLE_COUNT:
            raise ValueError(f"[{lang}] rank {rank}: example count error: {examples}")
        for text in examples:
            if not str(text).strip():
                raise ValueError(f"[{lang}] rank {rank}: empty example text")


def build_target(compact):
    """10_KR_IDIOM_TARGET_GENERATOR.md의 출력(compact, lang='target')으로 base runtime json을 만든다."""
    idioms = compact["idioms"]
    validate_target_idioms(idioms)
    if "level" not in compact:
        raise ValueError("level required for target")

    blocks = []
    for idiom in sorted(idioms, key=lambda i: i["frequency_rank"]):
        examples_field = []
        for ex in idiom["examples"]:
            examples_field.append({
                "function": ex["function"],
                **empty_lang_dict("target", ex["text"]),
            })
        blocks.append({
            "type": "idiom",
            "frequency_rank": idiom["frequency_rank"],
            "frequency_stars": idiom["frequency_stars"],
            # expression은 target 하나만 존재한다 (설계 원칙, 절대 다른 언어 키를 추가하지 않음)
            "expression": {"target": idiom["expression"]},
            "explanation": empty_lang_dict("target", idiom["explanation"]),
            "examples": examples_field,
        })

    return {
        "meta": {"series": "idiom", "level": compact["level"], "id": compact["id"]},
        "title": dict(IDIOM_TITLE),
        "blocks": blocks,
    }


def fill_translation(base, compact, lang):
    """
    11~17번 IDIOM TRANSLATOR류의 출력(compact, lang=en/es/fr/pt/kr/zh/jp)을
    frequency_rank를 키로 base에 병합한다.

    compact 구조: {"id":.., "lang":lang, "idioms":[{"frequency_rank":N, "explanation":"...",
                   "examples":["...", "...", "...", "...", "..."]}, ...]}
    examples는 FUNCTION_ORDER 순서로 5개 문자열만 담겨 있다 (function 키 없음, 위치로 판별).
    """
    idioms = compact["idioms"]
    validate_translation_idioms(idioms, lang)

    idiom_map = {i["frequency_rank"]: i for i in idioms}
    base_ranks = {b["frequency_rank"] for b in base["blocks"]}
    compact_ranks = set(idiom_map.keys())
    if base_ranks != compact_ranks:
        raise ValueError(f"[{lang}] frequency_rank mismatch: base={sorted(base_ranks)} compact={sorted(compact_ranks)}")

    for block in base["blocks"]:
        rank = block["frequency_rank"]
        c = idiom_map[rank]
        block["explanation"][lang] = c["explanation"]
        for ex_block, text in zip(block["examples"], c["examples"]):
            ex_block[lang] = text

    base["title"][lang] = IDIOM_TITLE[lang]
    return base


def mirror_lang(base, lang):
    """target 값을 lang 컬럼에 그대로 복사한다 (예: target이 한국어일 때 kr)."""
    if lang == "target":
        raise ValueError("mirror not applicable to target")
    base["title"][lang] = base["title"]["target"]
    for block in base["blocks"]:
        block["explanation"][lang] = block["explanation"]["target"]
        for ex_block in block["examples"]:
            ex_block[lang] = ex_block["target"]
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
        out_path = Path(args.out) if args.out else base_path.parent / f"idiom_{base['meta']['id']}.runtime.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
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
        default_out = f"idiom_{compact['id']}.runtime.json"

    out_path = Path(args.out) if args.out else compact_path.parent / default_out
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"OK [{args.lang}]: {out_path}")


if __name__ == "__main__":
    main()
