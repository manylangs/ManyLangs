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
# 수정 또는 추가할 항목만 입력 (real_검수프롬프트.md /
# REAL_LANG_TRANSLATOR.md 두 문서 모두 이 딕셔너리 하나로 출력한다)
#
# ALL_REPLACEMENTS 형식:
#   "001": {
#       (description_block_index, sentence_index, "언어코드"): "문장",
#       ...
#   },
#   "002": {...},
#   ...
#
# 바깥쪽 키("001", "002" ...)는 batch_id이며,
# real_{batch_id}.runtime.json 파일을 가리킨다.
#
# - 이미 존재하는 언어 코드면 → 기존 문장을 교체(수정)한다.
# - 아직 존재하지 않는 새 언어 코드면 → 새 키로 추가한다
#   (REAL_LANG_TRANSLATOR.md로 신규 언어를 추가할 때 쓰는 경로).
# - "en"은 절대 사용할 수 없다 (REAL 시리즈의 원문 소스이므로 이 도구로 수정 불가).
#
# description_block_index: data["blocks"] 중 type이 "description"인
# 블록만 순서대로 센 번호 (1부터). sentence_index: 그 블록 안
# sentences 배열의 순번 (1부터).
############################################################
ALL_REPLACEMENTS = {
  
}

############################################################
# 현재 처리 중인 항목이 담기는 전역 변수
#
# validate_replacements(), apply_replacements()가
# 이 변수를 직접 참조하므로, process_one() 시작 시점에
# 매 배치마다 이 값을 갱신해야 한다.
############################################################
REPLACEMENTS = {}

FORBIDDEN_LANGUAGES = {"en"}


############################################################
# 파일 경로 해석
############################################################

def resolve_json_file(argument: str) -> Path:
    """
    다음 입력을 모두 지원한다.

    resolve_json_file("001")
    resolve_json_file("data/001/real_001.runtime.json")
    resolve_json_file("/절대경로/real_001.runtime.json")
    """

    candidate = Path(argument).expanduser()

    if candidate.is_file():
        return candidate.resolve()

    if argument.isdigit():
        batch_id = argument.zfill(3)

        return (
            DATA_DIR
            / batch_id
            / f"real_{batch_id}.runtime.json"
        )

    return candidate.resolve()


############################################################
# description 블록만 모으기
############################################################

def collect_description_blocks(data: dict) -> list:
    """type이 'description'인 블록만 순서대로 뽑아 리스트로 반환한다."""
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
    """
    REPLACEMENTS에 지정한 위치가 실제 JSON에 존재하는지(또는 새로
    추가 가능한 위치인지) 검사한다.
    오류가 하나라도 있으면 JSON을 수정하지 않는다.
    """

    errors: list[str] = []

    description_blocks = collect_description_blocks(data)

    if not description_blocks:
        errors.append(
            "[REPLACEMENT] JSON에 type이 'description'인 블록이 없습니다."
        )
        return errors

    for key, new_text in REPLACEMENTS.items():
        if not isinstance(key, tuple) or len(key) != 3:
            errors.append(
                f"[REPLACEMENT] 잘못된 REPLACEMENTS 키 형식: {key!r}"
            )
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
                f"[REPLACEMENT] sentence_index는 1 이상의 정수여야 "
                f"합니다: {key!r}"
            )
            continue

        if not isinstance(lang, str) or not lang.isalpha() or not lang.islower():
            errors.append(
                f"[REPLACEMENT] 언어 코드는 소문자 알파벳이어야 "
                f"합니다: {key!r}"
            )
            continue

        if lang in FORBIDDEN_LANGUAGES:
            errors.append(
                f"[REPLACEMENT] '{lang}'은(는) 이 도구로 수정할 수 "
                f"없는 언어입니다 (원문 소스): {key!r}"
            )
            continue

        if not isinstance(new_text, str) or not new_text.strip():
            errors.append(
                f"[REPLACEMENT] 교체/추가할 문장은 비어 있지 않은 "
                f"문자열이어야 합니다: {key!r}"
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
                f"[REPLACEMENT] sentences 배열이 없습니다: "
                f"description_block_index {description_block_index}"
            )
            continue

        if sentence_index > len(sentences):
            errors.append(
                f"[REPLACEMENT] 존재하지 않는 문장입니다: "
                f"description block {description_block_index} "
                f"sentence {sentence_index} "
                f"(실제 문장 수: {len(sentences)})"
            )
            continue

        sentence = sentences[sentence_index - 1]

        if not isinstance(sentence, dict) or not isinstance(
            sentence.get("texts"), dict
        ):
            errors.append(
                f"[REPLACEMENT] 유효하지 않은 sentence 객체입니다: "
                f"description block {description_block_index} "
                f"sentence {sentence_index}"
            )
            continue

    return errors


############################################################
# 교체/추가 적용
############################################################

def apply_replacements(data: dict) -> tuple[list[str], int, int, int]:
    """
    복사된 JSON 데이터에 교체/추가값을 적용한다.

    반환값:
    - 출력 로그
    - 새로 추가된 언어 수
    - 기존 문장을 교체한 수
    - 이미 동일한 항목 수
    """

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
    """
    임시 파일에 먼저 저장한 후 원본 파일을 교체한다.
    저장 중 오류가 발생해도 기존 JSON이 훼손되지 않는다.
    """

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
#
# 기존 main()의 본문을 그대로 옮긴 것이다.
# 다른 점은 sys.exit() 대신 return을 사용해서,
# 한 배치가 실패해도 다음 배치 처리가 계속되도록 한 것뿐이다.
#
# 반환값: 성공 여부 (True/False)
############################################################

def process_one(batch_id: str, replacement: dict) -> bool:
    global REPLACEMENTS

    REPLACEMENTS = replacement

    print("=" * 80)
    print(f"[{batch_id}] 처리 시작")
    print("=" * 80)

    json_file = resolve_json_file(batch_id)

    ########################################################
    # 파일 존재 여부
    ########################################################

    if not json_file.exists():
        print(f"File not found: {json_file}")
        return False

    if not json_file.is_file():
        print(f"Not a file: {json_file}")
        return False

    ########################################################
    # JSON 읽기
    ########################################################

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

    ########################################################
    # 교체 설정 검사
    ########################################################

    replacement_errors = validate_replacements(original_data)

    if replacement_errors:
        print("Validation failed.")
        print("JSON was not modified.")
        print()

        for error in replacement_errors:
            print(f"- {error}")

        return False

    ########################################################
    # 수정 사항 확인
    ########################################################

    if not REPLACEMENTS:
        print("No replacements configured.")
        print("JSON was not modified.")
        return True

    ########################################################
    # 원본을 직접 수정하지 않고 복사본에 적용
    ########################################################

    updated_data = copy.deepcopy(original_data)

    logs, added, changed, unchanged = apply_replacements(updated_data)

    print(f"File: {json_file}")
    print()

    for log in logs:
        print(log)

    ########################################################
    # 실제 변경/추가가 없으면 저장하지 않음
    ########################################################

    if added == 0 and changed == 0:
        print()
        print("No actual changes.")
        print("JSON was not rewritten.")
        print(f"Already identical: {unchanged}")
        return True

    ########################################################
    # 저장
    ########################################################

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
#
# ALL_REPLACEMENTS에 등록된 항목을 batch_id 순서대로
# 하나씩 process_one()에 넘겨서 처리한다.
#
# 인자 없이 "python3 real_review.py" 한 번 실행으로
# ALL_REPLACEMENTS 전체가 처리된다.
############################################################

def main() -> None:
    if not ALL_REPLACEMENTS:
        print("No replacements configured.")
        print("ALL_REPLACEMENTS가 비어 있습니다.")
        return

    success_ids: list[str] = []
    failed_ids: list[str] = []

    for batch_id in sorted(ALL_REPLACEMENTS):
        replacement = ALL_REPLACEMENTS[batch_id]
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