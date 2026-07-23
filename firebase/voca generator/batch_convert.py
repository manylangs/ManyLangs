#!/usr/bin/env python3
"""
batch_convert.py — 보카(vocabulary) 프로젝트용 일회성 변환 스크립트.
(컨버세이션 프로젝트 batch_convert.py를 보카 스키마에 맞게 재작성한 버전)

컨버세이션 스키마와의 핵심 차이:
  - conversation: set_id / lines[].speaker / lines[].sentences[lang]  (문장 텍스트만 언어별로 존재)
  - vocabulary  : block.id / word.<lang>.{core, meaning_zone} / examples[].<lang>
                  → 언어별로 "단어(core+meaning_zone)"와 "예문 텍스트" 둘 다 존재한다는 점이 다름.
  - vocabulary는 target(영어) 산출물(Manual A 결과물, "<id>-target.compact.json")에
    이미 target/en이 함께 채워져 있으므로, conversation처럼 en을 별도 mirror/merge
    단계로 다시 채울 필요가 없음 (en은 Manual A 단계에서 이미 완성).

data/<id>/ 폴더 구조를 순회하며:
1) <id>.runtime.json (여러 언어가 병합된 완성 스키마)이 존재하면
   → 그 안에서 특정 언어(lang)의 word/examples 값만 뽑아
     <id>-<lang>.compact.json 형태로 역추출 (라운드트립 검증/재작업용)
2) <id>-target.compact.json (Manual A 결과물, target+en 포함)이 존재하면
   → <id>.runtime.json 이 아직 없을 때 표준 base 이름으로 승격
     (이미 완성본이 있으면 건드리지 않음)

사용법:
  python3 batch_convert.py /path/to/data
  python3 batch_convert.py /path/to/data --extract-lang es   # 특정 언어만 역추출

[수정 이력]
  - runtime_path 파일명을 "conversation_<id>.runtime.json"에서 "<id>.runtime.json"으로
    변경. run_merge.sh가 실제로 만들어내는 base 파일명("${BATCH_ID}.runtime.json")과
    일치하지 않아, run_merge.sh로 병합을 마친 뒤 이 스크립트를 돌리면 기존 결과물을
    찾지 못하고 역추출을 건너뛰거나 중복 파일을 새로 만들어버리는 문제가 있었음.
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
    if lang in ("target", "en"):
        compact["title"] = base["title"][lang]
    if lang == "target":
        compact["level"] = base["meta"]["level"]

    out_path = runtime_path.parent / f"{base['meta']['id']}-{lang}.compact.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(compact, f, ensure_ascii=False, indent=2)
    return out_path


def promote_to_base(target_compact_path: Path, base_out: Path):
    """Manual A 결과물(target+en 포함)을 표준 runtime base 파일명으로 승격 복사.
    나머지 언어(es/fr/pt/kr/jp/zh) 슬롯은 빈 문자열/빈 배열로 초기화해 merge.py가
    이후 채워 넣을 수 있게 해 둔다."""
    with open(target_compact_path, encoding="utf-8") as f:
        compact = json.load(f)

    if len(compact["blocks"]) != EXPECTED_BLOCK_COUNT:
        raise ValueError(f"block 개수 이상: {len(compact['blocks'])}")

    title = {lang: compact["title"].get(lang, "") for lang in ALL_LANGS}
    title["target"] = compact["title"]["target"]
    title["en"] = compact["title"]["en"]

    blocks = []
    for block in compact["blocks"]:
        word = {lang: block["word"].get(lang, {"core": "", "meaning_zone": []}) for lang in ALL_LANGS}
        word["target"] = block["word"]["target"]
        word["en"] = block["word"]["en"]

        if len(block["examples"]) != EXPECTED_EXAMPLES_PER_BLOCK:
            raise ValueError(f"{block['id']}: example 개수 이상")
        examples = []
        for ex in block["examples"]:
            row = {lang: ex.get(lang, "") for lang in ALL_LANGS}
            row["target"] = ex["target"]
            row["en"] = ex["en"]
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
