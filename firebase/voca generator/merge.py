#!/usr/bin/env python3
"""merge.py — 보카(vocabulary) 프로젝트용 merge 스크립트.
(컨버세이션 프로젝트 merge.py를 보카 스키마에 맞게 재작성한 버전)

컨버세이션과의 핵심 차이:
  - target(=en) 단계에서 이미 target/en이 함께 채워진 base가 나온다 (Manual A 산출물
    "<id>-target.compact.json" 자체가 target+en 미러 포함). 따라서 conversation처럼
    en을 별도로 mirror/merge 하는 단계가 필요 없다 — build_target 한 번으로 끝.
  - 언어별로 채워야 하는 값이 "문장 텍스트"뿐 아니라 "word.core/meaning_zone"까지 있다.
  - block 5개 고정, block당 example 3개(평서/부정/의문) 고정. set_id/speaker 개념 없음.

번역 프롬프트(translation_prompt_common_*.md) 산출물은 다음 형태로 저장해서 사용한다
(이번 대화에서 실제로 만든 es/fr/pt/kr/jp/zh 출력과 동일한 구조에 id/lang 래퍼만 추가):

{
  "id": "001",
  "lang": "es",
  "blocks": [
    {
      "id": "block_001",
      "word": { "es": { "core": "", "meaning_zone": [""] } },
      "examples": [ { "es": "" }, { "es": "" }, { "es": "" } ]
    },
    ... block_002 ~ block_005
  ]
}

사용법:
  python3 merge.py target 001-target.compact.json --out 001.runtime.json
  python3 merge.py es 001-es.compact.json --base 001.runtime.json --out 001.runtime.json
  python3 merge.py es --mirror --base 001.runtime.json --out 001.runtime.json

[수정 이력]
  - fill_translation: title.<lang>이 항상 빈 문자열로 남던 버그 수정.
    번역 프롬프트가 title을 다루지 않으므로, 주석의 원래 의도대로
    target 제목을 그대로 복사해 채워 넣는다 (필요시 이후 별도 title 번역
    단계에서 덮어쓸 수 있음).
"""
import argparse
import json
import sys
from pathlib import Path

ALL_LANGS = ["target", "en", "es", "fr", "pt", "kr", "jp", "zh"]
EXPECTED_BLOCK_COUNT = 5
EXPECTED_EXAMPLES_PER_BLOCK = 3


def empty_word():
    return {"core": "", "meaning_zone": []}


def full_row(filled_lang, value):
    d = {lang: "" for lang in ALL_LANGS}
    d[filled_lang] = value
    return d


def validate_blocks(blocks, lang, need_word=True):
    if len(blocks) != EXPECTED_BLOCK_COUNT:
        raise ValueError(f"[{lang}] block count error: {len(blocks)} (expected {EXPECTED_BLOCK_COUNT})")
    for block in blocks:
        if need_word:
            w = block["word"].get(lang) if "word" in block else None
            if not w or not str(w.get("core", "")).strip():
                raise ValueError(f"[{lang}] {block['id']}: word.{lang}.core empty")
            mz = w.get("meaning_zone", [])
            if not (1 <= len(mz) <= 3):
                raise ValueError(f"[{lang}] {block['id']}: meaning_zone length {len(mz)} invalid")
            if mz[0] != w["core"]:
                raise ValueError(f"[{lang}] {block['id']}: meaning_zone[0] != core")
        exs = block["examples"]
        if len(exs) != EXPECTED_EXAMPLES_PER_BLOCK:
            raise ValueError(f"[{lang}] {block['id']}: example count error: {len(exs)}")
        for i, ex in enumerate(exs):
            if not str(ex.get(lang, "")).strip():
                raise ValueError(f"[{lang}] {block['id']}: examples[{i}].{lang} empty")


def build_target(compact):
    """Manual A 산출물(target+en 이미 포함)을 표준 runtime base로 변환.
    나머지 6개 언어 슬롯은 빈 값으로 초기화해 이후 merge 단계가 채울 수 있게 한다."""
    blocks_in = compact["blocks"]
    if len(blocks_in) != EXPECTED_BLOCK_COUNT:
        raise ValueError(f"block count error: {len(blocks_in)}")

    title = {lang: "" for lang in ALL_LANGS}
    title["target"] = compact["title"]["target"]
    title["en"] = compact["title"]["en"]

    blocks = []
    for b in blocks_in:
        if len(b["examples"]) != EXPECTED_EXAMPLES_PER_BLOCK:
            raise ValueError(f"{b['id']}: example count error")
        word = {lang: empty_word() for lang in ALL_LANGS}
        word["target"] = b["word"]["target"]
        word["en"] = b["word"]["en"]

        examples = []
        for ex in b["examples"]:
            row = {lang: "" for lang in ALL_LANGS}
            row["target"] = ex["target"]
            row["en"] = ex["en"]
            examples.append(row)

        blocks.append({"id": b["id"], "word": word, "examples": examples})

    return {
        "meta": {"series": "vocabulary", "level": compact["meta"]["level"], "id": compact["meta"]["id"]},
        "title": title,
        "blocks": blocks,
    }


def fill_translation(base, compact, lang):
    validate_blocks(compact["blocks"], lang, need_word=True)
    base_ids = [b["id"] for b in base["blocks"]]
    compact_ids = [b["id"] for b in compact["blocks"]]
    if base_ids != compact_ids:
        raise ValueError(f"[{lang}] block id mismatch/order: {base_ids} vs {compact_ids}")

    by_id = {b["id"]: b for b in compact["blocks"]}
    for block in base["blocks"]:
        src = by_id[block["id"]]
        block["word"][lang] = src["word"][lang]
        for i, ex in enumerate(block["examples"]):
            ex[lang] = src["examples"][i][lang]

    # title.<lang>은 번역 프롬프트가 다루지 않는다(단어/예문만 규정).
    # 이미 다른 값이 채워져 있지 않다면(=아직 title 번역 단계를 안 거쳤다면)
    # target 제목을 그대로 복사해 최소한 빈 문자열로 남지 않게 한다.
    # 별도 title 번역 단계를 나중에 돌리면 이 값을 덮어쓰면 된다.
    if not str(base["title"].get(lang, "")).strip():
        base["title"][lang] = base["title"]["target"]

    return base


def mirror_lang(base, lang):
    if lang == "target":
        raise ValueError("mirror not for target")
    base["title"][lang] = base["title"]["target"]
    for block in base["blocks"]:
        block["word"][lang] = block["word"]["target"]
        for ex in block["examples"]:
            ex[lang] = ex["target"]
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
        print(f"OK [{args.lang}] (mirror): {out_path}")
        return

    if compact_path is None:
        print("compact_file required"); sys.exit(1)
    with open(compact_path, "r", encoding="utf-8") as f:
        compact = json.load(f)

    if args.lang == "target":
        result = build_target(compact)
        # default_out은 --out이 없을 때만 필요하므로 여기서 지연 계산한다.
        default_out = lambda: f"{compact['meta']['id']}-target.json"
    else:
        if not args.base:
            print("base required"); sys.exit(1)
        base_path = Path(args.base)
        with open(base_path, "r", encoding="utf-8") as f:
            base = json.load(f)
        result = fill_translation(base, compact, args.lang)
        # compact 파일에 최상위 "id" 키가 없을 수 있으므로(번역 프롬프트 산출물이
        # 문서 예시와 달리 id를 생략하는 경우) base의 id를 대체값으로 사용한다.
        # --out을 지정한 경우 이 값은 애초에 쓰이지 않으므로 여기서 죽지 않도록
        # KeyError 대신 .get()으로 안전하게 처리한다.
        default_out = lambda: f"{compact.get('id', base['meta']['id'])}-{args.lang}.json"

    out_path = Path(args.out) if args.out else compact_path.parent / default_out()
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"OK [{args.lang}]: {out_path}")


if __name__ == "__main__":
    main()