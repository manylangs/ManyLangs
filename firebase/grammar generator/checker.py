import json
import re
from pathlib import Path

ROOT = Path("/Users/junghasuk/Desktop/ManyLangs/web/firebase/grammar generator/data")

LANGS = {"target", "kr", "en", "es", "fr", "pt", "jp", "zh"}

BATCH_START = 1
BATCH_END = 250

EXPECTED_BLOCK_COUNT = 17

errors = []

def check_text_dict(obj, label, json_file):
    if not isinstance(obj, dict):
        errors.append(f"[TYPE] {json_file} | {label} is not dict")
        return

    missing = LANGS - set(obj.keys())

    if missing:
        errors.append(
            f"[LANG] {json_file} | {label} missing {sorted(missing)}"
        )

    for lang in LANGS:
        if lang not in obj:
            continue

        value = obj[lang]

        if not isinstance(value, str):
            errors.append(
                f"[TYPE] {json_file} | {label}.{lang} is not string"
            )
            continue

        if value.strip() == "":
            errors.append(
                f"[EMPTY] {json_file} | {label}.{lang}"
            )


def check_data(data, json_file: Path):
    chapter = json_file.parent.name

    ##########################
    # meta
    ##########################

    meta = data.get("meta")

    if not isinstance(meta, dict):
        errors.append(f"[META] {json_file} | meta missing")
        return

    for k in ("series", "level", "id"):
        if k not in meta:
            errors.append(f"[META] {json_file} | missing meta.{k}")

    json_id = meta.get("id")

    if json_id != chapter:
        errors.append(
            f"[ID] {json_file} | folder={chapter} json={json_id}"
        )

    if not re.fullmatch(r"\d{3}", str(json_id)):
        errors.append(
            f"[ID FORMAT] {json_file} | id={json_id}"
        )

    ##########################
    # title
    ##########################

    title = data.get("title")

    check_text_dict(title, "title", json_file)

    ##########################
    # blocks
    ##########################

    blocks = data.get("blocks")

    if not isinstance(blocks, list):
        errors.append(f"[BLOCKS] {json_file} | blocks is not list")
        return

    if len(blocks) != EXPECTED_BLOCK_COUNT:
        errors.append(
            f"[BLOCK COUNT] {json_file} | expected {EXPECTED_BLOCK_COUNT}, got {len(blocks)}"
        )

    expected = []

    expected += [("grammar_explanation", None)] * 5
    expected += [("grammar_example", "core_patterns")] * 4
    expected += [("grammar_example", "variations")] * 4
    expected += [("grammar_example", "extended_usage")] * 4

    for idx, block in enumerate(blocks):

        block_no = idx + 1

        if not isinstance(block, dict):
            errors.append(
                f"[BLOCK TYPE] {json_file} | block {block_no} not object"
            )
            continue

        btype = block.get("type")
        variant = block.get("variant")

        if idx < len(expected):

            exp_type, exp_variant = expected[idx]

            if btype != exp_type:
                errors.append(
                    f"[BLOCK TYPE] {json_file} | block {block_no} expected {exp_type}, got {btype}"
                )

            if exp_variant is None:

                if "variant" in block:
                    errors.append(
                        f"[VARIANT] {json_file} | block {block_no} explanation should not have variant"
                    )

            else:

                if variant != exp_variant:
                    errors.append(
                        f"[VARIANT] {json_file} | block {block_no} expected {exp_variant}, got {variant}"
                    )

        sentences = block.get("sentences")

        check_text_dict(
            sentences,
            f"block {block_no}.sentences",
            json_file
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
            skipped_missing_dir += 1
            continue

        json_file = batch_dir / f"grammar_{batch_id}.runtime.json"

        if not json_file.is_file():
            errors.append(f"[MISSING FILE] {json_file}")
            continue

        with open(json_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        check_data(data, json_file)

        checked += 1

    print("=" * 80)
    print(
        f"검사 완료: 존재하는 챕터 {checked}개 확인, 없는 폴더 {skipped_missing_dir}개는 건너뜀"
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