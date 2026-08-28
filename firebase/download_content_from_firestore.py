#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
download_content_from_firestore.py

Firestore의 "content" 컬렉션에서 시리즈 → 언어 → 레벨(idiom은 전체 한번에)을
번호로 골라서, 그 범위에 해당하는 문서만 로컬로 다운로드한다.
(원본은 전체를 무조건 다 받는 방식이었는데, 이제 선택한 조합만 받도록 변경)

사용법:
    cd /Users/junghasuk/Desktop/ManyLangs/web
    python3 firebase/download_content_from_firestore.py
"""

import json
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore

SERVICE_ACCOUNT = Path(
    "/Users/junghasuk/Desktop/ManyLangs/web/tts/tts-generator.json"
)

OUTPUT_ROOT = Path.home() / "Downloads" / "content"

SERIES_LIST = ["grammar", "conversation", "real", "voca", "idiom"]

cred = credentials.Certificate(str(SERVICE_ACCOUNT))
firebase_admin.initialize_app(cred)

db = firestore.client()


def pick(label: str, items: list, auto_select: bool = True) -> str:
    if not items:
        print(f"\n⚠️  {label} 항목이 없습니다. (Firestore content 컬렉션에 존재하지 않음)")
        raise SystemExit(1)

    if auto_select and len(items) == 1:
        print(f"\n{label}: \"{items[0]}\" 하나만 존재해서 자동 선택합니다.")
        return items[0]

    print(f"\n{label}을(를) 선택하세요:")
    for i, it in enumerate(items, 1):
        print(f"  {i}. {it}")

    ans = input("번호 입력: ").strip()
    try:
        idx = int(ans) - 1
        if idx < 0 or idx >= len(items):
            raise ValueError
    except ValueError:
        print("잘못된 입력입니다.")
        raise SystemExit(1)

    return items[idx]


def main():
    print("=" * 60)
    print("ManyLangs — 선택 다운로드 (Firestore content → 로컬)")
    print("=" * 60)

    print("\nFirestore content 컬렉션 스캔 중... (시간이 걸릴 수 있습니다)")

    # 1차: series/lang/level 필드만 읽어서 실제 존재하는 조합 파악 (가벼운 스캔)
    tree = {}
    scan_count = 0
    for doc in db.collection("content").select(["series", "lang", "level"]).stream():
        d = doc.to_dict()
        series, lang, level = d.get("series"), d.get("lang"), d.get("level")
        if not all([series, lang, level]):
            continue
        tree.setdefault(series, {}).setdefault(lang, set()).add(level)
        scan_count += 1

    print(f"스캔 완료: 문서 {scan_count}개 확인됨.\n")

    if not tree:
        print("content 컬렉션이 비어 있거나 필요한 필드가 없습니다.")
        return

    # 2) 시리즈 선택 — 실제 존재하는 것만
    seriesAvailable = [s for s in SERIES_LIST if s in tree]
    series = pick("시리즈", seriesAvailable, auto_select=False)

    # 3) 언어 선택
    langs = sorted(tree[series].keys())
    lang = pick("언어", langs)

    # 4) 레벨 선택 — idiom은 전체 한번에 (질문 생략)
    level = None
    if series == "idiom":
        print("\nidiom 시리즈는 레벨 구분 없이 전체를 한번에 다운로드합니다.")
    else:
        levels = sorted(tree[series][lang])
        level = pick("레벨 (다운로드할 레벨을 정확히 고르세요)", levels, auto_select=False)

    # 5) 최종 확인
    scope_desc = f"series={series}, lang={lang}" + (f", level={level}" if level else " (전체 레벨)")
    print(f"\n선택된 범위: {scope_desc}")
    confirm = input(f"저장 위치: {OUTPUT_ROOT}\n이 범위를 다운로드할까요? (y/n): ").strip().lower()
    if confirm != "y":
        print("취소되었습니다.")
        return

    # 6) 실제 다운로드 — 선택한 범위에 맞는 쿼리만 실행
    query = db.collection("content").where("series", "==", series).where("lang", "==", lang)
    if level:
        query = query.where("level", "==", level)

    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)

    count = 0
    skipped = 0

    print("\nDownloading...\n")

    for doc in query.stream():
        data = doc.to_dict()

        d_series = data.get("series")
        d_lang = data.get("lang")
        d_level = data.get("level")
        d_chapter = data.get("chapter")

        if not all([d_series, d_lang, d_level, d_chapter]):
            print(f"[SKIP] {doc.id}")
            skipped += 1
            continue

        out_dir = OUTPUT_ROOT / d_series / d_lang / d_level / d_chapter / "data"
        out_dir.mkdir(parents=True, exist_ok=True)

        with open(out_dir / "data.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        count += 1
        print(f"[OK] {d_series}/{d_lang}/{d_level}/{d_chapter}")

    print("\n================================")
    print(f"Downloaded: {count}")
    print(f"Skipped   : {skipped}")
    print(f"Saved to  : {OUTPUT_ROOT}")
    print("================================")


if __name__ == "__main__":
    main()
