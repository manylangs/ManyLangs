#!/usr/bin/env python3
"""
batch_convert.py — 보카(vocabulary) 프로젝트용 일회성 변환 스크립트. (v2 - en 특별취급 제거)

수정 사유:
  이전 버전은 "<id>-target.compact.json"에 target/en이 함께 채워져
  나온다고 가정해 promote_to_base에서 en을 target과 같이 승격 복사했다.
  하지만 번역 프롬프트(en 포함 7개 전부)가 전부 "target → 각 언어" 직접
  번역이고, en도 다른 6개 언어와 동급으로 취급되어야 하므로, Manual A
  산출물에는 이제 target만 들어있다고 가정한다. en 포함 나머지 7개 언어
  슬롯은 전부 빈 값으로 초기화해 merge.py가 채울 수 있게 한다.

컨버세이션 스키마와의 핵심 차이(변경 없음):
  - conversation: set_id / lines[].speaker / lines[].sentences[lang]
  - vocabulary  : block.id / word.<lang>.{core, meaning_zone} / examples[].<lang>

data/<id>/ 폴더 구조를 순회하며:
1) <id>.runtime.json (여러 언어가 병합된 완성 스키마)이 존재하면
   → 그 안에서 특정 언어(lang)의 word/examples 값만 뽑아
     <id>-<lang>.compact.json 형태로 역추출 (라운드트립 검증/재작업용)
2) <id>-target.compact.json (Manual A 결과물, target만 포함)이 존재하면
   → <id>.runtime.json 이 아직 없을 때 표준 base 이름으로 승격
     (이미 완성본이 있으면 건드리지 않음)

사용법:
  python3 batch_convert.py /path/to/data
  python3 batch_convert.py /path/to/data --extract-lang es   # 특정 언어만 역추출

[수정 이력]
  - v2: promote_to_base가 compact["title"]["en"] / block["word"]["en"] 등을
    더이상 참조하지 않음 (Manual A 산출물이 en을 포함하지 않는 것을 전제).
    en 포함 7개 언어 슬롯 전부 빈 문자열/빈 배열로 초기화.
  - v1: runtime_path 파일명을 "conversation_<id>.runtime.json"에서
    "<id>.runtime.json"으로 변경 (run_merge.sh --out과 일치시킴).
"""
import argparse
import json
import sys
from pathlib import Path

ALL_LANGS = ["target", "en", "es", "fr", "pt", "kr", "jp", "zh"]
EXPECTED_BLOCK_COUNT = 5
EXPECTED_EXAMPLES_PER_BLOCK = 3


def extract_lang_compact(runtime_path: Path, lang: str) -> Path:
    """runtime(완성) json에서 word.<lang>/examples[].<lang> 값만 뽑아 언어별 compact로 역추출."""
    with open(runtime_path, encoding="utf-8") as f:
        base = json.load(f)

    blocks_out = []
    for block in base["blocks"]:
        word_val = block["word"].get(lang)
        if word_val is None:
            raise ValueError(f"block {block['id']}: word.{lang} 없음")
        examples_out = []
        for ex in block["examples"]:
            if lang not in ex or not str(ex[lang]).strip():
                raise ValueError(f"block {block['id']}: examples.{lang} 비어있음")
            examples_out.append({lang: ex[lang]})
        blocks_out.append({
            "id": block["id"],
            "word": {lang: word_val},
            "examples": examples_out,
        })

    compact = {
        "id": base["meta"]["id"],
        "lang": lang,
        "blocks": blocks_out,
    }
    if lang == "target":
        compact["title"] = base["title"][lang]
        compact["level"] = base["meta"]["level"]

    out_path = runtime_path.parent / f"{base['meta']['id']}-{lang}.compact.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(compact, f, ensure_ascii=False, indent=2)
    return out_path


def promote_to_base(target_compact_path: Path, base_out: Path):
    """Manual A 결과물(target만 포함)을 표준 runtime base 파일명으로 승격 복사.
    나머지 언어(en/es/fr/pt/kr/jp/zh) 슬롯은 빈 문자열/빈 배열로 초기화해 merge.py가
    이후 채워 넣을 수 있게 해 둔다."""
    with open(target_compact_path, encoding="utf-8") as f:
        compact = json.load(f)

    if len(compact["blocks"]) != EXPECTED_BLOCK_COUNT:
        raise ValueError(f"block 개수 이상: {len(compact['blocks'])}")

    title = {lang: "" for lang in ALL_LANGS}
    title["target"] = compact["title"]["target"]

    blocks = []
    for block in compact["blocks"]:
        word = {lang: {"core": "", "meaning_zone": []} for lang in ALL_LANGS}
        word["target"] = block["word"]["target"]

        if len(block["examples"]) != EXPECTED_EXAMPLES_PER_BLOCK:
            raise ValueError(f"{block['id']}: example 개수 이상")
        examples = []
        for ex in block["examples"]:
            row = {lang: "" for lang in ALL_LANGS}
            row["target"] = ex["target"]
            examples.append(row)

        blocks.append({"id": block["id"], "word": word, "examples": examples})

    result = {
        "meta": {
            "series": "vocabulary",
            "level": compact["meta"]["level"],
            "id": compact["meta"]["id"],
        },
        "title": title,
        "blocks": blocks,
    }
    with open(base_out, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("data_root", nargs="?", default=".")
    parser.add_argument("--extract-lang", help="runtime json에서 이 언어만 역추출 (기본: 전체 언어)")
    args = parser.parse_args()

    data_root = Path(args.data_root)
    if not data_root.exists():
        print(f"❌ 경로 없음: {data_root}")
        sys.exit(1)

    n_promoted = 0
    n_extracted = 0
    skipped = []

    for id_dir in sorted(data_root.iterdir()):
        if not id_dir.is_dir():
            continue
        cid = id_dir.name

        target_compact = id_dir / f"{cid}-target.compact.json"
        runtime_path = id_dir / f"{cid}.runtime.json"  # 표준 base 파일명 (run_merge.sh --out과 동일)

        # 1) target.compact.json → 표준 base로 승격 (없을 때만)
        if target_compact.exists() and not runtime_path.exists():
            try:
                promote_to_base(target_compact, runtime_path)
                n_promoted += 1
                print(f"[base]    {cid}: {target_compact.name} → {runtime_path.name}")
            except Exception as e:
                skipped.append((cid, "promote", str(e)))
        elif runtime_path.exists():
            print(f"[base]    {cid}: {runtime_path.name} 이미 존재, 건드리지 않음")
        else:
            skipped.append((cid, "promote", f"{target_compact.name} 없음"))

        # 2) 이미 완성된 runtime json이 있으면 언어별 역추출 (라운드트립 검증용)
        existing_runtime = runtime_path if runtime_path.exists() else None
        if existing_runtime:
            langs = [args.extract_lang] if args.extract_lang else ALL_LANGS
            for lang in langs:
                try:
                    out = extract_lang_compact(existing_runtime, lang)
                    n_extracted += 1
                    print(f"[extract] {cid}: {existing_runtime.name} → {out.name} [{lang}]")
                except Exception as e:
                    skipped.append((cid, f"extract:{lang}", str(e)))

    print()
    print(f"=== 완료: base 승격 {n_promoted}개, 언어 역추출 {n_extracted}개 ===")
    if skipped:
        print("건너뜀:")
        for cid, kind, reason in skipped:
            print(f"  {cid} ({kind}): {reason}")


if __name__ == "__main__":
    main()