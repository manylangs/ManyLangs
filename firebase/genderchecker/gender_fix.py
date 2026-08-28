#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gender_fix.py — gender_audit.py가 만든 fix_candidates.txt를 읽어
실제 SRT/JSON 파일에 반영하는 교체기.

사용법:
    python3 gender_fix.py --input review_xxx.fix_candidates.txt
        (기본은 dry-run — 실제로 파일을 건드리지 않고 미리보기만 출력)

    python3 gender_fix.py --input review_xxx.fix_candidates.txt --apply
        (실제로 파일에 반영. 원본은 .bak으로 백업 후 덮어씀)

txt 포맷 (gender_audit.py가 생성):
    FILE: /절대/경로/파일
    TYPE: SRT 또는 JSON_COMBINED
    CUE: N                (SRT일 때)
    SET_ID: xxx            (JSON_COMBINED일 때)
    LINE: N                 (JSON_COMBINED일 때)
    LANG: es
    OLD: ...
    NEW: ...
    REASON: ...
    CONFIDENCE: high
    ===
    (다음 블록)

'#'으로 시작하는 줄은 주석으로 무시됨.
"""

import argparse
import json
import re
import shutil
import sys
from pathlib import Path


def parse_fix_txt(path: str) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        raw = f.read()

    blocks = raw.split("\n===\n")
    entries = []
    for block in blocks:
        lines = [l for l in block.split("\n") if l.strip() and not l.strip().startswith("#")]
        if not lines:
            continue
        entry = {}
        for line in lines:
            m = re.match(r"^([A-Z_]+):\s?(.*)$", line)
            if not m:
                continue
            key, val = m.group(1), m.group(2)
            entry[key] = val
        if "FILE" in entry and "TYPE" in entry:
            entries.append(entry)
    return entries


def apply_srt_fix(entry: dict, apply: bool) -> bool:
    """SRT 파일 하나의 특정 CUE 텍스트를 NEW로 교체."""
    file_path = Path(entry["FILE"])
    if not file_path.exists():
        print(f"  [ERROR] 파일 없음: {file_path}")
        return False

    target_cue = int(entry["CUE"])
    raw = file_path.read_text(encoding="utf-8")

    # 빈 줄(구분자)을 캡처 그룹으로 유지한 채 split -> 재조립 시 원본 개행 보존
    parts = re.split(r"(\n\s*\n)", raw)
    found = False
    out_parts = []
    for part in parts:
        stripped = part.strip()
        lines = stripped.split("\n") if stripped else []
        if (len(lines) >= 2 and lines[0].strip().isdigit()
                and int(lines[0].strip()) == target_cue):
            found = True
            out_parts.append(f"{lines[0]}\n{lines[1]}\n{entry['NEW']}")
        else:
            out_parts.append(part)

    if not found:
        print(f"  [WARN] CUE {target_cue} 못 찾음: {file_path}")
        return False

    new_content = "".join(out_parts)

    print(f"  [{'APPLY' if apply else 'DRY-RUN'}] {file_path.name} CUE {target_cue}")
    print(f"      - OLD: {entry.get('OLD','')}")
    print(f"      + NEW: {entry['NEW']}")

    if apply:
        backup = file_path.with_suffix(file_path.suffix + ".bak")
        if not backup.exists():
            shutil.copy2(file_path, backup)
        file_path.write_text(new_content, encoding="utf-8")

    return True


def apply_json_combined_fix(entry: dict, apply: bool) -> bool:
    """통합형 JSON 파일의 특정 set_id/line/lang sentences 값을 NEW로 교체."""
    file_path = Path(entry["FILE"])
    if not file_path.exists():
        print(f"  [ERROR] 파일 없음: {file_path}")
        return False

    with open(file_path, encoding="utf-8") as f:
        doc = json.load(f)

    set_id = entry["SET_ID"]
    line_idx = int(entry["LINE"])
    lang = entry["LANG"]

    target_block = None
    for block in doc.get("blocks", []):
        if str(block.get("set_id")) == str(set_id):
            target_block = block
            break
    if target_block is None:
        print(f"  [WARN] set_id={set_id} 못 찾음: {file_path}")
        return False

    try:
        line = target_block["lines"][line_idx]
    except (IndexError, KeyError):
        print(f"  [WARN] line={line_idx} 못 찾음: {file_path}")
        return False

    old_val = line.get("sentences", {}).get(lang, "")
    print(f"  [{'APPLY' if apply else 'DRY-RUN'}] {file_path.name} set_id={set_id} line={line_idx} lang={lang}")
    print(f"      - OLD: {old_val}")
    print(f"      + NEW: {entry['NEW']}")

    if apply:
        backup = file_path.with_suffix(file_path.suffix + ".bak")
        if not backup.exists():
            shutil.copy2(file_path, backup)
        line["sentences"][lang] = entry["NEW"]
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, indent=2)

    return True


def apply_json_final_merged_fix(entry: dict, apply: bool) -> bool:
    """최종 합본(JSON_FINAL_MERGED) 파일: blocks[SET_ID][<array>][N] 안의 lang 값 교체.
    SET_ID는 blocks 배열 인덱스. LINE은 '<array이름>_N' 형식
    (real: 'sentences_5' -> blocks[i]["sentences"][5]["texts"][lang]
     idiom: 'examples_1' -> blocks[i]["examples"][1][lang]  (texts 래퍼 없음)
    ). 두 구조를 자동 판별해서 처리."""
    file_path = Path(entry["FILE"])
    if not file_path.exists():
        print(f"  [ERROR] 파일 없음: {file_path}")
        return False

    with open(file_path, encoding="utf-8") as f:
        doc = json.load(f)

    try:
        block_idx = int(entry["SET_ID"])
        block = doc["blocks"][block_idx]
    except (KeyError, IndexError, ValueError):
        print(f"  [WARN] SET_ID(blocks 인덱스)={entry.get('SET_ID')} 못 찾음: {file_path}")
        return False

    line_key = entry.get("LINE", "")
    m = re.match(r"^([a-zA-Z_]+)_(\d+)$", line_key)
    if not m:
        print(f"  [WARN] LINE 형식 이상함: {line_key} ({file_path})")
        return False
    array_name, idx_str = m.group(1), m.group(2)
    item_idx = int(idx_str)

    try:
        item = block[array_name][item_idx]
    except (KeyError, IndexError):
        print(f"  [WARN] {array_name}[{item_idx}] 못 찾음: {file_path}")
        return False

    lang = entry["LANG"]

    # 구조 자동 판별: texts 래퍼가 있으면 그 안에서, 없으면 item 자체에서 lang 키를 찾음
    if isinstance(item.get("texts"), dict):
        container = item["texts"]
    else:
        container = item

    if lang not in container:
        print(f"  [WARN] {array_name}[{item_idx}]에 lang={lang} 키 없음: {file_path}")
        return False

    old_val = container.get(lang, "")

    print(f"  [{'APPLY' if apply else 'DRY-RUN'}] {file_path.name} blocks[{block_idx}] {array_name}_{item_idx} lang={lang}")
    print(f"      - OLD: {old_val}")
    print(f"      + NEW: {entry['NEW']}")

    if apply:
        backup = file_path.with_suffix(file_path.suffix + ".bak")
        if not backup.exists():
            shutil.copy2(file_path, backup)
        container[lang] = entry["NEW"]
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, indent=2)

    return True


def main():
    ap = argparse.ArgumentParser(description="gender_audit 수정 후보를 실제 파일에 반영")
    ap.add_argument("--input", required=True, help="fix_candidates.txt 경로")
    ap.add_argument("--apply", action="store_true", help="실제로 파일에 반영 (기본은 dry-run)")
    args = ap.parse_args()

    entries = parse_fix_txt(args.input)
    print(f"[load] {len(entries)}개 수정 항목 로드됨")
    if not args.apply:
        print("[모드] dry-run — 실제 파일은 건드리지 않습니다. --apply를 추가하면 반영됩니다.\n")
    else:
        print("[모드] apply — 실제로 파일을 수정합니다 (원본은 .bak으로 백업).\n")

    n_ok, n_fail = 0, 0
    for entry in entries:
        etype = entry.get("TYPE")
        if etype == "SRT":
            ok = apply_srt_fix(entry, args.apply)
        elif etype == "JSON_COMBINED":
            ok = apply_json_combined_fix(entry, args.apply)
        elif etype == "JSON_FINAL_MERGED":
            ok = apply_json_final_merged_fix(entry, args.apply)
        else:
            print(f"  [SKIP] 지원 안 되는 TYPE: {etype}")
            ok = False
        if ok:
            n_ok += 1
        else:
            n_fail += 1

    print(f"\n{'='*60}")
    print(f"[요약] 성공 {n_ok}건 / 실패(못찾음) {n_fail}건")
    if not args.apply and n_ok:
        print(f"[안내] 위 내용이 맞으면 --apply를 붙여서 다시 실행하세요.")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
