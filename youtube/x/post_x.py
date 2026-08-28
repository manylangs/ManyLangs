#!/usr/bin/env python3
"""

ManyLangs X Manual Post Builder (수동 게시용 TXT 2개 생성)

원본:

  /Users/junghasuk/Desktop/ManyLangs/web/youtube/conversation/{lang}/{folder}/

      {folder}_001.png

      ...

      {folder}_006.png

결과:

  /Users/junghasuk/Desktop/ManyLangs/web/youtube/x/{lang}/{series}/{folder}/

      {folder}_x_post.txt     <- 포스트 (제목 + 재생목록)
      {folder}_x_comment.txt  <- 댓글 (자막 안내 + CTA + 태그라인)

예:

  /Users/junghasuk/Desktop/ManyLangs/web/youtube/x/en/Conversation/a1_ordering_at_a_cafe/

      a1_ordering_at_a_cafe_x_post.txt
      a1_ordering_at_a_cafe_x_comment.txt

X API 사용 안 함.

X API 크레딧 사용 안 함.

수동 게시용 TXT만 생성.

PLAYLIST_URLS 구조 (수정됨 - 영어도 A1~C2 통합):
  - 영어(en): A1~C2 통합 URL 1개
  - 한국어(kr): A1~C2 통합 URL 1개
  - 스페인어(es): A1~C2 통합 URL 1개
  - 프랑스어(fr): A1~C2 통합 URL 1개
  - 포르투갈어(pt): A1~C2 통합 URL 1개
  - 러시아어(ru): A1~C2 통합 URL 1개
  - 일본어(jp): A1~C2 통합 URL 1개
  - 중국어(zh): A1~C2 통합 URL 1개
  - get_playlist_urls() 함수가 자동으로 구조를 감지하여 표시합니다.

수정: 2026-08-28 - 포스트와 댓글을 각각 별도 TXT로 분리, 영어도 A1~C2 통합
"""

from pathlib import Path
import re
import sys


# ============================================================
# PATH
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
YOUTUBE_DIR = BASE_DIR.parent
CONVERSATION_DIR = YOUTUBE_DIR / "conversation"
X_OUTPUT_ROOT = BASE_DIR


# ============================================================
# LANGUAGE
# ============================================================

LANGUAGES = {
    "en": "English",
    "kr": "Korean",
    "jp": "Japanese",
    "zh": "Chinese",
    "es": "Spanish",
    "fr": "French",
    "pt": "Portuguese",
    "de": "German",
    "ru": "Russian",
}


# ============================================================
# SERIES
# ============================================================

SERIES_OPTIONS = [
    "Conversation",
    "Vocabulary",
    "Idiom",
    "Real Life Situations",
]


# ============================================================
# PLAYLIST URLS (수정됨 - 영어도 A1~C2 통합)
# ============================================================

PLAYLIST_URLS = {
    "en": {
        "Conversation": {
            "A1~C2": "https://www.youtube.com/playlist?list=PLecujUTTw6yk",
        },
    },
    "kr": {
        "Conversation": {
            "A1~C2": "https://www.youtube.com/playlist?list=PLAOAS_mQCTuY",
        },
    },
    "es": {
        "Conversation": {
            "A1~C2": "https://www.youtube.com/playlist?list=PLInRA3zKhd5Y",
        },
    },
    "fr": {
        "Conversation": {
            "A1~C2": "https://www.youtube.com/playlist?list=PLEYWsRmBW1Oc",
        },
    },
    "pt": {
        "Conversation": {
            "A1~C2": "https://www.youtube.com/playlist?list=PLSeYsB0064BU",
        },
    },
    "ru": {
        "Conversation": {
            "A1~C2": "https://www.youtube.com/playlist?list=PLSrrl1A3JdWg",
        },
    },
    "jp": {
        "Conversation": {
            "A1~C2": "https://www.youtube.com/playlist?list=PLdG0jNNybANY",
        },
    },
    "zh": {
        "Conversation": {
            "A1~C2": "https://www.youtube.com/playlist?list=PLdEtuumnlpZQ",
        },
    },
}

LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"]


def get_playlist_urls(lang_code, series_name):
    """
    해당 언어 + 시리즈 조합의 재생목록 URL을 반환한다.
    반환값: 리스트 of (레벨_표시문자열, URL)
    - 'A1~C2' 키가 있으면 [("A1-C2", URL)] 반환 (통합)
    - 그 외에는 LEVEL_ORDER 순서대로 존재하는 키를 모아 반환 (분할)
    """
    series_playlists = PLAYLIST_URLS.get(lang_code, {}).get(series_name, {})

    if "A1~C2" in series_playlists:
        url = series_playlists["A1~C2"].strip()
        if url:
            return [("A1-C2", url)]
        else:
            raise ValueError(
                f"[플레이리스트 URL 오류] {lang_code}/{series_name} 의 A1~C2 URL이 비어 있습니다."
            )

    entries = [
        (level, series_playlists.get(level, "").strip())
        for level in LEVEL_ORDER
    ]
    entries = [(level, url) for level, url in entries if url]

    if not entries:
        raise ValueError(
            "[플레이리스트 URL 없음] "
            f"PLAYLIST_URLS['{lang_code}']['{series_name}'] 에 "
            "A1~C2 또는 A1~C2 각 레벨 URL이 하나도 없습니다. 채워주세요."
        )

    return entries


# ============================================================
# 자막 지원 언어 안내 문구
# ============================================================

SUBTITLE_LANGS = ["en", "es", "pt", "fr", "kr", "jp", "zh", "ru"]

SUBTITLE_LANG_NAMES = {
    "en": "English",
    "es": "Spanish",
    "pt": "Portuguese",
    "fr": "French",
    "kr": "Korean",
    "jp": "Japanese",
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


# ============================================================
# LANGUAGE SELECT
# ============================================================

def select_language():
    codes = list(LANGUAGES.keys())
    print()
    print("지원 언어:")
    for i, code in enumerate(codes, start=1):
        print(f"  {i:>2} - {code} ({LANGUAGES[code]})")
    print()
    choice = input("번호 입력: ").strip()
    if not choice.isdigit() or not (1 <= int(choice) <= len(codes)):
        raise ValueError(f"잘못된 번호: {choice}")
    return codes[int(choice) - 1]


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
    lang_dir = CONVERSATION_DIR / lang_code
    if not lang_dir.exists():
        raise FileNotFoundError(f"언어 폴더 없음:\n{lang_dir}")

    folders = []
    for path in sorted(lang_dir.iterdir()):
        if not path.is_dir():
            continue
        if re.match(r"^(a1|a2|b1|b2|c1|c2)_", path.name, re.IGNORECASE):
            folders.append(path)

    if not folders:
        raise FileNotFoundError(f"회화 폴더 없음:\n{lang_dir}")
    return folders


# ============================================================
# SELECT CONVERSATION
# ============================================================

def select_conversation(folders):
    print()
    print("게시 가능한 폴더:")
    for index, folder in enumerate(folders, start=1):
        print(f"  {index:>2} - {folder.name}")
    print()
    value = input("번호 선택: ").strip()
    if not value.isdigit():
        raise ValueError("숫자를 입력하세요.")
    number = int(value)
    if number < 1 or number > len(folders):
        raise ValueError(f"잘못된 번호: {number}")
    return folders[number - 1]


# ============================================================
# X OUTPUT FOLDER
# ============================================================

def create_x_output_folder(lang_code, series_name, folder_name):
    output_dir = X_OUTPUT_ROOT / lang_code / series_name / folder_name
    output_dir.mkdir(parents=True, exist_ok=True)
    print()
    print("[X 결과 폴더]")
    print(output_dir)
    return output_dir


# ============================================================
# TITLE HELPERS
# ============================================================

def get_level(folder_name):
    match = re.match(r"^(a1|a2|b1|b2|c1|c2)_", folder_name, re.IGNORECASE)
    if not match:
        return ""
    return match.group(1).upper()


def get_title(folder_name):
    title = re.sub(r"^(a1|a2|b1|b2|c1|c2)_", "", folder_name, flags=re.IGNORECASE)
    words = title.split("_")
    return " ".join(word.capitalize() for word in words if word)


# ============================================================
# BUILD POST TEXT (포스트 전용)
# ============================================================

def build_post_text(lang_code, series_name, folder_name):
    language = LANGUAGES[lang_code]
    level = get_level(folder_name)
    title = get_title(folder_name)

    header = f"{language} {series_name} | {level} | {title}"
    playlist_entries = get_playlist_urls(lang_code, series_name)
    playlist_lines = "\n".join(f"{lvl}: {url}" for lvl, url in playlist_entries)

    post_text = (
        f"{header}\n"
        "\n"
        f"🎬 Watch all {language} playlists:\n"
        f"{playlist_lines}"
    )

    return post_text


# ============================================================
# BUILD COMMENT TEXT (댓글 전용)
# ============================================================

def build_comment_text(lang_code, language):
    subtitle_promo = build_subtitle_promo(lang_code, language)

    comment_text = (
        f"{subtitle_promo}\n"
        "\n"
        f"🎁 Want a 7-day free trial? Apply here: "
        f"https://docs.google.com/forms/d/e/1FAIpQLSeEUOaoBonuInr1fjuC3KfWgP24aYD1wXkjnFxOsA9bm-1ExQ/viewform?hl=en\n"
        "\n"
        f"🌐 Grammar · Vocabulary · Idiom · Real-Life Situations · Conversation\n"
        f"👉 www.manylangs.studio"
    )

    return comment_text


# ============================================================
# SAVE TXT (별도 파일)
# ============================================================

def save_post_text(post_text, output_dir, folder_name):
    post_path = output_dir / (f"{folder_name}_x_post.txt")
    post_path.write_text(post_text + "\n", encoding="utf-8")
    print()
    print("X 포스트 TXT 생성 완료")
    print(f"결과 파일:\n{post_path}")
    print(f"글자 수: {len(post_text)}")
    return post_path


def save_comment_text(comment_text, output_dir, folder_name):
    comment_path = output_dir / (f"{folder_name}_x_comment.txt")
    comment_path.write_text(comment_text + "\n", encoding="utf-8")
    print()
    print("X 댓글 TXT 생성 완료")
    print(f"결과 파일:\n{comment_path}")
    print(f"글자 수: {len(comment_text)}")
    return comment_path


# ============================================================
# SHOW RESULT
# ============================================================

def show_result(lang_code, series_name, folder_name, output_dir,
                post_path, comment_path, post_text, comment_text):
    print()
    print("========================================")
    print("X 수동 게시 패키지 생성 완료")
    print("========================================")
    print(f"언어: {lang_code}")
    print(f"시리즈: {series_name}")
    print(f"회화: {folder_name}")
    print()
    print("저장 폴더:")
    print(output_dir)
    print()
    print("생성 파일:")
    print(f"  - {post_path.name}")
    print(f"  - {comment_path.name}")
    print()
    print("----------------------------------------")
    print("📌 포스트 내용")
    print("----------------------------------------")
    print(post_text)
    print("----------------------------------------")
    print()
    print("----------------------------------------")
    print("💬 댓글 내용")
    print("----------------------------------------")
    print(comment_text)
    print("----------------------------------------")
    print()
    print("X API 사용 없음")
    print("API 크레딧 사용 없음")
    print("========================================")


# ============================================================
# MAIN
# ============================================================

def main():
    print()
    print("========================================")
    print("ManyLangs X Manual Post Builder")
    print("========================================")

    lang_code = select_language()
    series_name = select_series()
    folders = get_conversation_folders(lang_code)
    source_dir = select_conversation(folders)
    folder_name = source_dir.name

    output_dir = create_x_output_folder(lang_code, series_name, folder_name)

    post_text = build_post_text(lang_code, series_name, folder_name)
    comment_text = build_comment_text(lang_code, LANGUAGES[lang_code])

    post_path = save_post_text(post_text, output_dir, folder_name)
    comment_path = save_comment_text(comment_text, output_dir, folder_name)

    show_result(lang_code, series_name, folder_name, output_dir,
                post_path, comment_path, post_text, comment_text)


# ============================================================
# START
# ============================================================

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print()
        print("작업 취소")
        sys.exit(130)
    except Exception as error:
        print()
        print("========================================")
        print("오류 발생")
        print("========================================")
        print(f"{type(error).__name__}: {error}")
        print("========================================")
        sys.exit(1)