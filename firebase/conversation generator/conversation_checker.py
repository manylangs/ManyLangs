import json
from pathlib import Path

ROOT = Path(
    "/Users/junghasuk/Desktop/ManyLangs/web/firebase/"
    "conversation generator/data"
)

LANGS = {"kr", "en", "pt", "fr", "jp", "zh", "es"}

BATCH_START = 1
BATCH_END = 60

EXPECTED_SET_COUNT = 10
EXPECTED_LINES_PER_SET = 6

errors = []


def check_data(data, json_file: Path):
    chapter = json_file.parent.name  # .../data/001/conversation_001.runtime.json -> 001

    ##########################
    # meta
    ##########################

    meta = data.get("meta")

    if not isinstance(meta, dict):
        errors.append(f"[META] {json_file} | meta missing")
        return

    json_id = meta.get("id")

    if json_id != chapter:
        errors.append(
            f"[ID] {json_file} | folder={chapter} json={json_id}"
        )

    ##########################
    # title
    ##########################

    title = data.get("title")

    if not isinstance(title, dict):
        errors.append(f"[TITLE] {json_file} | title missing")
    else:
        missing_title = LANGS - set(title.keys())

        if missing_title:
            errors.append(
                f"[LANG-TITLE] {json_file} | missing {sorted(missing_title)}"
            )

    ##########################
    # blocks (세트)
    #
    # conversation 스키마:
    # blocks[] = [
    #     {
    #         "set_id": "001",
    #         "lines": [
    #             {"speaker": "A", "sentences": {8개 언어}},
    #             ...
    #         ],
    #     },
    #     ...
    # ]
    ##########################

    blocks = data.get("blocks")

    if not isinstance(blocks, list):
        errors.append(f"[BLOCKS] {json_file} | blocks is not list")
        return

    if len(blocks) != EXPECTED_SET_COUNT:
        errors.append(
            f"[SET COUNT] {json_file} | expected "
            f"{EXPECTED_SET_COUNT}, got {len(blocks)}"
        )

    for block in blocks:
        if not isinstance(block, dict):
            errors.append(
                f"[BLOCK TYPE] {json_file} | block not object"
            )
            continue

        set_id = block.get("set_id", "?")
        lines = block.get("lines", [])

        if len(lines) != EXPECTED_LINES_PER_SET:
            errors.append(
                f"[LINE COUNT] {json_file} | set {set_id} "
                f"expected {EXPECTED_LINES_PER_SET}, got {len(lines)}"
            )

        for line_idx, line in enumerate(lines, start=1):
            if not isinstance(line, dict):
                errors.append(
                    f"[LINE TYPE] {json_file} | set {set_id} "
                    f"line {line_idx} not object"
                )
                continue

            speaker = line.get("speaker", "?")
            sentences = line.get("sentences", {})

            if not isinstance(sentences, dict):
                errors.append(
                    f"[TYPE] {json_file} | set {set_id} "
                    f"line {line_idx} (speaker {speaker}) "
                    f"sentences is not dict"
                )
                continue

            missing = LANGS - set(sentences.keys())

            if missing:
                errors.append(
                    f"[LANG-LINE] {json_file} | set {set_id} "
                    f"line {line_idx} (speaker {speaker}) "
                    f"missing {sorted(missing)}"
                )

            for lang in LANGS:
                if lang not in sentences:
                    continue

                value = sentences[lang]

                if not isinstance(value, str):
                    errors.append(
                        f"[TYPE] {json_file} | set {set_id} "
                        f"line {line_idx} (speaker {speaker}) "
                        f".{lang} is not string"
                    )
                    continue

                if value.strip() == "":
                    errors.append(
                        f"[EMPTY] {json_file} | set {set_id} "
                        f"line {line_idx} (speaker {speaker}) "
                        f".{lang}"
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

        json_file = batch_dir / f"conversation_{batch_id}.runtime.json"

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