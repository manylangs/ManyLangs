#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


# ============================================================
# 설정
# ============================================================

ROOT = Path("/Users/junghasuk/Desktop/ManyLangs/web/youtube/conversation")

LEVEL_PREFIXES = ("a1_", "a2_", "b1_", "b2_", "c1_", "c2_")

SITE_TEXT = "www.manylangs.studio"

SITE_FONT_RATIO = 0.026
SITE_BOTTOM_MARGIN_RATIO = 0.245

SITE_TEXT_COLOR = (255, 255, 255, 217)  # white @ ~0.85
SITE_BOX_COLOR = (0, 0, 0, 89)         # black @ ~0.35

SITE_BOX_PAD_X_RATIO = 0.018
SITE_BOX_PAD_Y_RATIO = 0.010


# ============================================================
# 폰트
# ============================================================

def find_font() -> str:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/Library/Fonts/Arial.ttf",
    ]

    for candidate in candidates:
        if Path(candidate).exists():
            return candidate

    raise FileNotFoundError("사용 가능한 시스템 폰트를 찾지 못했습니다.")


# ============================================================
# 언어 선택
# ============================================================

def ask_language() -> str:
    print()
    print("==========================================")
    print(" ManyLangs Watermark Generator")
    print("==========================================")
    print()

    lang = input(
        "언어 약어를 입력하세요 (예: en, kr, es, fr, pt, jp, zh): "
    ).strip().lower()

    if not lang:
        print("언어가 입력되지 않았습니다.")
        sys.exit(1)

    lang_dir = ROOT / lang

    if not lang_dir.exists():
        print()
        print(f"폴더가 없습니다: {lang_dir}")
        sys.exit(1)

    return lang


# ============================================================
# 대화 폴더 선택
# ============================================================

def find_conversation_folders(lang: str):
    lang_dir = ROOT / lang

    folders = [
        p for p in lang_dir.iterdir()
        if p.is_dir()
        and p.name.lower().startswith(LEVEL_PREFIXES)
    ]

    folders.sort(
        key=lambda p: (
            LEVEL_PREFIXES.index(
                next(
                    prefix
                    for prefix in LEVEL_PREFIXES
                    if p.name.lower().startswith(prefix)
                )
            ),
            p.name.lower(),
        )
    )

    return folders


def choose_folder(lang: str) -> Path:
    folders = find_conversation_folders(lang)

    if not folders:
        print()
        print(f"{lang} 폴더에서 대화 폴더를 찾지 못했습니다.")
        sys.exit(1)

    print()
    print(f"===== {lang.upper()} 대화 폴더 =====")
    print()

    for i, folder in enumerate(folders, start=1):
        print(f"{i:3d}. {folder.name}")

    print()

    while True:
        value = input("작업할 폴더 번호를 입력하세요: ").strip()

        try:
            number = int(value)
        except ValueError:
            print("숫자로 입력해주세요.")
            continue

        if 1 <= number <= len(folders):
            return folders[number - 1]

        print(f"1~{len(folders)} 사이의 번호를 입력해주세요.")


# ============================================================
# 001~006 이미지 검색
# ============================================================

def find_target_images(folder: Path):
    images = []

    for number in range(1, 7):
        suffix = f"_{number:03d}.png"

        matches = [
            p for p in folder.glob("*.png")
            if p.name.endswith(suffix)
        ]

        if not matches:
            print(f"[SKIP] {number:03d} 이미지를 찾지 못했습니다.")
            continue

        if len(matches) > 1:
            raise RuntimeError(
                f"{number:03d} 이미지가 여러 개 발견되었습니다: "
                + ", ".join(p.name for p in matches)
            )

        images.append((number, matches[0]))

    return images


# ============================================================
# 워터마크
# ============================================================

def text_bbox(draw, text, font):
    box = draw.textbbox((0, 0), text, font=font)
    return box[2] - box[0], box[3] - box[1]


def draw_watermark(image, font_path):
    width, height = image.size

    overlay = Image.new(
        "RGBA",
        image.size,
        (0, 0, 0, 0)
    )

    draw = ImageDraw.Draw(overlay)

    font_size = max(16, int(width * SITE_FONT_RATIO))
    font = ImageFont.truetype(font_path, font_size)

    text_w, text_h = text_bbox(
        draw,
        SITE_TEXT,
        font
    )

    pad_x = int(width * SITE_BOX_PAD_X_RATIO)
    pad_y = int(height * SITE_BOX_PAD_Y_RATIO)

    text_x = (width - text_w) / 2

    text_y = (
        height
        - int(height * SITE_BOTTOM_MARGIN_RATIO)
        - text_h
    )

    box = [
        text_x - pad_x,
        text_y - pad_y,
        text_x + text_w + pad_x,
        text_y + text_h + pad_y,
    ]

    draw.rounded_rectangle(
        box,
        radius=max(8, int(width * 0.012)),
        fill=SITE_BOX_COLOR
    )

    draw.text(
        (text_x, text_y),
        SITE_TEXT,
        font=font,
        fill=SITE_TEXT_COLOR
    )

    return Image.alpha_composite(
        image.convert("RGBA"),
        overlay
    )


# ============================================================
# 실제 작업
# ============================================================

def add_watermarks(folder: Path):
    images = find_target_images(folder)

    if not images:
        raise FileNotFoundError(
            "001~006 PNG 이미지를 찾지 못했습니다."
        )

    font_path = find_font()

    print()
    print("===== 워터마크 적용 시작 =====")
    print()

    for number, image_path in images:
        image = Image.open(image_path).convert("RGBA")

        result = draw_watermark(
            image,
            font_path
        )

        # 기존 001~006 파일에 그대로 덮어쓰기
        result.convert("RGB").save(
            image_path,
            "PNG",
            optimize=True
        )

        print(
            f"[{number:03d}] {image_path.name}"
            f" -> {SITE_TEXT}"
        )

    print()
    print("==========================================")
    print(f"완료: {len(images)}장 워터마크 적용")
    print(f"폴더: {folder}")
    print("==========================================")


# ============================================================
# MAIN
# ============================================================

def main():
    try:
        lang = ask_language()

        folder = choose_folder(lang)

        print()
        print("선택:")
        print(folder)
        print()

        add_watermarks(folder)

    except KeyboardInterrupt:
        print()
        print("사용자가 작업을 취소했습니다.")
        sys.exit(1)

    except Exception as e:
        print()
        print("ERROR")
        print(e)
        sys.exit(1)


if __name__ == "__main__":
    main()