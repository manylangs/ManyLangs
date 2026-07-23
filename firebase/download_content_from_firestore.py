#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore

SERVICE_ACCOUNT = Path(
    "/Users/junghasuk/Desktop/ManyLangs/web/tts/tts-generator.json"
)

OUTPUT_ROOT = Path.home() / "Downloads" / "content"

cred = credentials.Certificate(str(SERVICE_ACCOUNT))
firebase_admin.initialize_app(cred)

db = firestore.client()

OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)

count = 0

print("Downloading Firestore content...\n")

for doc in db.collection("content").stream():
    data = doc.to_dict()

    series = data.get("series")
    lang = data.get("lang")
    level = data.get("level")
    chapter = data.get("chapter")

    if not all([series, lang, level, chapter]):
        print(f"[SKIP] {doc.id}")
        continue

    out_dir = OUTPUT_ROOT / series / lang / level / chapter / "data"
    out_dir.mkdir(parents=True, exist_ok=True)

    with open(out_dir / "data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    count += 1
    print(f"[OK] {series}/{lang}/{level}/{chapter}")

print("\n================================")
print(f"Downloaded: {count}")
print(f"Saved to  : {OUTPUT_ROOT}")
print("================================")
