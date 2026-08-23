#!/usr/bin/env python3
"""
ManyLangs Facebook Uploader

youtube_upload.py와 동일한 흐름을 따릅니다:

  1) 언어 코드 입력
  2) 해당 언어 폴더 아래 a1_~c2_ 로 시작하는 하위 폴더를 번호로 보여주고 선택
  3) 선택한 폴더에 대응하는 YouTube URL을 입력받아 캡션에 기억/사용
  4) 폴더 안의 {folder_name}_001.png ~ {folder_name}_006.png 를 순서대로 찾아
     Facebook 페이지에 여러 장(앨범) 게시물로 게시
  5) 마지막 장에는 www.manylangs.studio + Grammar/Vocab/Idiom/Real-Life Situations/
     Conversation 을 강조하는 캡션을 붙임
  6) 무료 체험(7-day free trial) + Google Form 신청 링크 CTA를 캡션에 포함

실행 위치:
/Users/junghasuk/Desktop/ManyLangs/web/youtube/facebook/post_facebook.py

실행:

    cd /Users/junghasuk/Desktop/ManyLangs/web/youtube/facebook
    python3 post_facebook.py

주의:
  - Facebook 페이지 사진 앨범은 로컬 파일을 바로 업로드할 수 있어서
    Instagram과 달리 별도 URL 호스팅이 필요 없습니다.
  - .env.local 에 FB_ACCESS_TOKEN, FB_PAGE_ID 가 필요합니다.
"""

from pathlib import Path
import json
import os
import re
import requests
from dotenv import load_dotenv


# =========================================================
# 기본 설정
# =========================================================

BASE_DIR = Path(__file__).resolve().parent

# youtube/facebook/post_facebook.py 기준으로 youtube/conversation 을 바라봄
CONVERSATION_DIR = BASE_DIR.parent / "conversation"


# .env.local 로드 - 여러 후보 경로를 순서대로 확인 (실행 위치와 무관하게 안전하게)
def _load_env():
    candidates = [
        BASE_DIR.parent.parent / ".env.local",  # web/.env.local
        BASE_DIR.parent.parent / ".env",
        BASE_DIR.parent / ".env.local",
        Path.cwd() / ".env.local",
    ]

    for c in candidates:
        if c.exists():
            load_dotenv(c)
            print(f"[.env 로드 완료] {c}")
            return

    print("[.env 로드 실패] 다음 경로들을 확인했지만 파일이 없습니다:")
    for c in candidates:
        print(f"  - {c}")


_load_env()

FB_ACCESS_TOKEN = os.environ.get("FB_ACCESS_TOKEN", "").strip()
FB_PAGE_ID = os.environ.get("FB_PAGE_ID", "").strip()

GRAPH_URL = "https://graph.facebook.com/v21.0"

YT_URL_CACHE_FILENAME = "youtube_url_cache.json"


FREE_TRIAL_CTA = (
    "🎁 Want a 7-day free trial? Apply here:\n"
    "https://docs.google.com/forms/d/e/"
    "1FAIpQLSeEUOaoBonuInr1fjuC3KfWgP24aYD1wXkjnFxOsA9bm-1ExQ/viewform"
)


MANYLANGS_TAGLINE = (
    "🌐 Grammar · Vocabulary · Idiom · Real-Life Situations · Conversation\n"
    "👉 www.manylangs.studio"
)


# =========================================================
# 언어 설정 (youtube_upload.py 와 동일)
# =========================================================

LANGUAGES = {
    "en": {
        "name": "English",
        "native_name": "English",
    },
    "kr": {
        "name": "Korean",
        "native_name": "한국어",
    },
    "ja": {
        "name": "Japanese",
        "native_name": "日本語",
    },
    "zh": {
        "name": "Chinese",
        "native_name": "简体中文",
    },
    "es": {
        "name": "Spanish",
        "native_name": "Español",
    },
    "fr": {
        "name": "French",
        "native_name": "Français",
    },
    "pt": {
        "name": "Portuguese",
        "native_name": "Português",
    },
    "de": {
        "name": "German",
        "native_name": "Deutsch",
    },
}


# =========================================================
# 언어 선택
# =========================================================

def prompt_language():
    print("\n지원 언어:")

    for code, lang in LANGUAGES.items():
        print(f"  {code} - {lang['name']}")

    lang_code = input("언어 코드 입력: ").strip().lower()

    if lang_code not in LANGUAGES:
        raise ValueError(
            f"지원하지 않는 언어 코드입니다: {lang_code}"
        )

    return lang_code


# =========================================================
# 폴더 검색
# CONVERSATION_DIR/{lang_code}/ 아래,
# a1_~c2_ 로 시작하는 폴더만
# =========================================================

def list_language_folders(lang_code):
    lang_dir = CONVERSATION_DIR / lang_code

    if not lang_dir.exists():
        raise FileNotFoundError(
            f"언어 폴더가 없습니다:\n{lang_dir}"
        )

    folders = [
        d
        for d in sorted(lang_dir.iterdir())
        if d.is_dir()
        and re.match(
            r"^(a1|a2|b1|b2|c1|c2)_",
            d.name,
            re.IGNORECASE,
        )
    ]

    if not folders:
        raise FileNotFoundError(
            f"게시할 폴더가 없습니다:\n{lang_dir}"
        )

    return folders


def prompt_folder_selection(folders):
    print("\n게시 가능한 폴더:")

    for i, d in enumerate(folders, start=1):
        print(f"  {i:>2} - {d.name}")

    choice = input("번호 선택: ").strip()

    if (
        not choice.isdigit()
        or not (1 <= int(choice) <= len(folders))
    ):
        raise ValueError(
            f"잘못된 번호: {choice}"
        )

    return folders[int(choice) - 1]


def build_folder_info(lang_code, item_dir):
    folder_name = item_dir.name

    match = re.match(
        r"^(a1|a2|b1|b2|c1|c2)_",
        folder_name,
        re.IGNORECASE,
    )

    if not match:
        raise ValueError(
            "레벨을 폴더명에서 찾을 수 없습니다:\n"
            f"{folder_name}"
        )

    level = match.group(1).upper()

    return {
        "item_dir": item_dir,
        "folder_name": folder_name,
        "lang_code": lang_code,
        "language": LANGUAGES[lang_code],
        "level": level,
    }


def folder_name_to_title(folder_name):
    name = re.sub(
        r"^(a1|a2|b1|b2|c1|c2)_",
        "",
        folder_name,
        flags=re.IGNORECASE,
    )

    words = [
        w
        for w in name.split("_")
        if w
    ]

    return " ".join(
        w.capitalize()
        for w in words
    )


# =========================================================
# 이미지 찾기:
# {folder_name}_001.png ~ {folder_name}_006.png
# =========================================================

def find_sequential_images(item_dir, folder_name):
    images = []

    for n in range(1, 7):
        candidate = (
            item_dir
            / f"{folder_name}_{n:03d}.png"
        )

        if candidate.exists():
            images.append(candidate)

    if not images:
        raise FileNotFoundError(
            f"{folder_name}_001.png ~ "
            f"{folder_name}_006.png 를 찾을 수 없습니다:\n"
            f"{item_dir}"
        )

    print(f"[이미지 {len(images)}장 발견]")

    for img in images:
        print(f"  - {img.name}")

    return images


# =========================================================
# YouTube URL 입력 및 캐시
# (폴더 단위로 기억)
# =========================================================

def load_yt_url_cache(item_dir):
    cache_path = (
        Path(item_dir)
        / YT_URL_CACHE_FILENAME
    )

    if not cache_path.exists():
        return {}

    try:
        with open(
            cache_path,
            "r",
            encoding="utf-8",
        ) as f:
            data = json.load(f)

        return (
            data
            if isinstance(data, dict)
            else {}
        )

    except Exception:
        return {}


def save_yt_url_cache(item_dir, cache):
    cache_path = (
        Path(item_dir)
        / YT_URL_CACHE_FILENAME
    )

    with open(
        cache_path,
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(
            cache,
            f,
            ensure_ascii=False,
            indent=2,
        )


def ask_youtube_url(item_dir):
    cache = load_yt_url_cache(item_dir)

    print()
    print(
        "YouTube에 게시된 이 회화의 URL을 "
        "복사해서 붙여넣어 주세요."
    )

    url = input("YouTube URL: ").strip()

    if not url:
        raise ValueError(
            "YouTube URL이 필요합니다."
        )

    if not re.match(
        r"^https?://(www\.)?"
        r"(youtube\.com|youtu\.be)/",
        url,
        re.IGNORECASE,
    ):
        raise ValueError(
            f"올바른 YouTube URL이 아닙니다: {url}"
        )

    cache["youtube_url"] = url

    save_yt_url_cache(
        item_dir,
        cache,
    )

    print("[YouTube URL 저장 완료]")

    return url


# =========================================================
# 캡션 빌드
#
# 순서:
# 1. Swipe
# 2. 7-Day Free Trial
# 3. Conversation 제목
# 4. YouTube
# 5. ManyLangs
# 6. Hashtags
# =========================================================

def build_caption(
    language,
    level,
    folder_name,
    youtube_url,
    include_cta=True,
):
    conversation_title = folder_name_to_title(
        folder_name
    )

    name = language["name"]

    lines = [
        "👉 Swipe to see the full conversation →",
    ]

    # -----------------------------------------------------
    # 2번째: 7-Day Free Trial
    # -----------------------------------------------------

    if include_cta:
        lines += [
            "",
            FREE_TRIAL_CTA,
        ]

    # -----------------------------------------------------
    # 3번째 이후: 제목 → YouTube → ManyLangs
    # -----------------------------------------------------

    lines += [
        "",
        f"{name} Conversation | "
        f"{level} | "
        f"{conversation_title}",
        "",
        "🎧 Want the full audio lesson?",
        youtube_url,
        "",
        MANYLANGS_TAGLINE,
        "",
        f"#Learn{name} "
        f"#{name}Conversation "
        f"#{name}Speaking "
        f"#{name}Practice "
        f"#ManyLangs "
        f"#LanguageLearning",
    ]

    return "\n".join(lines).strip()


# =========================================================
# Facebook:
# 로컬 이미지 여러 장을 앨범처럼 게시
#
# 로컬 파일 직접 업로드 가능
# URL 호스팅 불필요
# =========================================================

def _raise_with_detail(resp):
    """
    requests 에러를 Meta Graph API 응답 본문과
    함께 자세히 보여준다.
    """

    try:
        resp.raise_for_status()

    except requests.exceptions.HTTPError:
        try:
            detail = resp.json()

        except Exception:
            detail = resp.text

        print("\n[Meta API 에러 상세]")
        print(detail)

        raise


def post_facebook_album(
    image_paths,
    caption,
):
    if (
        not FB_ACCESS_TOKEN
        or not FB_PAGE_ID
    ):
        raise RuntimeError(
            "FB_ACCESS_TOKEN / FB_PAGE_ID "
            "환경변수가 없습니다. "
            ".env.local 을 확인하세요."
        )

    attached_media = []

    for path in image_paths:
        with open(path, "rb") as f:
            resp = requests.post(
                f"{GRAPH_URL}/"
                f"{FB_PAGE_ID}/photos",
                data={
                    "published": "false",
                    "access_token": (
                        FB_ACCESS_TOKEN
                    ),
                },
                files={
                    "source": f,
                },
            )

        _raise_with_detail(resp)

        photo_id = resp.json()["id"]

        attached_media.append(
            {
                "media_fbid": photo_id,
            }
        )

        print(
            "[사진 업로드 완료] "
            f"{path.name} -> {photo_id}"
        )

    post_resp = requests.post(
        f"{GRAPH_URL}/{FB_PAGE_ID}/feed",
        data={
            "message": caption,
            "attached_media": json.dumps(
                attached_media
            ),
            "access_token": (
                FB_ACCESS_TOKEN
            ),
        },
    )

    _raise_with_detail(post_resp)

    result = post_resp.json()

    print(
        f"[Facebook 게시 완료] {result}"
    )

    return result


# =========================================================
# MAIN
# =========================================================

def main():
    print()
    print(
        "========================================"
    )
    print(
        "ManyLangs Facebook Uploader"
    )
    print(
        "========================================"
    )

    lang_code = prompt_language()

    folders = list_language_folders(
        lang_code
    )

    selected_dir = prompt_folder_selection(
        folders
    )

    info = build_folder_info(
        lang_code,
        selected_dir,
    )

    item_dir = info["item_dir"]
    language = info["language"]
    level = info["level"]
    folder_name = info["folder_name"]

    images = find_sequential_images(
        item_dir,
        folder_name,
    )

    youtube_url = ask_youtube_url(
        item_dir
    )

    print()

    include_cta_input = input(
        "7-day free trial 신청 링크를 "
        "캡션에 포함할까요? [Y/n]: "
    ).strip().lower()

    include_cta = (
        include_cta_input
        in ("", "y", "yes")
    )

    caption = build_caption(
        language=language,
        level=level,
        folder_name=folder_name,
        youtube_url=youtube_url,
        include_cta=include_cta,
    )

    print()
    print(
        "========================================"
    )
    print(
        "캡션 미리보기"
    )
    print(
        "========================================"
    )
    print(caption)
    print(
        "========================================"
    )

    confirm = input(
        "\n이 설정으로 Facebook에 "
        "게시할까요? [y/N]: "
    ).strip().lower()

    if confirm != "y":
        print(
            "게시를 취소했습니다."
        )
        return

    post_facebook_album(
        images,
        caption,
    )

    print()
    print(
        "========================================"
    )
    print(
        "전체 작업 완료"
    )
    print(
        "========================================"
    )


if __name__ == "__main__":
    main()