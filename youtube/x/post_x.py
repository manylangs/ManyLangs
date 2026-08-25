#!/usr/bin/env python3

"""

ManyLangs X Manual Post Builder

원본:

  /Users/junghasuk/Desktop/ManyLangs/web/youtube/conversation/{lang}/{folder}/

      {folder}_001.png

      ...

      {folder}_006.png

결과:

  /Users/junghasuk/Desktop/ManyLangs/web/youtube/x/{lang}/{series}/{folder}/

      {folder}_x_collage.jpg

      {folder}_x_post.txt      <- 메인 게시글 (280자 이내로 자동 트리밍)

      {folder}_x_comment.txt   <- 댓글용 (재생목록 6개 + 자막 안내 문구)

예:

  /Users/junghasuk/Desktop/ManyLangs/web/youtube/x/en/Conversation/a1_ordering_at_a_cafe/

      a1_ordering_at_a_cafe_x_collage.jpg

      a1_ordering_at_a_cafe_x_post.txt

      a1_ordering_at_a_cafe_x_comment.txt

X API 사용 안 함.

X API 크레딧 사용 안 함.

수동 게시용 JPG + TXT만 생성.

X 자체에는 폴더/카테고리 개념이 없어서 게시 자체가 갈라지진 않지만,
언어+시리즈별로 재생목록 URL이 다르고 나중에 시리즈가 늘어나면 그 부분만
다시 뽑아야 하므로, 지금부터 언어+시리즈를 입력받아 결과물을 분리 저장한다.
지금은 conversation/ 폴더 안 내용이 전부 Conversation 시리즈이므로
우선 Conversation으로 진행하면 된다.

게시문 분리 원칙:
  - 메인 게시글(_x_post.txt): 제목(언어/시리즈/레벨/회화명) + 언어/시리즈/레벨별
    YouTube 재생목록(Playlist) A1~C2 전부 나열. 딱 이것만. 글자수 제한으로
    자르지 않고 그대로 게시한다.
  - 댓글용(_x_comment.txt): 나머지 전부 - 자막 지원 안내 문구 + 무료체험
    (7-day free trial) CTA + manylangs 태그라인 + www.manylangs.studio 링크.
    메인 게시글 등록 후 댓글로 직접 붙여넣는다.

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

    "ru": "Russian",

}


# ============================================================
# 시리즈 목록
# (assemble_social.py 와 동일 - 나중에 새 시리즈 생기면 여기에만 추가)
# ============================================================

SERIES_OPTIONS = [
    "Conversation",
    "Vocabulary",
    "Idiom",
    "Real Life Situations",
]


# ============================================================
# 언어 + 시리즈별 YouTube 재생목록(Playlist) URL
# (post_facebook.py 와 동일 구조 - 아직 채워지지 않은 조합은 빈 값)
# ============================================================

PLAYLIST_URLS = {
    "en": {
        "Conversation": {
            "A1": "https://www.youtube.com/playlist?list=PLecujUTTw6yk",
            "A2": "https://www.youtube.com/playlist?list=PLDiOC947h-mY",
            "B1": "https://www.youtube.com/playlist?list=PLUBIp6lrvTpY",
            "B2": "https://www.youtube.com/playlist?list=PLGJQm6Vja9Go",
            "C1": "https://www.youtube.com/playlist?list=PLcD_OxkqA588",
            "C2": "https://www.youtube.com/playlist?list=PLFGGbb1RZlZo",
        },
    },
    "kr": {
        "Conversation": {
            "A1": "https://www.youtube.com/playlist?list=PLNnFR8NpGgnw",
            "A2": "https://www.youtube.com/playlist?list=PLBXERw_Zru8I",
            "B1": "https://www.youtube.com/playlist?list=PLbINMQnNoqqk",
            "B2": "https://www.youtube.com/playlist?list=PLSZA9rXj52n0",
            "C1": "https://www.youtube.com/playlist?list=PLAZRUnmLKOBE",
            "C2": "https://www.youtube.com/playlist?list=PLYoQWuBIdgfk",
        },
    },
}

LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"]


def get_playlist_urls(lang_code, series_name):
    """
    해당 언어 + 시리즈 조합의 A1~C2 재생목록 URL을 전부 순서대로 반환한다.
    (빈 값이거나 아예 없는 레벨은 건너뜀 - 아직 URL이 채워지지 않은 경우)
    """
    series_playlists = PLAYLIST_URLS.get(lang_code, {}).get(series_name, {})

    entries = [
        (level, series_playlists.get(level, "").strip())
        for level in LEVEL_ORDER
    ]

    entries = [(level, url) for level, url in entries if url]

    if not entries:
        raise ValueError(
            "[플레이리스트 URL 없음] "
            f"PLAYLIST_URLS['{lang_code}']['{series_name}'] 값이 없습니다. "
            "채워주세요."
        )

    return entries


# ============================================================
# 자막 지원 언어 안내 문구
# (post_facebook.py 와 동일 - 게시하는 언어 자신은 목록에서 제외)
# ============================================================

SUBTITLE_LANGS = ["en", "es", "pt", "fr", "kr", "ja", "zh", "ru"]

SUBTITLE_LANG_NAMES = {
    "en": "English",
    "es": "Spanish",
    "pt": "Portuguese",
    "fr": "French",
    "kr": "Korean",
    "ja": "Japanese",
    "zh": "Mandarin Chinese",
    "ru": "Russian",
}


def build_subtitle_promo(lang_code, language_name):
    if lang_code in SUBTITLE_LANGS:
        other_codes = [c for c in SUBTITLE_LANGS if c != lang_code]
    else:
        other_codes = SUBTITLE_LANGS[:]

    other_names = [SUBTITLE_LANG_NAMES[c] for c in other_codes]

    if len(other_names) == 1:
        joined = other_names[0]
    else:
        joined = ", ".join(other_names[:-1]) + f", and {other_names[-1]}"

    return f"Study {language_name} conversations in {joined}!"


def build_comment_text(lang_code, language):
    subtitle_promo = build_subtitle_promo(lang_code, language)

    comment_text = (
        f"{subtitle_promo}\n"
        "\n"
        f"🎁 Want a 7-day free trial? Apply here: "
        f"https://docs.google.com/forms/d/e/1FAIpQLSeEUOaoBonuInr1fjuC3KfWgP24aYD1wXkjnFxOsA9bm-1ExQ/viewform?hl=en\n"
        "\n"
        f"📷 Grammar · Vocabulary · Idiom · Real-Life Situations · Conversation\n"
        f"📷 http://manylangs.studio"
    )

    return comment_text

# ============================================================

# CTA

# ============================================================

MANYLANGS_TEXT = "🌐 Grammar · Vocabulary · Idiom · Real-Life Situations · Conversation"

MANYLANGS_URL = "👉 www.manylangs.studio"

FREE_TRIAL = (

    "🎁 Want a 7-day free trial? Apply here:\n"

    "https://docs.google.com/forms/d/e/1FAIpQLSeEUOaoBonuInr1fjuC3KfWgP24aYD1wXkjnFxOsA9bm-1ExQ/viewform?hl=en"

)

# X 무료 계정 글자수 제한
X_CHAR_LIMIT = 280



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
# SERIES SELECT
# ============================================================

def select_series():

    print()
    print("시리즈 선택:")

    for index, name in enumerate(SERIES_OPTIONS, start=1):
        print(f"  {index} - {name}")

    print()
    value = input("번호 선택: ").strip()

    if not value.isdigit() or not (1 <= int(value) <= len(SERIES_OPTIONS)):
        raise ValueError(f"잘못된 번호: {value}")

    return SERIES_OPTIONS[int(value) - 1]



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

# CREATE X OUTPUT FOLDER

# ============================================================

def create_x_output_folder(

    lang_code,

    series_name,

    folder_name,

):

    # 핵심:

    #

    # /youtube/x/

    #     en/

    #         Conversation/

    #             a1_ordering_at_a_cafe/

    #

    # 여기에 결과물을 저장한다.

    #

    # conversation 폴더에는 절대 저장하지 않는다.

    output_dir = (

        X_OUTPUT_ROOT

        / lang_code

        / series_name

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

        # /youtube/x/{lang}/{series}/{folder}/

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

# BUILD POST TEXT (메인 게시글 + 댓글, 두 개로 분리)

# ============================================================

def build_main_post(lang_code, language, series_name, level, title):
    """
    메인 게시글: 제목 + 재생목록 6개만.
    글자수 제한을 적용하지 않는다 (회화마다 매번 바뀌는 실제 콘텐츠라
    잘리면 안 되므로 X 롱폼/스레드 등으로 그대로 게시한다).
    자막 안내 문구, 무료체험 CTA, manylangs 태그라인은 전부 댓글로 뺀다.
    """

    header = f"{language} {series_name} | {level} | {title}"

    playlist_entries = get_playlist_urls(lang_code, series_name)
    playlist_lines = "\n".join(
        f"{lvl}: {url}" for lvl, url in playlist_entries
    )

    post_text = (
        f"{header}\n"
        "\n"
        f"🎬 Watch all {language} playlists:\n"
        f"{playlist_lines}"
    )

    return post_text




def create_post_text(
    lang_code,
    series_name,
    folder_name,
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

    post_text = build_main_post(lang_code, language, series_name, level, title)
    comment_text = build_comment_text(lang_code, language)

    return post_text, comment_text



# ============================================================

# SAVE TXT

# ============================================================

def save_post_text(
    post_text,
    comment_text,
    output_dir,
    folder_name,
):

    # 메인 게시글

    post_path = (
        output_dir
        / (
            f"{folder_name}"
            "_x_post.txt"
        )
    )

    post_path.write_text(
        post_text + "\n",
        encoding="utf-8",
    )

    # 댓글용

    comment_path = (
        output_dir
        / (
            f"{folder_name}"
            "_x_comment.txt"
        )
    )

    comment_path.write_text(
        comment_text + "\n",
        encoding="utf-8",
    )

    print()
    print(
        "X 게시문(메인) TXT 생성 완료"
    )
    print(
        f"결과 파일:\n{post_path}"
    )
    print(
        f"글자 수: {len(post_text)} / {X_CHAR_LIMIT}"
    )

    print()
    print(
        "X 댓글용 TXT 생성 완료"
    )
    print(
        f"결과 파일:\n{comment_path}"
    )

    return post_path, comment_path



# ============================================================

# FINAL

# ============================================================

def show_result(
    lang_code,
    series_name,
    folder_name,
    output_dir,
    collage_path,
    post_path,
    comment_path,
    post_text,
    comment_text,
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
        f"시리즈: {series_name}"
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
        f"  2. {post_path.name}"
    )
    print(
        f"  3. {comment_path.name}"
    )
    print()
    print(
        "----------------------------------------"
    )
    print(
        f"X 게시문 (메인, {len(post_text)}자)"
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
    print(
        "X 댓글 (재생목록 + 자막 안내)"
    )
    print(
        "----------------------------------------"
    )
    print(
        comment_text
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

    series_name = select_series()

    # 3

    folders = (

        get_conversation_folders(

            lang_code

        )

    )

    # 4

    source_dir = (

        select_conversation(

            folders

        )

    )

    folder_name = (

        source_dir.name

    )

    # 5

    image_paths = (

        find_images(

            source_dir

        )

    )

    # 6

    # 여기서:

    # x/en/Conversation/a1_ordering_at_a_cafe/

    # 생성

    output_dir = (

        create_x_output_folder(

            lang_code,

            series_name,

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

    post_text, comment_text = (

        create_post_text(

            lang_code,

            series_name,

            folder_name,

        )

    )

    # 9

    # TXT도 같은 X 폴더로 저장 (메인 + 댓글, 두 파일)

    post_path, comment_path = (

        save_post_text(

            post_text,

            comment_text,

            output_dir,

            folder_name,

        )

    )

    # 10

    show_result(

        lang_code,

        series_name,

        folder_name,

        output_dir,

        collage_path,

        post_path,

        comment_path,

        post_text,

        comment_text,

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