#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from pathlib import Path

CONTENT_ROOT = Path("/Users/junghasuk/Desktop/content")

SERIES = [
    "conversation",
    "grammar",
    "idiom",
    "real",
    "voca",
]

missing_dirs = []
empty_dirs = []
missing_files = []


def check_dir(path: Path):
    if not path.exists():
        missing_dirs.append(path)
        return False

    if not any(path.iterdir()):
        empty_dirs.append(path)

    return True


def check_file(path: Path):
    if not path.exists():
        missing_files.append(path)
        return False
    return True


def check_conversation(chapter: Path, level: str, chap: str):
    audio = chapter / "audio"
    data = chapter / "data"

    if check_dir(audio):
        check_file(audio / f"conversation_{level}_{chap}.wav")
        check_file(audio / f"conversation_{level}_{chap}.cues.json")

    if check_dir(data):
        check_file(data / f"conversation_{chap}.runtime.json")


def check_grammar(chapter: Path, chap: str):
    data = chapter / "data"

    if check_dir(data):
        check_file(data / f"grammar_{chap}.runtime.json")


def check_idiom(chapter: Path, level: str, chap: str):
    audio = chapter / "audio"
    data = chapter / "data"

    if check_dir(audio):
        check_file(audio / f"idiom_{level}_{chap}.wav")
        check_file(audio / f"idiom_{level}_{chap}.cues.json")

    if check_dir(data):
        check_file(data / "data.json")


def check_voca(chapter: Path, level: str, chap: str):
    audio = chapter / "audio"
    data = chapter / "data"

    if check_dir(audio):
        check_file(audio / f"voca_{level}_{chap}.wav")
        check_file(audio / f"voca_{level}_{chap}.cues.json")

    if check_dir(data):
        check_file(data / "data.json")


def check_real(chapter: Path, chap: str):
    audio = chapter / "audio"
    data = chapter / "data"
    images = chapter / "images"

    if check_dir(audio):
        check_file(audio / f"{chap}.wav")

    if check_dir(data):
        check_file(data / f"{chap}.json")

    if check_dir(images):
        check_file(images / f"{chap}.png")


def walk_series(root: Path, series: str):
    if not root.exists():
        return

    print(f"\n===== {root.relative_to(CONTENT_ROOT)} =====")

    for lang in sorted(root.iterdir()):
        if not lang.is_dir():
            continue

        for level in sorted(lang.iterdir()):
            if not level.is_dir():
                continue

            for chapter in sorted(level.iterdir()):
                if not chapter.is_dir():
                    continue

                chap = chapter.name

                if series == "conversation":
                    check_conversation(chapter, level.name, chap)

                elif series == "grammar":
                    check_grammar(chapter, chap)

                elif series == "idiom":
                    check_idiom(chapter, level.name, chap)

                elif series == "voca":
                    check_voca(chapter, level.name, chap)

                elif series == "real":
                    check_real(chapter, chap)


for s in SERIES:
    walk_series(CONTENT_ROOT / s, s)

demo_root = CONTENT_ROOT / "demo"

if demo_root.exists():
    for s in SERIES:
        walk_series(demo_root / s, s)

print("\n" + "=" * 70)

print(f"MISSING DIR  : {len(missing_dirs)}")
for p in missing_dirs:
    print("[DIR ]", p)

print()

print(f"EMPTY DIR    : {len(empty_dirs)}")
for p in empty_dirs:
    print("[EMPTY]", p)

print()

print(f"MISSING FILE : {len(missing_files)}")
for p in missing_files:
    print("[FILE]", p)

print("\n" + "=" * 70)
print("DONE")
