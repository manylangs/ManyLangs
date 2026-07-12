#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
voca_checker.py — VOCA 시리즈 전용 검증 스크립트

기존 content_checker.py 의 구조 검사(빈 폴더 / 빈 파일 / 누락 파일 / 예상 외 json)에 더해,
VOCA 시리즈에 한해 각 챕터의 data.json 을 열어 blocks 안의 모든 단어쌍
(word.target, 보통 5개)을 전부 꺼내 언어/레벨/챕터별 목록으로 출력한다.

즉, 이 스크립트 하나로
  1) 파일/폴더 구조 검증 (있어야 할 게 있는지, 비어있지는 않은지)
  2) 실제 콘텐츠 내용 검증 (data.json 이 파싱 가능하고, 단어가 실제로 들어있는지)
까지 한 번에 확인할 수 있다.

실행:
    python3 voca_checker.py
"""

from pathlib import Path
import json
import re

CONTENT_ROOT = Path("/Users/junghasuk/Desktop/content")
SERIES = "voca"
CHAPTER_PATTERN = re.compile(r"\d{3}")

# ---- 구조 검사 결과 ----
missing_dirs = []
empty_dirs = []
missing_files = []
empty_files = []
unexpected_jsons = []
bad_json = []  # data.json 은 있는데 파싱 실패 / blocks 없음 / word.target 없음

# ---- 내용 검사 결과 ----
# chapter_words[lang][level][chapter] = [block_001 단어, block_002 단어, ...] (각 항목은 str 또는 None)
chapter_words = {}


def check_dir(path: Path) -> bool:
    """폴더가 존재하고, 비어있지 않은지 확인."""
    if not path.exists():
        missing_dirs.append(path)
        return False
    if not any(path.iterdir()):
        empty_dirs.append(path)
        return False
    return True


def check_file(path: Path) -> bool:
    """파일이 존재하고, 0바이트가 아닌지 확인."""
    if not path.exists():
        missing_files.append(path)
        return False
    if path.stat().st_size == 0:
        empty_files.append(path)
        return False
    return True


def check_only_expected_json(data_dir: Path, expected_name: str):
    """data 폴더 안에 expected_name 외의 json이 있으면 기록."""
    if not data_dir.exists():
        return
    for f in data_dir.glob("*.json"):
        if f.name != expected_name:
            unexpected_jsons.append(f)


def extract_words(data_json: Path):
    """data.json 에서 모든 blocks[i].word.target 값을 리스트로 꺼낸다.
    (블록이 5개면 5개 전부, 누락된 블록은 None 으로 표시하고 bad_json 에 기록)"""
    try:
        with open(data_json, encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        bad_json.append((data_json, f"JSON 파싱 오류: {e}"))
        return None
    except Exception as e:
        bad_json.append((data_json, f"읽기 오류: {e}"))
        return None

    blocks = data.get("blocks")
    if not blocks:
        bad_json.append((data_json, "blocks 없음/비어있음"))
        return None

    words = []
    for i, block in enumerate(blocks, start=1):
        word = block.get("word", {})
        target = word.get("target")
        if not target:
            bad_json.append((data_json, f"blocks[{i}].word.target 없음 (block id: {block.get('id', '?')})"))
            words.append(None)
        else:
            words.append(target)

    return words


def check_voca_chapter(chapter: Path, level: str, chap: str, lang: str):
    audio = chapter / "audio"
    data = chapter / "data"

    if check_dir(audio):
        check_file(audio / f"voca_{level}_{chap}.wav")
        check_file(audio / f"voca_{level}_{chap}.cues.json")

    if check_dir(data):
        expected = "data.json"
        data_json = data / expected
        if check_file(data_json):
            check_only_expected_json(data, expected)
            words = extract_words(data_json)
            chapter_words.setdefault(lang, {}).setdefault(level, {})[chap] = words


def walk_voca(root: Path):
    if not root.exists():
        missing_dirs.append(root)
        return

    label = root.relative_to(CONTENT_ROOT)
    print(f"\n===== {label} =====")

    for lang in sorted(root.iterdir()):
        if not lang.is_dir():
            continue

        for level in sorted(lang.iterdir()):
            if not level.is_dir():
                continue

            for chapter in sorted(level.iterdir()):
                if not chapter.is_dir():
                    continue

                # 001, 002 ... 숫자 3자리 폴더만 챕터로 인정
                if not CHAPTER_PATTERN.fullmatch(chapter.name):
                    continue

                check_voca_chapter(chapter, level.name, chapter.name, lang.name)


# ---- 실행: 일반 voca + demo/voca 둘 다 검사 (분기) ----
walk_voca(CONTENT_ROOT / SERIES)
walk_voca(CONTENT_ROOT / "demo" / SERIES)

# ---- 단어 목록 출력 (내용 검증) ----
print("\n" + "=" * 70)
print("VOCA 단어 목록 (챕터별 전체 단어 — 실제 내용 확인용)")

for lang in sorted(chapter_words):
    print(f"\n[{lang}]")
    for level in sorted(chapter_words[lang]):
        print(f"  {level.upper()}")
        for chap in sorted(chapter_words[lang][level]):
            words = chapter_words[lang][level][chap]
            if words is None:
                print(f"    {chap} : ⚠️  data.json 읽기 실패 (BAD data.json 참고)")
                continue
            display = ", ".join(w if w else "⚠️없음" for w in words)
            print(f"    {chap} ({len(words)}개) : {display}")

# ---- 구조 검사 결과 출력 ----
print("\n" + "=" * 70)
print("STRUCTURE CHECK")

print(f"\nMISSING DIR     : {len(missing_dirs)}")
for p in missing_dirs:
    print("[DIR ]", p)

print(f"\nEMPTY DIR       : {len(empty_dirs)}")
for p in empty_dirs:
    print("[EMPTY DIR]", p)

print(f"\nMISSING FILE    : {len(missing_files)}")
for p in missing_files:
    print("[FILE]", p)

print(f"\nEMPTY FILE      : {len(empty_files)}")
for p in empty_files:
    print("[EMPTY FILE]", p)

print(f"\nUNEXPECTED JSON : {len(unexpected_jsons)}")
for p in unexpected_jsons:
    print("[JSON]", p)

print(f"\nBAD data.json   : {len(bad_json)}")
for p, reason in bad_json:
    print("[BAD JSON]", p, "-", reason)

print("\n" + "=" * 70)
print("DONE")