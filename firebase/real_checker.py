import json
from pathlib import Path

ROOT = Path("/Users/junghasuk/Desktop/content/real")

LANGS = {"kr", "en", "pt", "fr", "jp", "zh", "es"}

errors = []


def check_file(json_file: Path):
    chapter = json_file.parent.parent.name  # .../001/data/001.json -> 001

    try:
        with open(json_file, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        errors.append(f"[JSON ERROR] {json_file}: {e}")
        return

    # 1. meta.id == 폴더번호
    meta = data.get("meta", {})
    json_id = meta.get("id")

    if json_id != chapter:
        errors.append(
            f"[ID] {json_file} | folder={chapter} json={json_id}"
        )

    # 2. 모든 texts에 언어 존재 여부 검사
    for block_idx, block in enumerate(data.get("blocks", [])):
        if block.get("type") != "description":
            continue

        for sent_idx, sentence in enumerate(block.get("sentences", [])):
            texts = sentence.get("texts", {})

            missing = LANGS - set(texts.keys())

            if missing:
                errors.append(
                    f"[LANG] {json_file} | sentence {sent_idx+1} missing {sorted(missing)}"
                )


def main():
    for json_file in ROOT.glob("*/*/*/data/*.json"):
        check_file(json_file)

    if errors:
        print("=" * 80)
        print(f"ERRORS : {len(errors)}")
        print("=" * 80)
        for e in errors:
            print(e)
    else:
        print("✅ 모든 파일 통과")


if __name__ == "__main__":
    main()