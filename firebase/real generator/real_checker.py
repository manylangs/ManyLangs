import json
import re
from pathlib import Path

ROOT = Path("/Users/junghasuk/Desktop/ManyLangs/web/firebase/real generator/data")

LANGS = {"kr", "en", "pt", "fr", "jp", "zh", "es"}

BATCH_START = 1
BATCH_END = 60

errors = []


def check_texts_dict(obj, label, json_file):
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

    for k in ("id",):
        if k not in meta:
            errors.append(f"[META] {json_file} | missing meta.{k}")

    
    ##########################
    # blocks
    ##########################

    blocks = data.get("blocks")

    if not isinstance(blocks, list):
        errors.append(f"[BLOCKS] {json_file} | blocks is not list")
        return

    if not blocks:
        errors.append(f"[BLOCKS] {json_file} | blocks is empty")

    image_blocks = []
    description_blocks = []

    for idx, block in enumerate(blocks):

        block_no = idx + 1

        if not isinstance(block, dict):
            errors.append(
                f"[BLOCK TYPE] {json_file} | block {block_no} not object"
            )
            continue

        btype = block.get("type")

        if btype == "image":
            image_blocks.append((block_no, block))

        elif btype == "description":
            description_blocks.append((block_no, block))

        else:
            errors.append(
                f"[BLOCK TYPE] {json_file} | block {block_no} unknown type {btype}"
            )

    ##########################
    # image blocks
    ##########################

    if not image_blocks:
        errors.append(f"[NO IMAGE BLOCK] {json_file}")

    for block_no, block in image_blocks:

        src = block.get("src")

        if not isinstance(src, str):
            errors.append(
                f"[TYPE] {json_file} | block {block_no}.src is not string"
            )
        elif src.strip() == "":
            errors.append(
                f"[EMPTY] {json_file} | block {block_no}.src"
            )

    ##########################
    # description blocks
    ##########################

    if not description_blocks:
        errors.append(f"[NO DESCRIPTION BLOCK] {json_file}")

    for block_no, block in description_blocks:

        sentences = block.get("sentences")

        if not isinstance(sentences, list):
            errors.append(
                f"[TYPE] {json_file} | block {block_no}.sentences is not list"
            )
            continue

        if not sentences:
            errors.append(
                f"[EMPTY] {json_file} | block {block_no}.sentences is empty"
            )

        for sent_idx, sentence in enumerate(sentences):

            sent_no = sent_idx + 1

            if not isinstance(sentence, dict):
                errors.append(
                    f"[TYPE] {json_file} | block {block_no} sentence {sent_no} is not object"
                )
                continue

            texts = sentence.get("texts")

            check_texts_dict(
                texts,
                f"block {block_no} sentence {sent_no}.texts",
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

        json_file = batch_dir / "data.json"

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