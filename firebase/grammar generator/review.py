import copy
import json
import sys
from pathlib import Path

from checker import run_checker_validation

############################################################
# 기본 경로
############################################################

DATA_DIR = Path(
    "/Users/junghasuk/Desktop/ManyLangs/web/firebase/"
    "grammar generator/data"
)

############################################################
# 수정할 항목만 입력
#
# ALL_REPLACEMENTS 형식:
#   "001": {
#       "TITLE_REPLACEMENTS": {"kr": "수정된 제목", ...},
#       "REPLACEMENTS": {(block_index, "언어"): "수정된 문장", ...},
#   },
#   "002": {...},
#   ...
#
# block_index는 data["blocks"] 배열 안에서 1부터 시작한다.
#
# grammar 시리즈 17블록 고정 구조:
#   1~5   = grammar_explanation
#   6~9   = grammar_example / core_patterns
#   10~13 = grammar_example / variations
#   14~17 = grammar_example / extended_usage
#
# target은 원문이므로 이 리뷰 파일에서는 수정할 수 없다.
############################################################
ALL_REPLACEMENTS = {
}

############################################################
# 현재 처리 중인 항목이 담기는 전역 변수
#
# validate_replacement_configuration(), apply_replacements()가
# 이 두 변수를 직접 참조하므로, process_one() 시작 시점에
# 매 배치마다 이 값을 갱신해야 한다.
############################################################
TITLE_REPLACEMENTS = {}
REPLACEMENTS = {}

############################################################
# 검증 설정
############################################################

# 완성된 runtime JSON에 반드시 존재해야 하는 언어
REQUIRED_LANGUAGES = {
    "target",
    "kr",
    "en",
    "es",
    "fr",
    "pt",
    "jp",
    "zh",
}

# 리뷰 파일로 수정할 수 있는 번역 언어
# target은 원문 보호를 위해 제외한다.
ALLOWED_REPLACEMENT_LANGUAGES = {
    "kr",
    "en",
    "es",
    "fr",
    "pt",
    "jp",
    "zh",
}

EXPECTED_BLOCK_COUNT = 17

EXPECTED_LEVELS = {
    "a1",
    "a2",
    "b1",
    "b2",
    "c1",
    "c2",
}

EXPECTED_BLOCK_STRUCTURE = (
    [("grammar_explanation", None)] * 5
    + [("grammar_example", "core_patterns")] * 4
    + [("grammar_example", "variations")] * 4
    + [("grammar_example", "extended_usage")] * 4
)


############################################################
# 파일 경로 해석
############################################################

def resolve_json_file(argument: str) -> Path:
    """
    다음 입력을 모두 지원한다.

    resolve_json_file("001")
    resolve_json_file("data/001/grammar_001.runtime.json")
    resolve_json_file("/절대경로/grammar_001.runtime.json")
    """

    candidate = Path(argument).expanduser()

    if candidate.is_file():
        return candidate.resolve()

    if argument.isdigit():
        batch_id = argument.zfill(3)

        return (
            DATA_DIR
            / batch_id
            / f"grammar_{batch_id}.runtime.json"
        )

    return candidate.resolve()


############################################################
# 교체 설정 검증
############################################################

def validate_replacement_configuration(
    data,
) -> list[str]:
    """
    TITLE_REPLACEMENTS와 REPLACEMENTS 자체를 검사한다.

    누락된 언어 키는 교체값으로 새로 추가할 수 있다.
    하지만 존재하지 않는 block은 수정할 수 없다.
    """

    errors: list[str] = []

    title = data.get("title")

    if not isinstance(title, dict):
        errors.append(
            "[REPLACEMENT] JSON에 유효한 title 객체가 없습니다."
        )

    blocks = data.get("blocks")

    if not isinstance(blocks, list):
        errors.append(
            "[REPLACEMENT] JSON에 유효한 blocks 배열이 없습니다."
        )
        return errors

    ########################################################
    # TITLE_REPLACEMENTS 검사
    ########################################################

    for lang, new_text in TITLE_REPLACEMENTS.items():
        if lang not in ALLOWED_REPLACEMENT_LANGUAGES:
            errors.append(
                f"[REPLACEMENT] 허용되지 않은 제목 언어: {lang}"
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
        if not isinstance(key, tuple) or len(key) != 2:
            errors.append(
                f"[REPLACEMENT] 잘못된 키 형식: {key!r}"
            )
            continue

        block_index, lang = key

        if not isinstance(block_index, int) or block_index < 1:
            errors.append(
                f"[REPLACEMENT] block_index는 1 이상의 "
                f"정수여야 합니다: {key!r}"
            )
            continue

        if lang not in ALLOWED_REPLACEMENT_LANGUAGES:
            errors.append(
                f"[REPLACEMENT] 허용되지 않은 언어: "
                f"{lang} / {key!r}"
            )

        if not isinstance(new_text, str) or not new_text.strip():
            errors.append(
                f"[REPLACEMENT] 교체 문장은 비어 있지 않은 "
                f"문자열이어야 합니다: {key!r}"
            )

        if block_index > len(blocks):
            errors.append(
                f"[REPLACEMENT] 존재하지 않는 block_index: "
                f"{block_index} / 실제 block 수: {len(blocks)}"
            )
            continue

        block = blocks[block_index - 1]

        if not isinstance(block, dict):
            errors.append(
                f"[REPLACEMENT] block {block_index}가 "
                f"유효한 객체가 아닙니다."
            )
            continue

        if not isinstance(block.get("sentences"), dict):
            errors.append(
                f"[REPLACEMENT] block {block_index}에 "
                f"유효한 sentences 객체가 없습니다."
            )

    return errors


############################################################
# 교체 적용
############################################################

def apply_replacements(
    data,
) -> tuple[list[str], int, int]:
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
            logs.append(
                f"Unchanged Title [{lang}]: {new_text}"
            )
            continue

        data["title"][lang] = new_text
        changed += 1

        logs.append(f"Updated Title [{lang}]")
        logs.append(f"  Old: {old_text!r}")
        logs.append(f"  New: {new_text}")

    ########################################################
    # 문장 수정
    ########################################################

    blocks = data["blocks"]

    for (block_index, lang), new_text in REPLACEMENTS.items():
        block = blocks[block_index - 1]
        sentences = block["sentences"]

        old_text = sentences.get(lang)

        block_type = block.get("type", "?")
        variant = block.get("variant")

        label = f"block {block_index} ({block_type}"

        if variant:
            label += f", {variant}"

        label += ")"

        if old_text == new_text:
            unchanged += 1
            logs.append(
                f"Unchanged {label} [{lang}]"
            )
            continue

        sentences[lang] = new_text
        changed += 1

        logs.append(f"Updated {label} [{lang}]")
        logs.append(f"  Old: {old_text!r}")
        logs.append(f"  New: {new_text}")

    return logs, changed, unchanged


############################################################
# 안전한 파일 저장
############################################################

def write_json_safely(
    json_file: Path,
    data,
) -> None:
    """
    임시 파일에 먼저 저장한 후 원본 파일을 교체한다.
    저장 중 오류가 발생해도 기존 JSON이 훼손되지 않는다.
    """

    temporary_file = json_file.with_suffix(
        json_file.suffix + ".tmp"
    )

    try:
        with open(
            temporary_file,
            "w",
            encoding="utf-8",
        ) as file:
            json.dump(
                data,
                file,
                ensure_ascii=False,
                indent=2,
            )
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
        with open(
            json_file,
            "r",
            encoding="utf-8",
        ) as file:
            original_data = json.load(file)

    except json.JSONDecodeError as exc:
        print(f"Invalid JSON: {json_file}")
        print(
            f"Line {exc.lineno}, "
            f"column {exc.colno}: {exc.msg}"
        )
        return False

    except OSError as exc:
        print(f"Could not read file: {exc}")
        return False

    ########################################################
    # 교체 설정 검사
    ########################################################

    replacement_errors = validate_replacement_configuration(
        original_data
    )

    if replacement_errors:
        print("Replacement validation failed.")
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

    logs, changed, unchanged = apply_replacements(
        updated_data
    )

    ########################################################
    # 수정 적용 후 전체 QA
    ########################################################

    qa_errors = run_checker_validation(
        updated_data,
        json_file,
    )

    if qa_errors:
        print("=" * 80)
        print("FULL QA FAILED")
        print("JSON was not modified.")
        print("=" * 80)
        print()

        for error in qa_errors:
            print(f"- {error}")

        print()
        print(
            "수정 내용을 적용한 뒤에도 전체 구조 검사를 "
            "통과하지 못했으므로 저장하지 않았습니다."
        )

        return False

    ########################################################
    # 실제 변경이 없으면 저장하지 않음
    ########################################################

    print(f"File: {json_file}")
    print()

    for log in logs:
        print(log)

    if changed == 0:
        print()
        print("No actual changes.")
        print("JSON was not rewritten.")
        print(f"Already identical: {unchanged}")
        return True

    ########################################################
    # QA 통과 후 저장
    ########################################################

    try:
        write_json_safely(
            json_file,
            updated_data,
        )

    except OSError as exc:
        print()
        print(f"Could not write file: {exc}")
        return False

    print()
    print("=" * 80)
    print("FULL QA PASSED")
    print("=" * 80)
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
# 인자 없이 "python3 review.py" 한 번 실행으로
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