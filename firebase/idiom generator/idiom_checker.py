import json
from pathlib import Path

ROOT = Path(
    "/Users/junghasuk/Desktop/ManyLangs/web/firebase/"
    "idiom generator/data"
)

LANGS = {"kr", "en", "pt", "fr", "jp", "zh", "es"}

BATCH_START = 1
BATCH_END = 42

EXPECTED_IDIOM_COUNT = 5
EXPECTED_EXAMPLE_COUNT = 5
FUNCTION_ORDER = [
    "basic_meaning",
    "situational_application",
    "extended_meaning",
    "natural_spoken_example",
    "learner_friendly_simple",
]

errors = []


def check_data(data, json_file: Path):
    chapter = json_file.parent.name  # .../data/001/idiom_001.runtime.json -> 001

    ##########################
    # meta
    ##########################

    meta = data.get("meta", {})
    json_id = meta.get("id")

    if json_id != chapter:
        errors.append(f"[ID] {json_file} | folder={chapter} json={json_id}")

    ##########################
    # title
    #
    # merge.py가 IDIOM_TITLE 상수를 채워 넣는다. title 자체가
    # 없는 파일도 있을 수 있어 존재할 때만 검사한다.
    ##########################

    if "title" in data:
        title = data.get("title", {})
        missing_title = LANGS - set(title.keys())

        if missing_title:
            errors.append(
                f"[LANG-TITLE] {json_file} | missing {sorted(missing_title)}"
            )

    ##########################
    # blocks (이디엄)
    #
    # idiom 스키마:
    # blocks[] = [
    #     {
    #         "type": "idiom",
    #         "frequency_rank": N,
    #         "frequency_stars": ..,
    #         "expression": {"target": ...} (+ 번역 언어가 있을 수도 있음),
    #         "explanation": {8개 언어},
    #         "examples": [{"function": ..., 8개 언어}, x5],
    #     },
    #     ...
    # ]
    ##########################

    blocks = data.get("blocks", [])

    if len(blocks) != EXPECTED_IDIOM_COUNT:
        errors.append(
            f"[IDIOM COUNT] {json_file} | expected "
            f"{EXPECTED_IDIOM_COUNT}, got {len(blocks)}"
        )

    seen_ranks = set()

    for block in blocks:
        rank = block.get("frequency_rank", "?")
        label = f"idiom rank={rank}"

        if rank != "?" and rank in seen_ranks:
            errors.append(
                f"[DUPLICATE RANK] {json_file} | {label} "
                f"중복된 frequency_rank"
            )

        seen_ranks.add(rank)

        ######################
        # expression: 최소 target은 있어야 함
        ######################

        expression = block.get("expression", {})

        if isinstance(expression, dict):
            if "target" not in expression or not expression.get("target"):
                errors.append(
                    f"[EXPRESSION] {json_file} | {label} "
                    f"expression.target 없음"
                )
        else:
            errors.append(
                f"[EXPRESSION] {json_file} | {label} expression 객체가 아님"
            )

        ######################
        # explanation: 8개 언어(target+7) 완전성 검사
        ######################

        explanation = block.get("explanation", {})

        if isinstance(explanation, dict):
            missing = LANGS - set(explanation.keys())

            if missing:
                errors.append(
                    f"[LANG-EXPLANATION] {json_file} | {label} "
                    f"missing {sorted(missing)}"
                )

            if "target" not in explanation or not explanation.get("target"):
                errors.append(
                    f"[EXPLANATION] {json_file} | {label} "
                    f"explanation.target 없음"
                )
        else:
            errors.append(
                f"[EXPLANATION] {json_file} | {label} explanation 객체가 아님"
            )

        ######################
        # examples: 5개, function 태그 순서 고정, 각 8개 언어 완전성 검사
        ######################

        examples = block.get("examples", [])

        if len(examples) != EXPECTED_EXAMPLE_COUNT:
            errors.append(
                f"[EXAMPLE COUNT] {json_file} | {label} expected "
                f"{EXPECTED_EXAMPLE_COUNT}, got {len(examples)}"
            )

        for ex_idx, example in enumerate(examples):
            if not isinstance(example, dict):
                errors.append(
                    f"[EXAMPLE] {json_file} | {label} "
                    f"example {ex_idx + 1} 객체가 아님"
                )
                continue

            expected_fn = (
                FUNCTION_ORDER[ex_idx] if ex_idx < len(FUNCTION_ORDER) else None
            )
            actual_fn = example.get("function")

            if expected_fn and actual_fn != expected_fn:
                errors.append(
                    f"[FUNCTION ORDER] {json_file} | {label} "
                    f"example {ex_idx + 1} expected '{expected_fn}', "
                    f"got '{actual_fn}'"
                )

            missing = LANGS - set(example.keys())

            if missing:
                errors.append(
                    f"[LANG-EXAMPLE] {json_file} | {label} "
                    f"example {ex_idx + 1} ({actual_fn}) "
                    f"missing {sorted(missing)}"
                )

            if "target" not in example or not example.get("target"):
                errors.append(
                    f"[EXAMPLE] {json_file} | {label} "
                    f"example {ex_idx + 1} target 없음"
                )


def run_checker_validation(data, json_file):
    global errors
    errors = []

    check_data(data, json_file)

    return errors


def main():
    global errors
    errors = []

    checked = 0
    skipped_missing_dir = 0

    for i in range(BATCH_START, BATCH_END + 1):

        batch_id = f"{i:03d}"

        batch_dir = ROOT / batch_id

        if not batch_dir.is_dir():
            errors.append(f"[MISSING DIR - SKIPPED] {batch_dir}")
            skipped_missing_dir += 1
            continue

        json_file = batch_dir / f"idiom_{batch_id}.runtime.json"

        if not json_file.is_file():
            errors.append(f"[MISSING FILE] {json_file}")
            continue

        try:
            with open(json_file, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            errors.append(f"[JSON ERROR] {json_file}: {e}")
            continue

        check_data(data, json_file)

        checked += 1

    print("=" * 80)
    print(
        f"검사 완료: 존재하는 챕터 {checked}개 확인, "
        f"없는 폴더 {skipped_missing_dir}개는 건너뜀"
    )
    print("=" * 80)

    if errors:

        print(f"ERRORS : {len(errors)}")
        print("-" * 80)

        for e in errors:
            print(e)

    else:
        print("✅ 존재하는 모든 파일 통과")


if __name__ == "__main__":
    main()