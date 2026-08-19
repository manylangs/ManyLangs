#!/usr/bin/env python3

import copy
import json
import sys
from pathlib import Path

############################################################
# 기본 경로
############################################################

DATA_DIR = Path(
    "/Users/junghasuk/Desktop/ManyLangs/web/firebase/"
    "real generator/data"
)

############################################################
# 모든 언어(en 포함)의 수정 또는 추가 항목을 입력한다.
# (여기에 ALL_REPLACEMENTS 채워넣기)
############################################################
ALL_REPLACEMENTS = {
   
}

############################################################
# 현재 처리 중인 항목이 담기는 전역 변수
############################################################
REPLACEMENTS = {}


############################################################
# 파일 경로 해석 (수정됨)
############################################################

def resolve_json_file(argument: str) -> Path:
    """
    다음 순서로 파일을 찾는다:
    1) argument가 절대/상대 경로면 그대로 사용
    2) argument가 숫자(배치 ID)면:
        a) DATA_DIR / batch_id / f"real_{batch_id}.runtime.json"
        b) DATA_DIR / batch_id / "data.json"
        c) DATA_DIR / batch_id / * / "data.json" (하위 폴더 중 첫 번째)
    """
    candidate = Path(argument).expanduser()

    if candidate.is_file():
        return candidate.resolve()

    if argument.isdigit():
        batch_id = argument.zfill(3)
        base = DATA_DIR / batch_id

        # 2a: 기존 형식
        p1 = base / f"real_{batch_id}.runtime.json"
        if p1.is_file():
            return p1.resolve()

        # 2b: data.json이 직접 있는 경우
        p2 = base / "data.json"
        if p2.is_file():
            return p2.resolve()

        # 2c: 하위 폴더에서 data.json 찾기
        for sub in base.iterdir():
            if sub.is_dir():
                p3 = sub / "data.json"
                if p3.is_file():
                    return p3.resolve()

        # 못 찾으면 존재하지 않는 경로를 반환 (나중에 파일 없음 처리)
        return p1  # 혹은 적절한 기본 경로

    return candidate.resolve()


############################################################
# description 블록만 모으기
############################################################

def collect_description_blocks(data: dict) -> list:
    blocks = data.get("blocks")
    if not isinstance(blocks, list):
        return []
    return [
        block for block in blocks
        if isinstance(block, dict) and block.get("type") == "description"
    ]


############################################################
# 교체 설정 검증
############################################################

def validate_replacements(data: dict) -> list[str]:
    errors: list[str] = []
    description_blocks = collect_description_blocks(data)

    if not description_blocks:
        errors.append("[REPLACEMENT] JSON에 type이 'description'인 블록이 없습니다.")
        return errors

    for key, new_text in REPLACEMENTS.items():
        if not isinstance(key, tuple) or len(key) != 3:
            errors.append(f"[REPLACEMENT] 잘못된 REPLACEMENTS 키 형식: {key!r}")
            continue

        description_block_index, sentence_index, lang = key

        if (
            not isinstance(description_block_index, int)
            or description_block_index < 1
        ):
            errors.append(
                f"[REPLACEMENT] description_block_index는 1 이상의 "
                f"정수여야 합니다: {key!r}"
            )
            continue

        if not isinstance(sentence_index, int) or sentence_index < 1:
            errors.append(
                f"[REPLACEMENT] sentence_index는 1 이상의 정수여야 합니다: {key!r}"
            )
            continue

        if not isinstance(lang, str) or not lang.isalpha() or not lang.islower():
            errors.append(
                f"[REPLACEMENT] 언어 코드는 소문자 알파벳이어야 합니다: {key!r}"
            )
            continue

        if not isinstance(new_text, str) or not new_text.strip():
            errors.append(
                f"[REPLACEMENT] 교체/추가할 문장은 비어 있지 않은 문자열이어야 합니다: {key!r}"
            )
            continue

        if description_block_index > len(description_blocks):
            errors.append(
                f"[REPLACEMENT] 존재하지 않는 description 블록입니다: "
                f"description_block_index {description_block_index} "
                f"(실제 description 블록 수: {len(description_blocks)})"
            )
            continue

        block = description_blocks[description_block_index - 1]
        sentences = block.get("sentences")
        if not isinstance(sentences, list):
            errors.append(
                f"[REPLACEMENT] sentences 배열이 없습니다: description_block_index {description_block_index}"
            )
            continue

        if sentence_index > len(sentences):
            errors.append(
                f"[REPLACEMENT] 존재하지 않는 문장입니다: description block {description_block_index} "
                f"sentence {sentence_index} (실제 문장 수: {len(sentences)})"
            )
            continue

        sentence = sentences[sentence_index - 1]
        if not isinstance(sentence, dict) or not isinstance(sentence.get("texts"), dict):
            errors.append(
                f"[REPLACEMENT] 유효하지 않은 sentence 객체입니다: description block {description_block_index} "
                f"sentence {sentence_index}"
            )
            continue

    return errors


############################################################
# 교체/추가 적용
############################################################

def apply_replacements(data: dict) -> tuple[list[str], int, int, int]:
    logs: list[str] = []
    added = 0
    changed = 0
    unchanged = 0

    description_blocks = collect_description_blocks(data)

    for (
        description_block_index,
        sentence_index,
        lang,
    ), new_text in REPLACEMENTS.items():
        block = description_blocks[description_block_index - 1]
        sentence = block["sentences"][sentence_index - 1]
        texts = sentence["texts"]

        is_new = lang not in texts
        old_text = texts.get(lang)

        if not is_new and old_text == new_text:
            unchanged += 1
            logs.append(
                f"Unchanged [block {description_block_index}] "
                f"[sentence {sentence_index}] [{lang}]"
            )
            continue

        texts[lang] = new_text

        if is_new:
            added += 1
            logs.append(
                f"Added [block {description_block_index}] "
                f"[sentence {sentence_index}] [{lang}] (new language)"
            )
            logs.append(f"  New: {new_text}")
        else:
            changed += 1
            logs.append(
                f"Updated [block {description_block_index}] "
                f"[sentence {sentence_index}] [{lang}]"
            )
            logs.append(f"  Old: {old_text!r}")
            logs.append(f"  New: {new_text}")

    return logs, added, changed, unchanged


############################################################
# 안전한 파일 저장
############################################################

def write_json_safely(json_file: Path, data) -> None:
    temporary_file = json_file.with_suffix(json_file.suffix + ".tmp")

    try:
        with open(temporary_file, "w", encoding="utf-8") as file:
            json.dump(data, file, ensure_ascii=False, indent=2)
            file.write("\n")
        temporary_file.replace(json_file)
    except OSError:
        if temporary_file.exists():
            try:
                temporary_file.unlink()
            except OSError:
                pass
        raise


############################################################
# 배치 1건 처리
############################################################

def process_one(batch_id: str, replacement: dict) -> bool:
    global REPLACEMENTS
    REPLACEMENTS = replacement

    print("=" * 80)
    print(f"[{batch_id}] 처리 시작")
    print("=" * 80)

    json_file = resolve_json_file(batch_id)

    if not json_file.exists():
        print(f"File not found: {json_file}")
        return False

    if not json_file.is_file():
        print(f"Not a file: {json_file}")
        return False

    try:
        with open(json_file, "r", encoding="utf-8") as file:
            original_data = json.load(file)
    except json.JSONDecodeError as exc:
        print(f"Invalid JSON: {json_file}")
        print(f"Line {exc.lineno}, column {exc.colno}: {exc.msg}")
        return False
    except OSError as exc:
        print(f"Could not read file: {exc}")
        return False

    replacement_errors = validate_replacements(original_data)
    if replacement_errors:
        print("Validation failed.")
        print("JSON was not modified.")
        print()
        for error in replacement_errors:
            print(f"- {error}")
        return False

    if not REPLACEMENTS:
        print("No replacements configured.")
        print("JSON was not modified.")
        return True

    updated_data = copy.deepcopy(original_data)
    logs, added, changed, unchanged = apply_replacements(updated_data)

    print(f"File: {json_file}")
    print()
    for log in logs:
        print(log)

    if added == 0 and changed == 0:
        print()
        print("No actual changes.")
        print("JSON was not rewritten.")
        print(f"Already identical: {unchanged}")
        return True

    try:
        write_json_safely(json_file, updated_data)
    except OSError as exc:
        print()
        print(f"Could not write file: {exc}")
        return False

    print()
    print("Done.")
    print(f"Added (new language): {added}")
    print(f"Updated (existing language): {changed}")
    print(f"Already identical: {unchanged}")

    return True


############################################################
# 메인
############################################################

def main() -> None:
    if not ALL_REPLACEMENTS:
        print("No replacements configured.")
        print("ALL_REPLACEMENTS가 비어 있습니다.")
        return

    success_ids: list[str] = []
    failed_ids: list[str] = []

    batch_ids = sorted(ALL_REPLACEMENTS)

    for batch_id in batch_ids:
        replacement = ALL_REPLACEMENTS.get(batch_id, {})
        ok = process_one(batch_id, replacement)
        if ok:
            success_ids.append(batch_id)
        else:
            failed_ids.append(batch_id)
        print()

    print("=" * 80)
    print("ALL FILES COMPLETED")
    print("=" * 80)
    print(f"Success: {len(success_ids)}")
    print(f"Failed:  {len(failed_ids)}")

    if failed_ids:
        print()
        print("실패한 batch_id 목록:")
        for batch_id in failed_ids:
            print(f"  - {batch_id}")
        sys.exit(1)


if __name__ == "__main__":
    main()