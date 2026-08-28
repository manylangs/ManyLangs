#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
interactive_upload.py

로컬 /Users/junghasuk/Desktop/content 에서
시리즈 → 언어 → 레벨(idiom은 전체 한번에)을 번호로 골라서
기존 upload_content_to_firebase.py 를 그대로 호출하는 래퍼 스크립트.

업로드 로직 자체는 건드리지 않는다 — 옵션만 조합해서 subprocess로 실행.
항상 --dry-run을 먼저 돌려 미리보기를 보여주고, y 확인 후에만 실제 업로드한다.

사용법:
    cd /Users/junghasuk/Desktop/ManyLangs/web
    python3 firebase/interactive_upload.py
"""

import subprocess
import sys
from pathlib import Path

LOCAL_ROOT = Path("/Users/junghasuk/Desktop/content")
SERIES_LIST = ["grammar", "conversation", "real", "voca", "idiom"]

# 이 스크립트와 같은 폴더에 있는 upload_content_to_firebase.py를 그대로 호출
UPLOAD_SCRIPT = Path(__file__).resolve().parent / "upload_content_to_firebase.py"


def list_dirs(path: Path):
    if not path.exists():
        return []
    return sorted(
        p.name for p in path.iterdir() if p.is_dir() and not p.name.startswith(".")
    )


def pick(label: str, items: list, auto_select: bool = True) -> str:
    if not items:
        print(f"\n⚠️  {label} 항목이 없습니다. (로컬 content 폴더에 존재하지 않음)")
        sys.exit(1)

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
        sys.exit(1)

    return items[idx]


def main():
    print("=" * 60)
    print("ManyLangs — 선택 업로드 (로컬 content → Firebase Storage)")
    print("=" * 60)

    if not UPLOAD_SCRIPT.exists():
        print(f"\n⚠️  {UPLOAD_SCRIPT} 를 찾을 수 없습니다. 이 파일을 firebase/ 폴더에 넣었는지 확인하세요.")
        sys.exit(1)

    # 1) 시리즈 선택 (5종 고정, 항상 명시적으로 고름)
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
        sys.exit(1)

    # 2) 언어 선택 — 로컬 content/{series}/ 밑에 실제 있는 폴더만
    langs = list_dirs(LOCAL_ROOT / series)
    lang = pick("언어", langs)

    cmd = [sys.executable, str(UPLOAD_SCRIPT), "--series", series, "--lang", lang]

    # 3) 레벨 선택 — idiom은 레벨 구분 없이 전체 한번에 (--level 옵션 생략)
    if series == "idiom":
        print("\nidiom 시리즈는 레벨 구분 없이 전체를 한번에 업로드합니다. (--level 생략)")
    else:
        levels = list_dirs(LOCAL_ROOT / series / lang)
        level = pick("레벨 (업로드할 레벨을 정확히 고르세요)", levels, auto_select=False)
        cmd += ["--level", level]

    # 4) 덮어쓰기 여부
    overwrite_ans = input(
        "\n기존에 이미 올라간 파일도 덮어쓸까요? 기본은 '없는 파일만 업로드'입니다. (y/n, 기본 n): "
    ).strip().lower()
    if overwrite_ans == "y":
        cmd.append("--overwrite")

    # 5) dry-run으로 먼저 예정 내역 보여주기
    print("\n먼저 dry-run으로 업로드 예정 내역을 확인합니다...\n")
    subprocess.run(cmd + ["--dry-run", "--verbose"])

    confirm = input("\n위 내용대로 실제 업로드를 진행할까요? (y/n): ").strip().lower()
    if confirm != "y":
        print("취소되었습니다.")
        sys.exit(0)

    print("\n실제 업로드를 시작합니다...\n")
    subprocess.run(cmd + ["--verbose"])

    print("\n" + "=" * 60)
    print("업로드가 끝났다면, 다음 순서로 이어서 진행하세요:")
    print("  1) node scripts/add_manifest_entry.js   ← Firestore manifest 반영")
    print("  2) app/config/languages.ts 의 RELEASED_CONTENT 에 항목 추가 후 배포")
    print("=" * 60)


if __name__ == "__main__":
    main()
