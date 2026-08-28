#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
download_content_from_storage.py

로컬 content 폴더(/Users/junghasuk/Desktop/content)가 유실됐을 때,
Firebase Storage(실제 원본 파일이 저장된 곳)에서 시리즈 → 언어 →
레벨(idiom은 전체 한번에)을 골라 그 범위만 로컬로 복원(다운로드)한다.

주의:
    Firestore에는 실제 콘텐츠 파일이 없다 (contentManifests는 경로 인덱스일 뿐).
    실제 원본은 Firebase Storage에 있으므로 이 스크립트는 Storage를 직접 읽는다.

사용법:
    cd /Users/junghasuk/Desktop/ManyLangs/web
    python3 firebase/download_content_from_storage.py
"""

from pathlib import Path

import firebase_admin
from firebase_admin import credentials, storage

SERVICE_ACCOUNT = Path(
    "/Users/junghasuk/Desktop/ManyLangs/web/tts/tts-generator.json"
)
BUCKET_NAME = "manylangs-55fd3.firebasestorage.app"

# 복원 기본 위치 — 원래 콘텐츠가 있던 자리와 동일하게 맞춰서,
# 복원하면 바로 upload/manifest 스크립트들이 그대로 다시 쓸 수 있게 한다.
LOCAL_ROOT = Path("/Users/junghasuk/Desktop/content")

SERIES_LIST = ["grammar", "conversation", "real", "voca", "idiom"]

cred = credentials.Certificate(str(SERVICE_ACCOUNT))
firebase_admin.initialize_app(cred, {"storageBucket": BUCKET_NAME})

bucket = storage.bucket()


def list_sub_prefixes(prefix: str) -> list:
    """Storage에서 prefix 바로 아래 폴더 이름들만 뽑아온다 (delimiter listing)."""
    iterator = bucket.list_blobs(prefix=prefix, delimiter="/")
    # prefixes를 채우려면 iterator를 다 순회해야 함
    for _ in iterator:
        pass
    prefixes = iterator.prefixes or []
    return sorted(p.replace(prefix, "").rstrip("/") for p in prefixes if p)


def pick(label: str, items: list, auto_select: bool = True) -> str:
    if not items:
        print(f"\n⚠️  {label} 항목을 Storage에서 찾지 못했습니다.")
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
    print("ManyLangs — Firebase Storage → 로컬 복원(다운로드)")
    print("(로컬 content 폴더가 유실됐을 때 원본을 다시 받아온다)")
    print("=" * 60)

    # 1) 시리즈 선택 — 항상 명시적으로 (전체 5종 중, Storage에 실제 있는 것만 아래에서 걸러짐)
    print("\n시리즈를 선택하세요:")
    for i, s in enumerate(SERIES_LIST, 1):
        print(f"  {i}. {s}")
    ans = input("번호 입력: ").strip()
    try:
        idx = int(ans) - 1
        if idx < 0 or idx >= len(SERIES_LIST):
            raise ValueError
        series = SERIES_LIST[idx]
    except ValueError:
        print("잘못된 입력입니다.")
        raise SystemExit(1)

    # 2) 언어 선택 — Storage에 실제 존재하는 언어만
    langs = list_sub_prefixes(f"content/{series}/")
    lang = pick("언어", langs)

    # 3) 레벨 선택 — idiom은 전체 한번에 (질문 생략), 나머지는 반드시 직접 선택
    if series == "idiom":
        print("\nidiom 시리즈는 레벨 구분 없이 전체를 한번에 복원합니다.")
        download_prefix = f"content/{series}/{lang}/"
        local_target = LOCAL_ROOT / series / lang
    else:
        levels = list_sub_prefixes(f"content/{series}/{lang}/")
        level = pick("레벨 (복원할 레벨을 정확히 고르세요)", levels, auto_select=False)
        download_prefix = f"content/{series}/{lang}/{level}/"
        local_target = LOCAL_ROOT / series / lang / level

    # 4) 로컬에 이미 파일이 있는지 확인 (실수로 최신 로컬 작업을 덮어쓰는 것 방지)
    if local_target.exists() and any(local_target.iterdir()):
        print(f"\n⚠️  경고: {local_target} 에 이미 파일이 있습니다.")
        print("     이 스크립트는 같은 이름의 파일을 덮어씁니다 (기존 로컬 파일 손실 가능).")
        confirm = input("     그래도 계속할까요? (y/n): ").strip().lower()
        if confirm != "y":
            print("취소되었습니다.")
            return

    # 5) 다운로드 대상 개수 미리 확인
    blobs = list(bucket.list_blobs(prefix=download_prefix))
    blobs = [b for b in blobs if not b.name.endswith("/")]  # 폴더 placeholder 제외

    if not blobs:
        print(f"\n⚠️  {download_prefix} 밑에 파일이 없습니다.")
        return

    print(f"\n복원 대상: {len(blobs)}개 파일")
    print(f"저장 위치: {local_target}")
    confirm = input("복원을 시작할까요? (y/n): ").strip().lower()
    if confirm != "y":
        print("취소되었습니다.")
        return

    # 6) 실제 다운로드
    ok = 0
    fail = 0

    print("\nDownloading...\n")

    for blob in blobs:
        # blob.name 예: content/grammar/es/a1/001/data/grammar_001.runtime.json
        relative = blob.name[len(f"content/{series}/{lang}/"):]  # {level}/{chapter}/... 부터
        dest_path = (LOCAL_ROOT / series / lang) / relative
        dest_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            blob.download_to_filename(str(dest_path))
            print(f"  ✅ {blob.name}")
            ok += 1
        except Exception as e:
            print(f"  ❌ {blob.name}: {e}")
            fail += 1

    print("\n================================")
    print(f"복원 완료: {ok}개")
    print(f"실패      : {fail}개")
    print(f"저장 위치 : {local_target}")
    print("================================")


if __name__ == "__main__":
    main()
