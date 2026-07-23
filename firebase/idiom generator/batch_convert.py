#!/usr/bin/env python3
"""
batch_convert.py — 이디엄(IDIOM) 시리즈 전용 일회성 변환 스크립트.

data/<id>/ 폴더 구조를 순회하며:
1) <id>-target.json (전체 스키마, 이미 병합된 것)이 있으면 → <id>-target.compact.json 추출
   (재작업 시 번역기 md에 입력할 압축본을 다시 뽑아내기 위함)
2) 각 언어(en/es/fr/pt/kr/zh/jp)가 채워진 <id>-<lang>.json이 있으면 → <id>-<lang>.compact.json 추출
   (라운드트립 검증용)
3) 완성된 최종본이 있으면 → idiom_<id>.runtime.json으로 표준 이름 통일 (이미 있으면 건드리지 않음)

conversation 시리즈의 batch_convert.py와 다른 점: title/sets(6줄×10세트) 구조가 아니라
idioms[].{frequency_rank, expression, explanation, examples[5]} 구조를 다룬다.
expression은 target 하나뿐이므로 추출 대상에서 제외한다 (다른 언어로 확장되지 않음).

사용법:
  python3 batch_convert.py /path/to/data
"""
import json
import sys
from pathlib import Path

FUNCTION_ORDER = [
    "basic_meaning",
    "situational_application",
    "extended_meaning",
    "natural_spoken_example",
    "learner_friendly_simple",
]


def extract_compact(full_json_path: Path, lang: str) -> Path:
    """full_json_path(전체 스키마)에서 explanation.<lang>/examples[].<lang>만 뽑아 압축 스키마로 추출."""
    with open(full_json_path, encoding="utf-8") as f:
        base = json.load(f)

    idioms = []
    for block in base["blocks"]:
        entry = {
            "frequency_rank": block["frequency_rank"],
            "explanation": block["explanation"][lang],
        }
        if lang == "target":
            entry["frequency_stars"] = block["frequency_stars"]
            entry["expression"] = block["expression"]["target"]
            entry["examples"] = [
                {"function": ex["function"], "text": ex[lang]} for ex in block["examples"]
            ]
        else:
            # function 순서대로 텍스트만 나열 (기존 순서를 FUNCTION_ORDER로 재정렬해 안전하게 뽑는다)
            by_fn = {ex["function"]: ex[lang] for ex in block["examples"]}
            entry["examples"] = [by_fn[fn] for fn in FUNCTION_ORDER]
        idioms.append(entry)

    compact = {
        "id": base["meta"]["id"],
        "lang": lang,
        "idioms": idioms,
    }
    if lang == "target":
        compact["level"] = base["meta"]["level"]

    out_path = full_json_path.parent / f"{base['meta']['id']}-{lang}.compact.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(compact, f, ensure_ascii=False, indent=2)
    return out_path


def main():
    data_root = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    if not data_root.exists():
        print(f"❌ 경로 없음: {data_root}")
        sys.exit(1)

    n_target = 0
    n_lang = 0
    n_base = 0
    skipped = []

    for id_dir in sorted(data_root.iterdir()):
        if not id_dir.is_dir():
            continue
        cid = id_dir.name

        target_path = id_dir / f"{cid}-target.json"
        base_out = id_dir / f"idiom_{cid}.runtime.json"

        # 1) target → compact 추출
        if target_path.exists():
            try:
                out = extract_compact(target_path, "target")
                n_target += 1
                print(f"[target] {cid}: {target_path.name} → {out.name}")
            except Exception as e:
                skipped.append((cid, "target", str(e)))
        else:
            skipped.append((cid, "target", "파일 없음"))

        # 2) 각 언어 → compact 추출 (라운드트립 검증용)
        for lang in ["en", "es", "fr", "pt", "kr", "zh", "jp"]:
            lang_path = id_dir / f"{cid}-{lang}.json"
            if lang_path.exists():
                try:
                    out = extract_compact(lang_path, lang)
                    n_lang += 1
                    print(f"[{lang}]     {cid}: {lang_path.name} → {out.name}")
                except Exception as e:
                    skipped.append((cid, lang, str(e)))

        # 3) 가장 완성도 높은 언어 파일(en 우선)이 있으면 표준 base로 지정
        source_for_base = id_dir / f"{cid}-en.json"
        if source_for_base.exists() and not base_out.exists():
            with open(source_for_base, encoding="utf-8") as f:
                data = json.load(f)
            with open(base_out, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            n_base += 1
            print(f"[base]   {cid}: {source_for_base.name} → {base_out.name}")
        elif base_out.exists():
            print(f"[base]   {cid}: {base_out.name} 이미 존재, 건드리지 않음")

    print()
    print(f"=== 완료: target 압축 {n_target}개, 언어별 압축 {n_lang}개, base 표준화 {n_base}개 ===")
    if skipped:
        print("건너뜀:")
        for cid, kind, reason in skipped:
            print(f"  {cid} ({kind}): {reason}")


if __name__ == "__main__":
    main()
