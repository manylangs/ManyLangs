#!/usr/bin/env python3

"""

ManyLangs X Manual Post Builder

원본:

  /Users/junghasuk/Desktop/ManyLangs/web/youtube/conversation/{lang}/{folder}/

      {folder}_001.png

      ...

      {folder}_006.png

결과:

  /Users/junghasuk/Desktop/ManyLangs/web/youtube/x/{lang}/{folder}/

      {folder}_x_collage.jpg

      {folder}_x_post.txt

예:

  /Users/junghasuk/Desktop/ManyLangs/web/youtube/x/en/a1_ordering_at_a_cafe/

      a1_ordering_at_a_cafe_x_collage.jpg

      a1_ordering_at_a_cafe_x_post.txt

X API 사용 안 함.

X API 크레딧 사용 안 함.

수동 게시용 JPG + TXT만 생성.

"""

from pathlib import Path

import re

import sys

from PIL import Image, ImageOps



# ============================================================

# PATH

# ============================================================

BASE_DIR = Path(__file__).resolve().parent

# /Users/junghasuk/Desktop/ManyLangs/web/youtube

YOUTUBE_DIR = BASE_DIR.parent

# 원본 회화 이미지

CONVERSATION_DIR = YOUTUBE_DIR / "conversation"

# 결과물 저장 루트

# /Users/junghasuk/Desktop/ManyLangs/web/youtube/x

X_OUTPUT_ROOT = BASE_DIR



# ============================================================

# LANGUAGE

# ============================================================

LANGUAGES = {

    "en": "English",

    "kr": "Korean",

    "ja": "Japanese",

    "zh": "Chinese",

    "es": "Spanish",

    "fr": "French",

    "pt": "Portuguese",

    "de": "German",

}



# ============================================================

# CTA

# ============================================================

MANYLANGS_TEXT = "🌐 Grammar · Vocabulary · Idiom · Real-Life Situations · Conversation"

MANYLANGS_URL = "👉 www.manylangs.studio"

FREE_TRIAL = (

    "🎁 Want a 7-day free trial? Apply here:\n"

    "https://docs.google.com/forms/d/e/1FAIpQLSeEUOaoBonuInr1fjuC3KfWgP24aYD1wXkjnFxOsA9bm-1ExQ/viewform"

)



# ============================================================

# LANGUAGE SELECT

# ============================================================

def select_language():

    print()

    print("지원 언어:")

    for code, name in LANGUAGES.items():

        print(f"  {code} - {name}")

    print()

    lang_code = input(

        "언어 코드 입력: "

    ).strip().lower()

    if lang_code not in LANGUAGES:

        raise ValueError(

            f"지원하지 않는 언어 코드: {lang_code}"

        )

    return lang_code



# ============================================================

# FIND CONVERSATION FOLDERS

# ============================================================

def get_conversation_folders(lang_code):

    lang_dir = (

        CONVERSATION_DIR

        / lang_code

    )

    if not lang_dir.exists():

        raise FileNotFoundError(

            f"언어 폴더 없음:\n{lang_dir}"

        )

    folders = []

    for path in sorted(

        lang_dir.iterdir()

    ):

        if not path.is_dir():

            continue

        if re.match(

            r"^(a1|a2|b1|b2|c1|c2)_",

            path.name,

            re.IGNORECASE,

        ):

            folders.append(path)

    if not folders:

        raise FileNotFoundError(

            f"회화 폴더 없음:\n{lang_dir}"

        )

    return folders



# ============================================================

# SELECT CONVERSATION

# ============================================================

def select_conversation(folders):

    print()

    print("게시 가능한 폴더:")

    for index, folder in enumerate(

        folders,

        start=1,

    ):

        print(

            f"  {index:>2} - {folder.name}"

        )

    print()

    value = input(

        "번호 선택: "

    ).strip()

    if not value.isdigit():

        raise ValueError(

            "숫자를 입력하세요."

        )

    number = int(value)

    if (

        number < 1

        or number > len(folders)

    ):

        raise ValueError(

            f"잘못된 번호: {number}"

        )

    return folders[number - 1]



# ============================================================

# FIND 001 ~ 006

# ============================================================

def find_images(source_dir):

    folder_name = source_dir.name

    images = []

    for number in range(1, 7):

        filename = (

            f"{folder_name}_"

            f"{number:03d}.png"

        )

        path = (

            source_dir

            / filename

        )

        if not path.exists():

            raise FileNotFoundError(

                "이미지 없음:\n"

                f"{path}"

            )

        images.append(path)

    print()

    print(

        "[원본 이미지 6장 확인]"

    )

    for path in images:

        print(

            f"  - {path.name}"

        )

    return images



# ============================================================

# YOUTUBE URL

# ============================================================

def ask_youtube_url():

    print()

    print(

        "YouTube Shorts URL을 "

        "붙여넣으세요."

    )

    url = input(

        "YouTube URL: "

    ).strip()

    if not url:

        raise ValueError(

            "YouTube URL이 없습니다."

        )

    pattern = (

        r"^https?://"

        r"(www\.)?"

        r"(youtube\.com|youtu\.be)/"

    )

    if not re.match(

        pattern,

        url,

        re.IGNORECASE,

    ):

        raise ValueError(

            "YouTube URL 형식이 아닙니다."

        )

    return url



# ============================================================

# CREATE X OUTPUT FOLDER

# ============================================================

def create_x_output_folder(

    lang_code,

    folder_name,

):

    # 핵심:

    #

    # /youtube/x/

    #     en/

    #         a1_ordering_at_a_cafe/

    #

    # 여기에 결과물을 저장한다.

    #

    # conversation 폴더에는 절대 저장하지 않는다.

    lang_output_dir = (

        X_OUTPUT_ROOT

        / lang_code

    )

    output_dir = (

        lang_output_dir

        / folder_name

    )

    output_dir.mkdir(

        parents=True,

        exist_ok=True,

    )

    print()

    print(

        "[X 결과 폴더]"

    )

    print(

        output_dir

    )

    return output_dir



# ============================================================

# COLLAGE

# ============================================================

def create_collage(

    image_paths,

    output_dir,

    folder_name,

):

    images = []

    try:

        for path in image_paths:

            with Image.open(path) as img:

                img.load()

                images.append(

                    img.convert("RGB")

                )

        cell_width = max(

            img.width

            for img in images

        )

        cell_height = max(

            img.height

            for img in images

        )

        canvas_width = (

            cell_width * 2

        )

        canvas_height = (

            cell_height * 3

        )

        canvas = Image.new(

            "RGB",

            (

                canvas_width,

                canvas_height,

            ),

            "white",

        )

        for index, img in enumerate(

            images

        ):

            fitted = ImageOps.contain(

                img,

                (

                    cell_width,

                    cell_height,

                ),

                Image.Resampling.LANCZOS,

            )

            cell = Image.new(

                "RGB",

                (

                    cell_width,

                    cell_height,

                ),

                "white",

            )

            offset_x = (

                cell_width

                - fitted.width

            ) // 2

            offset_y = (

                cell_height

                - fitted.height

            ) // 2

            cell.paste(

                fitted,

                (

                    offset_x,

                    offset_y,

                ),

            )

            column = (

                index % 2

            )

            row = (

                index // 2

            )

            canvas.paste(

                cell,

                (

                    column

                    * cell_width,

                    row

                    * cell_height,

                ),

            )

        # ====================================================

        # 중요:

        # 결과는 conversation이 아니라

        # /youtube/x/{lang}/{folder}/

        # ====================================================

        output_path = (

            output_dir

            / (

                f"{folder_name}"

                "_x_collage.jpg"

            )

        )

        quality = 94

        while quality >= 70:

            canvas.save(

                output_path,

                "JPEG",

                quality=quality,

                optimize=True,

                progressive=True,

            )

            file_size = (

                output_path

                .stat()

                .st_size

            )

            if file_size <= 4_700_000:

                break

            quality -= 4

        # 그래도 크면 이미지 축소

        if (

            output_path

            .stat()

            .st_size

            > 4_700_000

        ):

            ratio = (

                4_500_000

                / output_path

                .stat()

                .st_size

            ) ** 0.5

            new_width = int(

                canvas.width

                * ratio

            )

            new_height = int(

                canvas.height

                * ratio

            )

            resized = canvas.resize(

                (

                    new_width,

                    new_height,

                ),

                Image.Resampling.LANCZOS,

            )

            resized.save(

                output_path,

                "JPEG",

                quality=86,

                optimize=True,

                progressive=True,

            )

        size_mb = (

            output_path

            .stat()

            .st_size

            / 1024

            / 1024

        )

        print()

        print(

            "========================================"

        )

        print(

            "X 합성사진 생성 완료"

        )

        print(

            "========================================"

        )

        print(

            f"결과 파일:\n{output_path}"

        )

        print(

            f"\n용량: {size_mb:.2f} MB"

        )

        print(

            "========================================"

        )

        return output_path

    finally:

        for img in images:

            img.close()



# ============================================================

# TITLE

# ============================================================

def get_level(folder_name):

    match = re.match(

        r"^(a1|a2|b1|b2|c1|c2)_",

        folder_name,

        re.IGNORECASE,

    )

    if not match:

        return ""

    return (

        match

        .group(1)

        .upper()

    )



def get_title(folder_name):

    title = re.sub(

        r"^(a1|a2|b1|b2|c1|c2)_",

        "",

        folder_name,

        flags=re.IGNORECASE,

    )

    words = title.split("_")

    return " ".join(

        word.capitalize()

        for word in words

        if word

    )



# ============================================================

# BUILD POST TEXT

# ============================================================

def create_post_text(

    lang_code,

    folder_name,

    youtube_url,

):

    language = (

        LANGUAGES[lang_code]

    )

    level = get_level(

        folder_name

    )

    title = get_title(

        folder_name

    )

    post_text = (

        f"{FREE_TRIAL}\n"

        "\n"

        f"{language} Conversation "

        f"| {level} | {title}\n"

        "\n"

        "🎧 Want the full audio lesson?\n"

        f"{youtube_url}\n"

        "\n"

        f"{MANYLANGS_TEXT}\n"

        f"{MANYLANGS_URL}"

    )

    return post_text



# ============================================================

# SAVE TXT

# ============================================================

def save_post_text(

    post_text,

    output_dir,

    folder_name,

):

    # 이것도 동일한 X 결과 폴더에 저장

    output_path = (

        output_dir

        / (

            f"{folder_name}"

            "_x_post.txt"

        )

    )

    output_path.write_text(

        post_text + "\n",

        encoding="utf-8",

    )

    print()

    print(

        "X 게시문 TXT 생성 완료"

    )

    print(

        f"결과 파일:\n{output_path}"

    )

    return output_path



# ============================================================

# FINAL

# ============================================================

def show_result(

    lang_code,

    folder_name,

    output_dir,

    collage_path,

    text_path,

    post_text,

):

    print()

    print(

        "========================================"

    )

    print(

        "X 수동 게시 패키지 생성 완료"

    )

    print(

        "========================================"

    )

    print(

        f"언어: {lang_code}"

    )

    print(

        f"회화: {folder_name}"

    )

    print()

    print(

        "저장 폴더:"

    )

    print(

        output_dir

    )

    print()

    print(

        "생성 파일:"

    )

    print(

        f"  1. {collage_path.name}"

    )

    print(

        f"  2. {text_path.name}"

    )

    print()

    print(

        "----------------------------------------"

    )

    print(

        "X 게시문"

    )

    print(

        "----------------------------------------"

    )

    print(

        post_text

    )

    print(

        "----------------------------------------"

    )

    print()

    print(

        "X API 사용 없음"

    )

    print(

        "API 크레딧 사용 없음"

    )

    print(

        "========================================"

    )



# ============================================================

# MAIN

# ============================================================

def main():

    print()

    print(

        "========================================"

    )

    print(

        "ManyLangs X Manual Post Builder"

    )

    print(

        "========================================"

    )

    # 1

    lang_code = (

        select_language()

    )

    # 2

    folders = (

        get_conversation_folders(

            lang_code

        )

    )

    # 3

    source_dir = (

        select_conversation(

            folders

        )

    )

    folder_name = (

        source_dir.name

    )

    # 4

    image_paths = (

        find_images(

            source_dir

        )

    )

    # 5

    youtube_url = (

        ask_youtube_url()

    )

    # 6

    # 여기서:

    # x/en/a1_ordering_at_a_cafe/

    # 생성

    output_dir = (

        create_x_output_folder(

            lang_code,

            folder_name,

        )

    )

    # 7

    # 합성 JPG도 위 X 폴더로 저장

    collage_path = (

        create_collage(

            image_paths,

            output_dir,

            folder_name,

        )

    )

    # 8

    post_text = (

        create_post_text(

            lang_code,

            folder_name,

            youtube_url,

        )

    )

    # 9

    # TXT도 같은 X 폴더로 저장

    text_path = (

        save_post_text(

            post_text,

            output_dir,

            folder_name,

        )

    )

    # 10

    show_result(

        lang_code,

        folder_name,

        output_dir,

        collage_path,

        text_path,

        post_text,

    )



# ============================================================

# START

# ============================================================

if __name__ == "__main__":

    try:

        main()

    except KeyboardInterrupt:

        print()

        print(

            "작업 취소"

        )

        sys.exit(130)

    except Exception as error:

        print()

        print(

            "========================================"

        )

        print(

            "오류 발생"

        )

        print(

            "========================================"

        )

        print(

            f"{type(error).__name__}: "

            f"{error}"

        )

        print(

            "========================================"

        )

        sys.exit(1)