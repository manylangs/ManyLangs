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
    "conversation generator/data"
)

############################################################
# 수정할 항목만 입력
#
# ALL_REPLACEMENTS 형식:
#   "007": {
#       "TITLE_REPLACEMENTS": {"kr": "수정된 제목", ...},
#       "REPLACEMENTS": {
#           (set_id, line_number, "언어"): "수정된 문장",
#           ...
#       },
#   },
#   "010": {...},
#   ...
#
# 바깥쪽 키("007", "010" ...)는 batch_id이며,
# conversation_{batch_id}.runtime.json 파일을 가리킨다.
#
# REPLACEMENTS 안의 set_id는 그 파일의 blocks 배열 안에서
# 각 block의 "set_id" 필드값이다. batch_id와 set_id는
# 서로 다른 개념이므로 혼동하지 않는다.
############################################################
ALL_REPLACEMENTS = {
   
}

############################################################
# 현재 처리 중인 항목이 담기는 전역 변수
#
# validate_replacements(), apply_replacements()가
# 이 두 변수를 직접 참조하므로, process_one() 시작 시점에
# 매 배치마다 이 값을 갱신해야 한다.
############################################################
TITLE_REPLACEMENTS = {}
REPLACEMENTS = {}

ALLOWED_LANGUAGES = {
    "en",
    "es",
    "fr",
    "pt",
    "kr",
    "jp",
    "zh",
}


############################################################
# 파일 경로 해석
############################################################

def resolve_json_file(argument: str) -> Path:
    """
    다음 입력을 모두 지원한다.

    resolve_json_file("007")
    resolve_json_file("data/007/conversation_007.runtime.json")
    resolve_json_file("/절대경로/conversation_007.runtime.json")
    """

    candidate = Path(argument).expanduser()

    if candidate.is_file():
        return candidate.resolve()

    if argument.isdigit():
        batch_id = argument.zfill(3)

        return (
            DATA_DIR
            / batch_id
            / f"conversation_{batch_id}.runtime.json"
        )

    return candidate.resolve()


############################################################
# 교체 설정 검증
############################################################

def validate_replacements(data: dict) -> list[str]:
    """
    REPLACEMENTS / TITLE_REPLACEMENTS에 지정한 위치가
    실제 JSON에 존재하는지 검사한다.
    오류가 하나라도 있으면 JSON을 수정하지 않는다.
    """

    errors: list[str] = []

    if "title" not in data or not isinstance(data["title"], dict):
        errors.append("[REPLACEMENT] JSON에 유효한 title 객체가 없습니다.")

    if "blocks" not in data or not isinstance(data["blocks"], list):
        errors.append("[REPLACEMENT] JSON에 유효한 blocks 배열이 없습니다.")
        return errors

    block_map = {}

    for block in data["blocks"]:
        if not isinstance(block, dict):
            continue

        set_id = block.get("set_id")
        lines = block.get("lines")

        if isinstance(set_id, str) and isinstance(lines, list):
            block_map[set_id] = lines

    ########################################################
    # TITLE_REPLACEMENTS 검사
    ########################################################

    for lang, new_text in TITLE_REPLACEMENTS.items():
        if lang not in ALLOWED_LANGUAGES:
            errors.append(
                f"[REPLACEMENT] 허용되지 않은 제목 언어: {lang}"
            )
            continue

        if lang not in data.get("title", {}):
            errors.append(
                f"[REPLACEMENT] title에 언어 키가 없습니다: {lang}"
            )

        if not isinstance(new_text, str) or not new_text.strip():
            errors.append(
                f"[REPLACEMENT] 제목 교체값은 비어 있지 않은 "
                f"문자열이어야 합니다: {lang}"
            )

    ########################################################
    # REPLACEMENTS 검사
    ########################################################

    for key, new_text in REPLACEMENTS.items():
        if not isinstance(key, tuple) or len(key) != 3:
            errors.append(
                f"[REPLACEMENT] 잘못된 REPLACEMENTS 키 형식: {key!r}"
            )
            continue

        set_id, line_number, lang = key

        if not isinstance(set_id, str):
            errors.append(
                f"[REPLACEMENT] set_id는 문자열이어야 합니다: {key!r}"
            )
            continue

        if not isinstance(line_number, int) or line_number < 1:
            errors.append(
                f"[REPLACEMENT] line 번호는 1 이상의 정수여야 "
                f"합니다: {key!r}"
            )
            continue

        if lang not in ALLOWED_LANGUAGES:
            errors.append(
                f"[REPLACEMENT] 허용되지 않은 언어입니다: "
                f"{lang} / {key!r}"
            )
            continue

        if not isinstance(new_text, str) or not new_text.strip():
            errors.append(
                f"[REPLACEMENT] 교체 문장은 비어 있지 않은 "
                f"문자열이어야 합니다: {key!r}"
            )
            continue

        if set_id not in block_map:
            errors.append(
                f"[REPLACEMENT] 존재하지 않는 set_id입니다: {set_id}"
            )
            continue

        lines = block_map[set_id]

        if line_number > len(lines):
            errors.append(
                f"[REPLACEMENT] 존재하지 않는 line입니다: "
                f"Set {set_id} Line {line_number} "
                f"(실제 라인 수: {len(lines)})"
            )
            continue

        line = lines[line_number - 1]

        if not isinstance(line, dict):
            errors.append(
                f"[REPLACEMENT] 유효하지 않은 line 객체입니다: "
                f"Set {set_id} Line {line_number}"
            )
            continue

        sentences = line.get("sentences")

        if not isinstance(sentences, dict):
            errors.append(
                f"[REPLACEMENT] sentences 객체가 없습니다: "
                f"Set {set_id} Line {line_number}"
            )
            continue

        if lang not in sentences:
            errors.append(
                f"[REPLACEMENT] sentences에 언어 키가 없습니다: "
                f"Set {set_id} Line {line_number} [{lang}]"
            )

    return errors


############################################################
# 교체 적용
############################################################

def apply_replacements(data: dict) -> tuple[list[str], int, int]:
    """
    복사된 JSON 데이터에 교체값을 적용한다.

    반환값:
    - 출력 로그
    - 변경 수
    - 이미 동일한 항목 수
    """

    logs: list[str] = []
    changed = 0
    unchanged = 0

    ########################################################
    # 제목 수정
    ########################################################

    for lang, new_text in TITLE_REPLACEMENTS.items():
        old_text = data["title"].get(lang)

        if old_text == new_text:
            unchanged += 1
            logs.append(f"Unchanged Title [{lang}]: {new_text}")
            continue

        data["title"][lang] = new_text
        changed += 1

        logs.append(f"Updated Title [{lang}]")
        logs.append(f"  Old: {old_text!r}")
        logs.append(f"  New: {new_text}")

    ########################################################
    # 문장 수정
    ########################################################

    for block in data["blocks"]:
        set_id = block.get("set_id")
        lines = block.get("lines")

        if not isinstance(set_id, str) or not isinstance(lines, list):
            continue

        for line_number, line in enumerate(lines, start=1):
            for lang in ALLOWED_LANGUAGES:
                key = (set_id, line_number, lang)

                if key not in REPLACEMENTS:
                    continue

                old_text = line["sentences"].get(lang)
                new_text = REPLACEMENTS[key]

                if old_text == new_text:
                    unchanged += 1
                    logs.append(
                        f"Unchanged Set {set_id} "
                        f"Line {line_number} [{lang}]"
                    )
                    continue

                line["sentences"][lang] = new_text
                changed += 1

                logs.append(
                    f"Updated Set {set_id} "
                    f"Line {line_number} [{lang}]"
                )
                logs.append(f"  Old: {old_text!r}")
                logs.append(f"  New: {new_text}")

    return logs, changed, unchanged


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
    global TITLE_REPLACEMENTS, REPLACEMENTS

    TITLE_REPLACEMENTS = replacement.get("TITLE_REPLACEMENTS", {})
    REPLACEMENTS = replacement.get("REPLACEMENTS", {})

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

    if not TITLE_REPLACEMENTS and not REPLACEMENTS:
        print("No replacements configured.")
        print("JSON was not modified.")
        return True

    ########################################################
    # 원본을 직접 수정하지 않고 복사본에 적용
    ########################################################

    updated_data = copy.deepcopy(original_data)

    logs, changed, unchanged = apply_replacements(updated_data)

    print(f"File: {json_file}")
    print()

    for log in logs:
        print(log)

    ########################################################
    # 실제 변경이 없으면 저장하지 않음
    ########################################################

    if changed == 0:
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
    print(f"Changed: {changed}")
    print(f"Already identical: {unchanged}")

    return True


############################################################
# 메인
#
# ALL_REPLACEMENTS에 등록된 항목을 batch_id 순서대로
# 하나씩 process_one()에 넘겨서 처리한다.
#
# 인자 없이 "python3 review_conversation.py" 한 번 실행으로
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