#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# ============================================================
# 마무리 CTA 아웃트로 (2026-08 추가)
#
# 본편(6장 대화 장면) 뒤에 outro_cta_tiktok.png를 마지막 장면으로
# 이어붙인다. 이 이미지는 remove_old_watermark()/add_tiktok_overlay()를
# 거치지 않는다 -- 6장의 대화 장면과 달리 이미 완성된 별도 CTA 그래픽을
# 그대로 붙이는 것뿐이다. append_outro_cta() 참고.
# ============================================================

import re
import sys
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter


# ============================================================
# 경로
# ============================================================

ROOT = Path(
    "/Users/junghasuk/Desktop/ManyLangs/web/youtube/conversation"
)

TIKTOK_ROOT = Path(
    "/Users/junghasuk/Desktop/ManyLangs/web/youtube/tiktok"
)

LEVEL_PREFIXES = (
    "a1_", "a2_", "b1_", "b2_",
    "c1_", "c2_"
)


# ============================================================
# 마무리 CTA 아웃트로
#
# 6장 대화 장면과 달리, 이 이미지는 워터마크 제거(remove_old_watermark)나
# TikTok 안내 오버레이(add_tiktok_overlay)를 거치지 않는다 -- 이미 완성된
# 별도의 CTA 그래픽을 영상 맨 끝에 그대로 한 장면 추가하는 것뿐이다.
# ============================================================

OUTRO_ASSET_TIKTOK = ROOT / "outro_cta_tiktok.png"
OUTRO_DURATION = 0.8


# ============================================================
# 기존 워터마크 설정
#
# make_watermark.py와 동일한 값.
# 이 값으로 기존 www.manylangs.studio 위치를 역산한다.
# ============================================================

OLD_SITE_TEXT = "www.manylangs.studio"

OLD_SITE_FONT_RATIO = 0.026
OLD_SITE_BOTTOM_MARGIN_RATIO = 0.245

OLD_SITE_BOX_PAD_X_RATIO = 0.018
OLD_SITE_BOX_PAD_Y_RATIO = 0.010


# ============================================================
# TikTok 새 안내
#
# 워터마크(이미지)에는 영어만 표시한다.
# 설명란(caption)에는 7개 언어로 번역해서 모두 붙인다.
# ============================================================

TRANSLATION_TITLE = "Translations available in"

TRANSLATION_LANGUAGES_LINE_1 = (
    "English · Español · Français · Português"
)

TRANSLATION_LANGUAGES_LINE_2 = (
    "한국어 · 中文 · 日本語 · Русский"
)

SITE_TEXT = "www.manylangs.studio"

# 워터마크(이미지)용 - 영어 고정, "?" 기준으로 2줄 분리
TRIAL_TEXT_LINE_1 = "Want a 7-day free trial?"
TRIAL_TEXT_LINE_2 = "Comment the language you want to learn."

# 설명란(caption)용 - 7개 언어 번역
TRIAL_TRANSLATIONS = {
    "en": "Want a 7-day free trial? Comment the language you want to learn.",
    "es": "¿Quieres una prueba gratis de 7 días? Comenta el idioma que quieres aprender.",
    "fr": "Envie d'un essai gratuit de 7 jours ? Commente la langue que tu veux apprendre.",
    "pt": "Quer um teste grátis de 7 dias? Comente o idioma que você quer aprender.",
    "kr": "7일 무료체험을 원하시나요? 배우고 싶은 언어를 댓글로 남겨주세요.",
    "zh": "想要7天免费试용吗?在评论区留下你想学的语言。",
    "jp": "7日間の無料体験はいかがですか?学びたい言語をコメントしてください。",
    "ru": "Хотите 7 дней бесплатного пробного периода? Напишите в комментариях, какой язык хотите выучить.",
}


# ============================================================
# 언어 코드 -> 표시 이름 (캡션 제목 줄, 언어 선택 메뉴에 사용)
#
# 다른 파이프라인 스크립트(youtube_upload.py, assemble_video.py,
# assemble_social.py, post_facebook.py, post_instagram.py,
# build_x_post.py, watermark 스크립트 등)와 동일하게, 내부 관리
# 코드는 이 딕셔너리의 키를 그대로 쓴다 (일본어는 내부적으로 "jp").
# 새 언어를 추가/삭제/순서 변경하고 싶으면 이 딕셔너리만 수정하면
# 되고, 언어 선택 메뉴의 번호는 등록 순서대로 자동으로 매겨진다.
# ============================================================

LANGUAGE_NAMES = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "pt": "Portuguese",
    "kr": "Korean",
    "zh": "Chinese",
    "jp": "Japanese",
    "ru": "Russian",
}


# ============================================================
# TikTok 안내 디자인
# ============================================================

# 기존보다 확실히 크게
MAIN_FONT_RATIO = 0.034

# 제목도 확대
TITLE_FONT_RATIO = 0.030

# 박스
BOX_WIDTH_RATIO = 0.94

BOX_PAD_X_RATIO = 0.025
BOX_PAD_Y_RATIO = 0.030

BOX_COLOR = (0, 0, 0, 155)

TEXT_COLOR = (255, 255, 255, 255)

# 각 줄 사이 간격 (기존 값 유지)
LINE_GAP_RATIO = 0.006

# 정보 그룹 사이 간격 (기존 값 유지)
GROUP_GAP_RATIO = 0.014

# 박스 하단 위치 (기존 0.175에서 더 아래로 내림)
BOX_BOTTOM_MARGIN_RATIO = 0.17


# ============================================================
# Unicode 폰트
# ============================================================

def find_font_candidates():
    """
    Latin / Korean / Chinese / Japanese가 모두 들어가는
    TikTok 안내문용 macOS 폰트 후보.

    Arial Unicode가 있으면 최우선.
    없으면 Apple/PingFang/Hiragino를 fallback으로 사용한다.
    """

    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/Library/Fonts/Arial Unicode.ttf",
        "/System/Library/Fonts/AppleSDGothicNeo.ttc",
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc",
        "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
    ]

    found = [
        path
        for path in candidates
        if Path(path).exists()
    ]

    if not found:
        raise FileNotFoundError(
            "사용 가능한 Unicode 폰트를 찾지 못했습니다."
        )

    return found


def find_unicode_font():
    """
    기존 코드와의 호환성을 위해 대표 폰트 하나 반환.
    Arial Unicode가 존재하면 이것이 선택된다.
    """
    return find_font_candidates()[0]


# ============================================================
# 언어 입력
#
# 약어를 직접 타이핑하지 않고, LANGUAGE_NAMES에 등록된 순서대로
# 번호를 매겨 보여준 뒤 번호로 선택한다. 언어를 추가/삭제/순서
# 변경하고 싶으면 LANGUAGE_NAMES 딕셔너리만 수정하면 된다.
# ============================================================

def ask_language():
    print()
    print("==========================================")
    print(" ManyLangs TikTok Video Generator")
    print("==========================================")
    print()

    codes = list(LANGUAGE_NAMES.keys())

    print("지원 언어:")
    for i, code in enumerate(codes, start=1):
        print(f"  {i:>2} - {code} ({LANGUAGE_NAMES[code]})")

    print()

    choice = input("번호 입력: ").strip()

    if not choice.isdigit() or not (1 <= int(choice) <= len(codes)):
        print("잘못된 번호입니다.")
        sys.exit(1)

    lang = codes[int(choice) - 1]

    lang_dir = ROOT / lang

    if not lang_dir.exists():
        print()
        print(f"언어 폴더가 없습니다:")
        print(lang_dir)
        sys.exit(1)

    return lang


# ============================================================
# 대화 폴더 검색
# ============================================================

def find_conversation_folders(lang):
    lang_dir = ROOT / lang

    folders = []

    for path in lang_dir.iterdir():

        if not path.is_dir():
            continue

        name = path.name.lower()

        if name.startswith(LEVEL_PREFIXES):
            folders.append(path)

    def sort_key(path):

        name = path.name.lower()

        level_index = 999

        for i, prefix in enumerate(LEVEL_PREFIXES):
            if name.startswith(prefix):
                level_index = i
                break

        return (
            level_index,
            name
        )

    folders.sort(key=sort_key)

    return folders


def choose_folder(lang):
    folders = find_conversation_folders(lang)

    if not folders:
        raise FileNotFoundError(
            f"{lang} 폴더에서 대화 폴더를 찾지 못했습니다."
        )

    print()
    print(f"===== {lang.upper()} 대화 폴더 =====")
    print()

    for i, folder in enumerate(folders, 1):
        print(
            f"{i:3d}. {folder.name}"
        )

    print()

    while True:

        value = input(
            "작업할 폴더 번호를 입력하세요: "
        ).strip()

        try:
            number = int(value)

        except ValueError:
            print("숫자로 입력해주세요.")
            continue

        if 1 <= number <= len(folders):
            return folders[number - 1]

        print(
            f"1~{len(folders)} 사이의 번호를 입력해주세요."
        )


# ============================================================
# 001~006 PNG 찾기
# ============================================================

def find_target_images(folder):
    images = []

    for number in range(1, 7):

        suffix = f"_{number:03d}.png"

        matches = [
            p
            for p in folder.glob("*.png")
            if p.name.endswith(suffix)
        ]

        if not matches:
            raise FileNotFoundError(
                f"{number:03d} PNG를 찾지 못했습니다."
            )

        if len(matches) > 1:
            raise RuntimeError(
                f"{number:03d} PNG가 여러 개 있습니다: "
                + ", ".join(
                    p.name for p in matches
                )
            )

        images.append(
            (
                number,
                matches[0]
            )
        )

    return images


# ============================================================
# Text bbox
# ============================================================

def get_text_size(draw, text, font):

    bbox = draw.textbbox(
        (0, 0),
        text,
        font=font
    )

    return (
        bbox[2] - bbox[0],
        bbox[3] - bbox[1]
    )


# ============================================================
# 기존 워터마크 영역 정확히 역산
# ============================================================

def get_old_watermark_box(
    image,
    font_path
):
    width, height = image.size

    dummy = Image.new(
        "RGBA",
        image.size,
        (0, 0, 0, 0)
    )

    draw = ImageDraw.Draw(dummy)

    font_size = max(
        16,
        int(
            width
            * OLD_SITE_FONT_RATIO
        )
    )

    font = ImageFont.truetype(
        font_path,
        font_size
    )

    text_w, text_h = get_text_size(
        draw,
        OLD_SITE_TEXT,
        font
    )

    pad_x = int(
        width
        * OLD_SITE_BOX_PAD_X_RATIO
    )

    pad_y = int(
        height
        * OLD_SITE_BOX_PAD_Y_RATIO
    )

    text_x = (
        width - text_w
    ) / 2

    text_y = (
        height
        - int(
            height
            * OLD_SITE_BOTTOM_MARGIN_RATIO
        )
        - text_h
    )

    left = int(
        text_x - pad_x
    )

    top = int(
        text_y - pad_y
    )

    right = int(
        text_x
        + text_w
        + pad_x
    )

    bottom = int(
        text_y
        + text_h
        + pad_y
    )

    return (
        left,
        top,
        right,
        bottom
    )


# ============================================================
# 기존 워터마크 제거
#
# 이미 픽셀에 합성된 워터마크이므로 원본 픽셀을
# 수학적으로 되살릴 수는 없다.
#
# 대신 워터마크 바로 위/아래 주변 이미지 정보를
# 사용하여 자연스럽게 복원한다.
# ============================================================

def remove_old_watermark(
    image,
    font_path
):
    image = image.convert("RGB")

    width, height = image.size

    (
        left,
        top,
        right,
        bottom
    ) = get_old_watermark_box(
        image,
        font_path
    )

    # 실제 워터마크 가장자리까지 확실하게 포함
    extra_x = max(
        8,
        int(width * 0.012)
    )

    extra_y = max(
        8,
        int(height * 0.008)
    )

    left = max(
        0,
        left - extra_x
    )

    right = min(
        width,
        right + extra_x
    )

    top = max(
        0,
        top - extra_y
    )

    bottom = min(
        height,
        bottom + extra_y
    )

    region_w = (
        right - left
    )

    region_h = (
        bottom - top
    )

    # ----------------------------------------
    # 워터마크 바로 위쪽의 깨끗한 영역을 가져온다.
    # ----------------------------------------

    sample_gap = max(
        4,
        int(height * 0.004)
    )

    sample_bottom = max(
        1,
        top - sample_gap
    )

    sample_top = max(
        0,
        sample_bottom - region_h
    )

    sample = image.crop(
        (
            left,
            sample_top,
            right,
            sample_bottom
        )
    )

    # 높이가 부족할 경우 resize
    if sample.size != (
        region_w,
        region_h
    ):

        sample = sample.resize(
            (
                region_w,
                region_h
            ),
            Image.Resampling.LANCZOS
        )

    # ----------------------------------------
    # 약한 blur를 적용해 복원 경계가 튀는 것을 방지
    # ----------------------------------------

    sample = sample.filter(
        ImageFilter.GaussianBlur(
            radius=max(
                1,
                width * 0.0015
            )
        )
    )

    # ----------------------------------------
    # 원본 영역에 붙인다.
    # ----------------------------------------

    image.paste(
        sample,
        (
            left,
            top
        )
    )

    # ----------------------------------------
    # 경계 부분을 조금 더 자연스럽게 처리
    # ----------------------------------------

    feather = max(
        4,
        int(width * 0.008)
    )

    blend_left = max(
        0,
        left - feather
    )

    blend_top = max(
        0,
        top - feather
    )

    blend_right = min(
        width,
        right + feather
    )

    blend_bottom = min(
        height,
        bottom + feather
    )

    blended = image.crop(
        (
            blend_left,
            blend_top,
            blend_right,
            blend_bottom
        )
    )

    blurred = blended.filter(
        ImageFilter.GaussianBlur(
            radius=max(
                1,
                width * 0.001
            )
        )
    )

    # 너무 강한 blur가 되지 않도록
    # 약하게 혼합
    blended = Image.blend(
        blended,
        blurred,
        0.12
    )

    image.paste(
        blended,
        (
            blend_left,
            blend_top
        )
    )

    return image


# ============================================================
# Emoji 안전 처리
#
# macOS 일반 폰트에서 emoji glyph가 □로 나오는 문제를
# 막기 위해 아이콘은 직접 벡터 형태로 그린다.
# ============================================================

def draw_globe_icon(
    draw,
    center_x,
    center_y,
    size,
    color
):
    r = size / 2

    box = (
        center_x - r,
        center_y - r,
        center_x + r,
        center_y + r
    )

    stroke = max(
        2,
        int(size * 0.08)
    )

    draw.ellipse(
        box,
        outline=color,
        width=stroke
    )

    draw.line(
        (
            center_x - r,
            center_y,
            center_x + r,
            center_y
        ),
        fill=color,
        width=stroke
    )

    draw.ellipse(
        (
            center_x - r * 0.45,
            center_y - r,
            center_x + r * 0.45,
            center_y + r
        ),
        outline=color,
        width=stroke
    )


def draw_gift_icon(
    draw,
    center_x,
    center_y,
    size,
    color
):
    stroke = max(
        2,
        int(size * 0.08)
    )

    half = size / 2

    # box
    draw.rectangle(
        (
            center_x - half * 0.75,
            center_y - half * 0.15,
            center_x + half * 0.75,
            center_y + half * 0.75
        ),
        outline=color,
        width=stroke
    )

    # ribbon vertical
    draw.line(
        (
            center_x,
            center_y - half * 0.15,
            center_x,
            center_y + half * 0.75
        ),
        fill=color,
        width=stroke
    )

    # lid
    draw.line(
        (
            center_x - half * 0.9,
            center_y - half * 0.15,
            center_x + half * 0.9,
            center_y - half * 0.15
        ),
        fill=color,
        width=stroke
    )

    # bow
    draw.arc(
        (
            center_x - half * 0.65,
            center_y - half * 0.75,
            center_x,
            center_y
        ),
        190,
        350,
        fill=color,
        width=stroke
    )

    draw.arc(
        (
            center_x,
            center_y - half * 0.75,
            center_x + half * 0.65,
            center_y
        ),
        190,
        350,
        fill=color,
        width=stroke
    )


# ============================================================
# 가운데 정렬 텍스트
# ============================================================

def draw_centered_text(
    draw,
    text,
    font,
    center_x,
    y,
    fill
):
    text_w, text_h = get_text_size(
        draw,
        text,
        font
    )

    x = center_x - (
        text_w / 2
    )

    draw.text(
        (
            x,
            y
        ),
        text,
        font=font,
        fill=fill
    )

    return text_h


# ============================================================
# 아이콘 + 텍스트 가운데 정렬
# ============================================================

def draw_icon_text_row(
    draw,
    text,
    font,
    center_x,
    y,
    icon_type,
    fill
):
    text_w, text_h = get_text_size(
        draw,
        text,
        font
    )

    icon_size = int(
        text_h * 0.95
    )

    gap = int(
        icon_size * 0.42
    )

    total_w = (
        icon_size
        + gap
        + text_w
    )

    start_x = (
        center_x
        - total_w / 2
    )

    icon_center_x = (
        start_x
        + icon_size / 2
    )

    icon_center_y = (
        y
        + text_h / 2
    )

    if icon_type == "globe":

        draw_globe_icon(
            draw,
            icon_center_x,
            icon_center_y,
            icon_size,
            fill
        )

    elif icon_type == "gift":

        draw_gift_icon(
            draw,
            icon_center_x,
            icon_center_y,
            icon_size,
            fill
        )

    text_x = (
        start_x
        + icon_size
        + gap
    )

    draw.text(
        (
            text_x,
            y
        ),
        text,
        font=font,
        fill=fill
    )

    return text_h


# ============================================================
# TikTok 새 안내 박스
# ============================================================

def add_tiktok_overlay(
    image,
    font_path
):
    image = image.convert("RGBA")

    width, height = image.size

    overlay = Image.new(
        "RGBA",
        image.size,
        (0, 0, 0, 0)
    )

    draw = ImageDraw.Draw(
        overlay
    )

    title_size = max(
        24,
        int(
            width
            * TITLE_FONT_RATIO
        )
    )

    main_size = max(
        28,
        int(
            width
            * MAIN_FONT_RATIO
        )
    )

    title_font = ImageFont.truetype(
        font_path,
        title_size
    )

    main_font = ImageFont.truetype(
        font_path,
        main_size
    )

    # ----------------------------------------
    # 각 텍스트 크기
    # ----------------------------------------

    _, title_h = get_text_size(
        draw,
        TRANSLATION_TITLE,
        title_font
    )

    _, langs_1_h = get_text_size(
        draw,
        TRANSLATION_LANGUAGES_LINE_1,
        main_font
    )

    _, langs_2_h = get_text_size(
        draw,
        TRANSLATION_LANGUAGES_LINE_2,
        main_font
    )

    _, site_h = get_text_size(
        draw,
        SITE_TEXT,
        main_font
    )

    _, trial_1_h = get_text_size(
        draw,
        TRIAL_TEXT_LINE_1,
        main_font
    )

    _, trial_2_h = get_text_size(
        draw,
        TRIAL_TEXT_LINE_2,
        main_font
    )

    line_gap = int(
        height
        * LINE_GAP_RATIO
    )

    group_gap = int(
        height
        * GROUP_GAP_RATIO
    )

    pad_y = int(
        height
        * BOX_PAD_Y_RATIO
    )

    content_height = (
        title_h
        + line_gap
        + langs_1_h
        + line_gap
        + langs_2_h
        + group_gap
        + site_h
        + group_gap
        + trial_1_h
        + line_gap
        + trial_2_h
    )

    box_height = (
        content_height
        + pad_y * 2
    )

    box_width = int(
        width
        * BOX_WIDTH_RATIO
    )

    box_left = int(
        (
            width
            - box_width
        ) / 2
    )

    box_right = (
        box_left
        + box_width
    )

    box_bottom = int(
        height
        - (
            height
            * BOX_BOTTOM_MARGIN_RATIO
        )
    )

    box_top = int(
        box_bottom
        - box_height
    )

    radius = max(
        18,
        int(
            width
            * 0.025
        )
    )

    draw.rounded_rectangle(
        (
            box_left,
            box_top,
            box_right,
            box_bottom
        ),
        radius=radius,
        fill=BOX_COLOR
    )

    center_x = (
        width / 2
    )

    y = (
        box_top
        + pad_y
    )

    # ----------------------------------------
    # Translations available in
    # ----------------------------------------

    h = draw_centered_text(
        draw,
        TRANSLATION_TITLE,
        title_font,
        center_x,
        y,
        TEXT_COLOR
    )

    y += (
        h
        + line_gap
    )

    # ----------------------------------------
    # 언어 (1줄: 영어권, 2줄: 한중일)
    # ----------------------------------------

    h = draw_centered_text(
        draw,
        TRANSLATION_LANGUAGES_LINE_1,
        main_font,
        center_x,
        y,
        TEXT_COLOR
    )

    y += (
        h
        + line_gap
    )

    h = draw_centered_text(
        draw,
        TRANSLATION_LANGUAGES_LINE_2,
        main_font,
        center_x,
        y,
        TEXT_COLOR
    )

    y += (
        h
        + group_gap
    )

    # ----------------------------------------
    # 홈페이지
    # ----------------------------------------

    h = draw_icon_text_row(
        draw,
        SITE_TEXT,
        main_font,
        center_x,
        y,
        "globe",
        TEXT_COLOR
    )

    y += (
        h
        + group_gap
    )

    # ----------------------------------------
    # 무료 체험 (워터마크는 영어만 표시, "?" 기준 2줄)
    # 1번째 줄에만 gift 아이콘을 붙인다.
    # ----------------------------------------

    h = draw_icon_text_row(
        draw,
        TRIAL_TEXT_LINE_1,
        main_font,
        center_x,
        y,
        "gift",
        TEXT_COLOR
    )

    y += (
        h
        + line_gap
    )

    draw_centered_text(
        draw,
        TRIAL_TEXT_LINE_2,
        main_font,
        center_x,
        y,
        TEXT_COLOR
    )

    return Image.alpha_composite(
        image,
        overlay
    )


# ============================================================
# TikTok PNG 생성
# ============================================================

def create_tiktok_images(
    source_folder,
    output_folder
):
    output_folder.mkdir(
        parents=True,
        exist_ok=True
    )

    font_path = find_unicode_font()

    source_images = find_target_images(
        source_folder
    )

    generated = []

    print()
    print(
        "===== TikTok PNG 생성 ====="
    )
    print()

    for number, source_path in source_images:

        output_path = (
            output_folder
            / source_path.name
        )

        print(
            f"[{number:03d}] "
            f"{source_path.name}"
        )

        # ------------------------------------
        # 원본 읽기
        # ------------------------------------

        image = Image.open(
            source_path
        ).convert(
            "RGB"
        )

        # ------------------------------------
        # 기존 워터마크 제거
        # ------------------------------------

        image = remove_old_watermark(
            image,
            font_path
        )

        # ------------------------------------
        # TikTok 안내 추가
        # ------------------------------------

        image = add_tiktok_overlay(
            image,
            font_path
        )

        # ------------------------------------
        # TikTok 전용 복사본 저장
        # 원본에는 절대 저장하지 않는다.
        # ------------------------------------

        image.convert(
            "RGB"
        ).save(
            output_path,
            "PNG",
            optimize=True
        )

        generated.append(
            (
                number,
                output_path
            )
        )

    return generated


# ============================================================
# SRT 시간 읽기
# ============================================================

def srt_time_to_seconds(value):

    value = value.strip()

    match = re.match(
        r"(\d+):(\d+):(\d+),(\d+)",
        value
    )

    if not match:
        raise ValueError(
            f"잘못된 SRT 시간: {value}"
        )

    h, m, s, ms = map(
        int,
        match.groups()
    )

    return (
        h * 3600
        + m * 60
        + s
        + ms / 1000.0
    )


def get_scene_durations(
    source_folder
):
    # target.srt 우선
    candidates = list(
        source_folder.glob(
            "*.target.srt"
        )
    )

    if not candidates:
        # target이 없다면 폴더 언어 SRT
        candidates = [
            p
            for p in source_folder.glob(
                "*.srt"
            )
            if ".all.srt"
            not in p.name
            and ".target.srt"
            not in p.name
        ]

    if not candidates:
        raise FileNotFoundError(
            "영상 길이를 계산할 SRT를 찾지 못했습니다."
        )

    srt_path = candidates[0]

    content = srt_path.read_text(
        encoding="utf-8-sig"
    )

    pattern = re.compile(
        r"(\d+)\s*\n"
        r"(\d{2}:\d{2}:\d{2},\d{3})"
        r"\s*-->\s*"
        r"(\d{2}:\d{2}:\d{2},\d{3})",
        re.MULTILINE
    )

    entries = []

    for match in pattern.finditer(
        content
    ):

        number = int(
            match.group(1)
        )

        start = srt_time_to_seconds(
            match.group(2)
        )

        end = srt_time_to_seconds(
            match.group(3)
        )

        entries.append(
            (
                number,
                start,
                end
            )
        )

    entries.sort(
        key=lambda x: x[0]
    )

    if len(entries) < 6:
        raise RuntimeError(
            "SRT에서 6개 장면 시간을 찾지 못했습니다."
        )

    durations = []

    for i in range(6):

        current = entries[i]

        start = current[1]

        if i < 5:
            next_start = entries[i + 1][1]

            duration = (
                next_start - start
            )

        else:
            duration = (
                current[2] - start
            )

        if duration <= 0:
            raise RuntimeError(
                f"{i + 1}번 장면 길이가 잘못되었습니다."
            )

        durations.append(
            duration
        )

    return durations


# ============================================================
# MP3 검색
# ============================================================

def find_audio(
    source_folder
):
    mp3_files = list(
        source_folder.glob(
            "*.mp3"
        )
    )

    if not mp3_files:
        raise FileNotFoundError(
            "MP3 파일을 찾지 못했습니다."
        )

    if len(mp3_files) == 1:
        return mp3_files[0]

    # 폴더명.mp3 우선
    expected = (
        source_folder
        / f"{source_folder.name}.mp3"
    )

    if expected.exists():
        return expected

    raise RuntimeError(
        "MP3 파일이 여러 개라 선택할 수 없습니다: "
        + ", ".join(
            p.name
            for p in mp3_files
        )
    )


# ============================================================
# FFmpeg concat 파일
# ============================================================

def make_concat_file(
    images,
    durations,
    output_folder
):
    concat_path = (
        output_folder
        / "_tiktok_concat.txt"
    )

    lines = []

    for (
        (
            number,
            image_path
        ),
        duration
    ) in zip(
        images,
        durations
    ):

        safe_path = str(
            image_path
        ).replace(
            "'",
            "'\\''"
        )

        lines.append(
            f"file '{safe_path}'"
        )

        lines.append(
            f"duration {duration:.6f}"
        )

    # concat demuxer는 마지막 이미지를
    # 한 번 더 적어주는 것이 안전하다.
    last_path = str(
        images[-1][1]
    ).replace(
        "'",
        "'\\''"
    )

    lines.append(
        f"file '{last_path}'"
    )

    concat_path.write_text(
        "\n".join(lines)
        + "\n",
        encoding="utf-8"
    )

    return concat_path


# ============================================================
# TikTok MP4 생성
# ============================================================

def create_tiktok_video(
    source_folder,
    output_folder,
    images
):
    durations = get_scene_durations(
        source_folder
    )

    audio_path = find_audio(
        source_folder
    )

    concat_path = make_concat_file(
        images,
        durations,
        output_folder
    )

    output_video = (
        output_folder
        / (
            source_folder.name
            + "_tiktok.mp4"
        )
    )

    print()
    print(
        "===== TikTok MP4 생성 ====="
    )
    print()

    # ----------------------------------------
    # 중요:
    # libx264는 width / height가 짝수여야 한다.
    #
    # 현재 941x1672 같은 이미지도 있으므로
    # scale=trunc(iw/2)*2:trunc(ih/2)*2
    # 로 자동 보정한다.
    # ----------------------------------------

    video_filter = (
        "scale="
        "trunc(iw/2)*2:"
        "trunc(ih/2)*2"
    )

    command = [
        "ffmpeg",
        "-y",

        "-f",
        "concat",

        "-safe",
        "0",

        "-i",
        str(concat_path),

        "-i",
        str(audio_path),

        "-vf",
        video_filter,

        "-r",
        "30",

        "-c:v",
        "libx264",

        "-preset",
        "medium",

        "-crf",
        "18",

        "-pix_fmt",
        "yuv420p",

        "-c:a",
        "aac",

        # mono 24kHz 음원에 192k는 불필요하게 높음
        "-b:a",
        "128k",

        "-shortest",

        "-movflags",
        "+faststart",

        str(output_video)
    ]

    print(
        " ".join(
            command
        )
    )

    print()

    subprocess.run(
        command,
        check=True
    )

    return output_video


def probe_video_dimensions(video_path):
    """ffprobe로 완성된 비디오의 실제 가로/세로 픽셀을 읽어온다.
    아웃트로 이미지를 이 크기에 정확히 맞춰야 concat 시 화면이 안 어긋난다."""
    command = [
        "ffprobe", "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "csv=s=x:p=0",
        str(video_path),
    ]

    result = subprocess.run(command, capture_output=True, text=True, check=True)
    width_str, height_str = result.stdout.strip().split("x")

    return int(width_str), int(height_str)


def normalize_tiktok_outro(outro_path, out_path, duration, width, height):
    """outro_cta_tiktok.png를 본편과 동일한 해상도/코덱/프레임레이트로 맞춘
    독립 클립 하나로 만든다 (make_watermark류의 워터마크 오버레이는 이 클립에
    전혀 적용하지 않는다 -- 이미 완성된 CTA 그래픽을 그대로 쓴다). 무음 오디오를
    붙여서 본편과 오디오 스트림 구조도 맞춘다."""
    command = [
        "ffmpeg", "-y",
        "-loop", "1",
        "-i", str(outro_path),
        "-f", "lavfi",
        "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
        "-filter_complex",
        (
            f"[0:v]"
            f"scale={width}:{height}:"
            f"force_original_aspect_ratio=decrease,"
            f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,"
            f"fps=30,"
            f"setsar=1"
            f"[v]"
        ),
        "-map", "[v]",
        "-map", "1:a",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "128k",
        "-t", f"{duration:.3f}",
        "-shortest",
        str(out_path),
    ]

    print()
    print("===== 아웃트로 CTA 정규화 =====")
    print()
    print(" ".join(command))
    print()

    subprocess.run(command, check=True)


def concat_tiktok_outro(main_video_path, outro_clip_path, final_output_path, output_folder):
    """
    본편 뒤에 CTA를 붙인다.

    중요:
    예전 방식의 `-c copy` concat은 본편과 CTA의 오디오 stream timebase /
    sample format 등이 미세하게 다를 때 timestamp가 비정상적으로 이어져
    실제 약 20초 영상이 약 40초로 표시되는 문제가 생길 수 있다.

    따라서 두 입력을 filter_complex concat으로 연결하고 최종 파일을
    한 번 정상 재인코딩한다. 본편의 장면 타이밍 자체는 건드리지 않는다.
    """
    command = [
        "ffmpeg", "-y",

        "-i", str(main_video_path),
        "-i", str(outro_clip_path),

        "-filter_complex",
        (
            "[0:v]"
            "setpts=PTS-STARTPTS,"
            "setsar=1"
            "[v0];"

            "[0:a]"
            "aresample=48000,"
            "aformat=sample_fmts=fltp:"
            "sample_rates=48000:"
            "channel_layouts=stereo,"
            "asetpts=PTS-STARTPTS"
            "[a0];"

            "[1:v]"
            "setpts=PTS-STARTPTS,"
            "setsar=1"
            "[v1];"

            "[1:a]"
            "aresample=48000,"
            "aformat=sample_fmts=fltp:"
            "sample_rates=48000:"
            "channel_layouts=stereo,"
            "asetpts=PTS-STARTPTS"
            "[a1];"

            "[v0][a0][v1][a1]"
            "concat=n=2:v=1:a=1"
            "[v][a]"
        ),

        "-map", "[v]",
        "-map", "[a]",

        "-r", "30",

        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-pix_fmt", "yuv420p",

        "-c:a", "aac",
        "-b:a", "128k",
        "-ar", "48000",
        "-ac", "2",

        "-movflags", "+faststart",

        str(final_output_path),
    ]

    print()
    print("===== 본편 + 아웃트로 CTA 합치기 =====")
    print()
    print("※ stream copy가 아니라 재인코딩 concat을 사용합니다.")
    print(" ".join(command))
    print()

    subprocess.run(
        command,
        check=True
    )

def append_outro_cta(main_video_path, output_folder):
    """create_tiktok_video()가 만든 본편(6장+오디오)에 outro_cta_tiktok.png를
    마지막 장면으로 이어붙인다. 아웃트로 자산이 없으면 건너뛰고 본편만 그대로
    최종본으로 쓴다 (기존 파일명 {base}_tiktok.mp4는 항상 최종 완성본을
    가리키도록 유지한다)."""
    if not OUTRO_ASSET_TIKTOK.exists():
        print(f"  [건너뜀] 아웃트로 CTA 자산 없음 ({OUTRO_ASSET_TIKTOK}) -- 본편만 최종본으로 유지")
        return main_video_path

    width, height = probe_video_dimensions(main_video_path)

    outro_clip_path = output_folder / "_tiktok_outro_norm.mp4"
    normalize_tiktok_outro(OUTRO_ASSET_TIKTOK, outro_clip_path, OUTRO_DURATION, width, height)

    main_only_path = main_video_path.with_name(main_video_path.stem + "_main_only.mp4")
    main_video_path.rename(main_only_path)

    concat_tiktok_outro(main_only_path, outro_clip_path, main_video_path, output_folder)

    main_only_path.unlink(missing_ok=True)
    outro_clip_path.unlink(missing_ok=True)

    return main_video_path




GENERAL_HASHTAGS = [
    "#LanguageLearning",
    "#ManyLangs",
]


def extract_level(folder_name):
    """
    폴더명 맨 앞의 a1_ ~ c2_ 를 레벨로 추출한다.
    """
    match = re.match(
        r"^([abc][12])_",
        folder_name,
        re.IGNORECASE
    )

    if not match:
        raise ValueError(
            f"레벨을 폴더명에서 찾을 수 없습니다:\n{folder_name}"
        )

    return match.group(1).upper()


def folder_name_to_title(folder_name):
    """
    a1_asking_for_directions -> Asking For Directions
    """
    name = re.sub(
        r"^[abc][12]_",
        "",
        folder_name,
        flags=re.IGNORECASE
    )

    words = [
        word
        for word in name.split("_")
        if word
    ]

    return " ".join(
        word.capitalize()
        for word in words
    )


def topic_to_hashtag(
    folder_name
):
    # a1_, b2_ 등 제거
    topic = re.sub(
        r"^[abc][12]_",
        "",
        folder_name,
        flags=re.IGNORECASE
    )

    words = [
        word
        for word in topic.split("_")
        if word
    ]

    return "#" + "".join(
        word.capitalize()
        for word in words
    )


def get_language_hashtags(
    lang
):
    mapping = {
        "en": [
            "#LearnEnglish",
            "#EnglishConversation",
            "#EnglishSpeaking",
        ],

        "es": [
            "#LearnSpanish",
            "#SpanishConversation",
            "#SpanishSpeaking",
        ],

        "fr": [
            "#LearnFrench",
            "#FrenchConversation",
            "#FrenchSpeaking",
        ],

        "pt": [
            "#LearnPortuguese",
            "#PortugueseConversation",
            "#PortugueseSpeaking",
        ],

        "kr": [
            "#LearnKorean",
            "#KoreanConversation",
            "#KoreanSpeaking",
        ],

        "zh": [
            "#LearnChinese",
            "#ChineseConversation",
            "#ChineseSpeaking",
        ],

        "jp": [
            "#LearnJapanese",
            "#JapaneseConversation",
            "#JapaneseSpeaking",
        ],

        "ru": [
            "#LearnRussian",
            "#RussianConversation",
            "#RussianSpeaking",
        ],
    }

    return mapping.get(
        lang,
        []
    )


def create_caption_txt(
    lang,
    source_folder,
    output_folder
):
    hashtags = []

    hashtags.extend(
        get_language_hashtags(
            lang
        )
    )

    hashtags.append(
        topic_to_hashtag(
            source_folder.name
        )
    )

    hashtags.extend(
        GENERAL_HASHTAGS
    )

    # 중복 제거
    unique = []

    for tag in hashtags:
        if tag not in unique:
            unique.append(tag)

    # ------------------------------------------------------
    # 캡션 맨 위: {언어} Conversation | {레벨} | {주제}
    # ------------------------------------------------------

    language_name = LANGUAGE_NAMES.get(
        lang,
        lang.upper()
    )

    level = extract_level(
        source_folder.name
    )

    topic_title = folder_name_to_title(
        source_folder.name
    )

    title_line = (
        f"{language_name} Conversation | "
        f"{level} | "
        f"{topic_title}"
    )

    # 무료체험 안내 - 7개 언어 번역을 줄바꿈 없이 이어붙인다.
    trial_lines = "\n".join(
        f"🎁 {text}"
        for text in TRIAL_TRANSLATIONS.values()
    )

    caption = (
        title_line
        + "\n\n"
        + "🌐 www.manylangs.studio\n"
        + trial_lines
        + "\n\n"
        + " ".join(unique)
        + "\n"
    )

    output_path = (
        output_folder
        / (
            source_folder.name
            + "_tiktok_post.txt"
        )
    )

    output_path.write_text(
        caption,
        encoding="utf-8"
    )

    return output_path


# ============================================================
# MAIN
# ============================================================

def main():

    try:

        lang = ask_language()

        source_folder = choose_folder(
            lang
        )

        output_folder = (
            TIKTOK_ROOT
            / lang
            / source_folder.name
        )

        print()
        print(
            "=========================================="
        )

        print(
            "SOURCE:"
        )

        print(
            source_folder
        )

        print()

        print(
            "TIKTOK OUTPUT:"
        )

        print(
            output_folder
        )

        print(
            "=========================================="
        )

        # ------------------------------------
        # 1. TikTok용 PNG
        # ------------------------------------

        images = create_tiktok_images(
            source_folder,
            output_folder
        )

        # ------------------------------------
        # 2. TikTok MP4
        # ------------------------------------

        video_path = create_tiktok_video(
            source_folder,
            output_folder,
            images
        )

        # ------------------------------------
        # 2-1. 마무리 CTA 아웃트로 붙이기
        # ------------------------------------

        video_path = append_outro_cta(
            video_path,
            output_folder
        )

        # ------------------------------------
        # 3. TikTok 설명 TXT
        # ------------------------------------

        txt_path = create_caption_txt(
            lang,
            source_folder,
            output_folder
        )

        print()
        print(
            "=========================================="
        )

        print(
            " TikTok 생성 완료"
        )

        print(
            "=========================================="
        )

        print()

        print(
            "VIDEO:"
        )

        print(
            video_path
        )

        print()

        print(
            "CAPTION:"
        )

        print(
            txt_path
        )

        print()

        print(
            "원본 001~006 PNG:"
        )

        print(
            "수정하지 않았습니다."
        )

        print()

    except KeyboardInterrupt:

        print()
        print(
            "사용자가 작업을 취소했습니다."
        )

        sys.exit(1)

    except subprocess.CalledProcessError as e:

        print()
        print(
            "FFmpeg 실행 실패"
        )

        print(
            e
        )

        sys.exit(1)

    except Exception as e:

        print()
        print(
            "ERROR"
        )

        print(
            e
        )

        sys.exit(1)


if __name__ == "__main__":
    main()