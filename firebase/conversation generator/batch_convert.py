#!/usr/bin/env python3
"""
batch_convert.py — 일회성 변환 스크립트.

data/<id>/ 폴더 구조를 순회하며:
1) <id>-target.json (구버전 전체 스키마) → <id>-target.compact.json 추출
   (앞으로 번역기 md에 입력할 때는 이 압축본을 사용 — 전체 스키마를 다시 입력하지 않기 위함)
2) <id>-en.json (target+en 채워진 전체 스키마)이 존재하면 → conversation_<id>.runtime.json으로 표준화
   (이미 완성된 base로 취급, 이후 merge.py --base로 이어서 사용. 최종 완성본 네이밍 규칙과 통일)

사용법:
  python3 batch_convert.py /path/to/data
"""
import json
import sys
from pathlib import Path


def extract_compact(full_json_path: Path, lang: str) -> Path:
    """full_json_path의 title.<lang>/sentences.<lang> 값만 뽑아 압축 스키마로 추출."""
    with open(full_json_path, encoding="utf-8") as f:
        base = json.load(f)

    sets = {}
    for block in base["blocks"]:
        sets[block["set_id"]] = [line["sentences"][lang] for line in block["lines"]]

    compact = {
        "id": base["meta"]["id"],
        "lang": lang,
        "title": base["title"][lang],
        "sets": sets,
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
    n_en = 0
    n_base = 0
    skipped = []

    for id_dir in sorted(data_root.iterdir()):
        if not id_dir.is_dir():
            continue
        cid = id_dir.name

        target_path = id_dir / f"{cid}-target.json"
        en_path = id_dir / f"{cid}-en.json"
        base_out = id_dir / f"conversation_{cid}.runtime.json"

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

        # 2) en → compact 추출 (라운드트립 검증용, 이미 번역된 결과에서 en 값만 뽑음)
        if en_path.exists():
            try:
                out = extract_compact(en_path, "en")
                n_en += 1
                print(f"[en]     {cid}: {en_path.name} → {out.name}")
            except Exception as e:
                skipped.append((cid, "en", str(e)))

        # 3) en까지 된 파일이 있으면 표준 base로 지정 (이미 003.json 등이 있으면 건드리지 않음)
        if en_path.exists() and not base_out.exists():
            with open(en_path, encoding="utf-8") as f:
                data = json.load(f)
            with open(base_out, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            n_base += 1
            print(f"[base]   {cid}: {en_path.name} → {base_out.name}")
        elif base_out.exists():
            print(f"[base]   {cid}: {base_out.name} 이미 존재, 건드리지 않음")

    print()
    print(f"=== 완료: target 압축 {n_target}개, en 압축 {n_en}개, base 표준화 {n_base}개 ===")
    if skipped:
        print("건너뜀:")
        for cid, kind, reason in skipped:
            print(f"  {cid} ({kind}): {reason}")


if __name__ == "__main__":
    main()