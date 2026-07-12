#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
rename_json_lang_keys.py

/content 아래의 모든 data.json을 검색하여

ko -> kr
ja -> jp

키 이름만 변경한다.

실행:
python3 rename_json_lang_keys.py
"""

from pathlib import Path
import json

ROOT = Path("/Users/junghasuk/Desktop/content")

files_modified = 0
ko_count = 0
ja_count = 0


def rename_keys(obj):
    global ko_count, ja_count

    if isinstance(obj, dict):
        # meta는 수정하지 않음
        if {"series", "level", "id"} <= obj.keys():
            return

        # ko -> kr
        if "ko" in obj:
            if "kr" not in obj:
                obj["kr"] = obj["ko"]
            del obj["ko"]
            ko_count += 1

        # ja -> jp
        if "ja" in obj:
            if "jp" not in obj:
                obj["jp"] = obj["ja"]
            del obj["ja"]
            ja_count += 1

        for value in obj.values():
            rename_keys(value)

    elif isinstance(obj, list):
        for item in obj:
            rename_keys(item)


for json_file in ROOT.rglob("data.json"):
    try:
        with open(json_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        before = json.dumps(data, ensure_ascii=False, sort_keys=True)

        rename_keys(data)

        after = json.dumps(data, ensure_ascii=False, sort_keys=True)

        if before != after:
            with open(json_file, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            files_modified += 1
            print(f"Updated: {json_file}")

    except Exception as e:
        print(f"ERROR: {json_file}")
        print(e)

print()
print("=" * 40)
print("Done")
print(f"Files modified : {files_modified}")
print(f"ko -> kr : {ko_count}")
print(f"ja -> jp : {ja_count}")
print("=" * 40)