#!/usr/bin/env python3
"""
ManyLangs Facebook Uploader

  1) facebook/ 아래 폴더 구조:
         facebook/{Language}/{Series}/{Level}/{topic_folder}/{topic_folder}.fx.mp4
     예)  facebook/English/Conversation/A1/airport_greetings/airport_greetings.fx.mp4
          facebook/Korean/Conversation/A1/...
  2) 언어 → 시리즈 → 레벨 → 영상(주제) 폴더 순서로 번호 선택
  3) 선택한 폴더 안의 {topic_folder}.fx.mp4 를 찾아 Facebook 페이지에 동영상 게시
  4) 캡션에는 언어/레벨별 YouTube 재생목록(Playlist) URL을 자동으로 사용
  5) 자막 안내 문구도 자동 생성 (자막 지원 8종 중 입력 언어 제외)
  6) 무료 체험(7-day free trial) + Google Form 신청 링크 CTA는 그대로 유지

실행 위치:
/Users/junghasuk/Desktop/ManyLangs/web/youtube/facebook/post_facebook.py

실행:

    cd /Users/junghasuk/Desktop/ManyLangs/web/youtube/facebook
    python3 post_facebook.py

주의:
  - 언어 폴더명은 LANGUAGES 딕셔너리의 "name" 값과 대소문자 무시하고 일치해야 인식됩니다
    (예: "English", "Korean", "Japanese" ...).
  - 시리즈 폴더명은 자유(예: "Conversation"). 언어 폴더 바로 아래 있는 디렉토리는
    전부 시리즈로 취급합니다.
  - 레벨 폴더명은 a1~c2 (대소문자 무시)만 인식합니다.
  - 이제 이미지 앨범이 아니라 동영상 게시물이므로 Graph API의
    /{page-id}/photos 가 아니라 /{page-id}/videos 로 업로드합니다.
  - .env.local 에 FB_ACCESS_TOKEN, FB_PAGE_ID 가 필요합니다.
  - PLAYLIST_URLS 는 아래 구조를 따릅니다.
    * 영어(en)는 A1~C2 통합 URL 1개만 가집니다 (수정됨).
    * 그 외 언어(현재 kr, es, fr, pt, ru, jp, zh)는 A1~C2 통합 URL 1개만 가집니다.
    * get_playlist_urls() 함수가 자동으로 구조를 감지하여 캡션에 적절히 표시합니다.
  - 게시할 .fx.mp4가 없으면(assemble_social.py를 아직 안 돌렸으면) 에러가 납니다.
    먼저 assemble_social.py로 해당 폴더의 mp4를 만들어 두세요.
  - ⚠️ assemble_social.py 쪽 출력 경로도 이 새 구조(Language/Series/Level/topic/)에
    맞게 함께 수정해야 합니다. (이 파일에는 포함되어 있지 않습니다.)
"""

from pathlib import Path
import os
import re
import requests
from dotenv import load_dotenv


# =========================================================
# 기본 설정
# =========================================================

BASE_DIR = Path(__file__).resolve().parent  # .../youtube/facebook

# 동영상은 facebook/{Language}/{Series}/{Level}/{topic}/ 에서 찾는다.
SOCIAL_VIDEO_DIR = BASE_DIR


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


FREE_TRIAL_CTA = (
    "🎁 Want a 7-day free trial? Apply here:\n"
    "https://docs.google.com/forms/d/e/"
    "1FAIpQLSeEUOaoBonuInr1fjuC3KfWgP24aYD1wXkjnFxOsA9bm-1ExQ/viewform?hl=en"
)


MANYLANGS_TAGLINE = (
    "🌐 Grammar · Vocabulary · Idiom · Real-Life Situations · Conversation\n"
    "👉 www.manylangs.studio"
)


# =========================================================
# 언어 설정
#
# "name" 값이 그대로 facebook/{Language}/ 폴더명과
# 대소문자 무시하고 매칭됩니다. (예: "English" -> facebook/English/)
#
# 다른 파이프라인 스크립트(youtube_upload.py, assemble_video.py,
# assemble_social.py, watermark 스크립트 등)와 동일하게, 내부 관리
# 코드는 이 딕셔너리의 키를 그대로 쓴다 (일본어는 내부적으로 "jp").
# =========================================================

LANGUAGES = {
    "en": {"name": "English", "native_name": "English"},
    "kr": {"name": "Korean", "native_name": "한국어"},
    "jp": {"name": "Japanese", "native_name": "日本語"},
    "zh": {"name": "Chinese", "native_name": "简体中文"},
    "es": {"name": "Spanish", "native_name": "Español"},
    "fr": {"name": "French", "native_name": "Français"},
    "pt": {"name": "Portuguese", "native_name": "Português"},
    "de": {"name": "German", "native_name": "Deutsch"},
    "ru": {"name": "Russian", "native_name": "Русский"},
}

# 폴더명(소문자) -> 언어 코드
LANGUAGE_NAME_TO_CODE = {
    lang["name"].lower(): code for code, lang in LANGUAGES.items()
}


# =========================================================
# 언어 + 시리즈별 YouTube 재생목록(Playlist) URL
#
# - 영어(en): A1~C2 통합 URL 1개 (수정됨)
# - 한국어(kr): A1~C2 통합 URL 1개
# - 스페인어(es): A1~C2 통합 URL 1개
# - 프랑스어(fr): A1~C2 통합 URL 1개
# - 포르투갈어(pt): A1~C2 통합 URL 1개
# - 러시아어(ru): A1~C2 통합 URL 1개
# - 일본어(jp): A1~C2 통합 URL 1개
# - 중국어(zh): A1~C2 통합 URL 1개
# 새 언어/시리즈 추가 시 이 아래에 블록을 추가하되, 통합/분할 여부는
# 자유롭게 키를 A1~C2 또는 A1, A2, ... 으로 구성하면 됩니다.
# =========================================================

PLAYLIST_URLS = {
    "en": {
        "Conversation": {
            "A1~C2": "https://www.youtube.com/playlist?list=PLecujUTTw6yk",  # 통합 URL (기존 A1 URL)
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
LEVEL_DIR_PATTERN = re.compile(r"^(a1|a2|b1|b2|c1|c2)$", re.IGNORECASE)


def get_playlist_urls(lang_code, series_name):
    """
    해당 언어 + 시리즈 조합의 재생목록 URL을 반환한다.

    반환값: 리스트 of (레벨_표시문자열, URL)

    - PLAYLIST_URLS[lang][series] 에 'A1~C2' 키가 있으면
      -> [("A1-C2", URL)] 을 반환 (통합)
    - 그 외에는 LEVEL_ORDER 순서대로 존재하는 키를 모아
      -> [("A1", url_A1), ("A2", url_A2), ...] 반환 (분할)
    - URL이 빈 문자열이면 건너뜀.
    """

    series_playlists = PLAYLIST_URLS.get(lang_code, {}).get(series_name, {})

    # 통합 키가 있는지 확인
    if "A1~C2" in series_playlists:
        url = series_playlists["A1~C2"].strip()
        if url:
            return [("A1-C2", url)]
        else:
            raise ValueError(
                f"[플레이리스트 URL 오류] {lang_code}/{series_name} 의 A1~C2 URL이 비어 있습니다."
            )

    # 분할 키로 구성
    entries = []
    for level in LEVEL_ORDER:
        url = series_playlists.get(level, "").strip()
        if url:
            entries.append((level, url))

    if not entries:
        raise ValueError(
            f"[플레이리스트 URL 없음] "
            f"PLAYLIST_URLS['{lang_code}']['{series_name}'] 에 "
            "A1~C2 또는 A1~C2 각 레벨 URL이 하나도 없습니다. 채워주세요."
        )

    return entries


# =========================================================
# 자막 지원 언어 안내 문구
# =========================================================

SUBTITLE_LANGS = ["en", "es", "pt", "fr", "kr", "jp", "zh", "ru"]

SUBTITLE_LANG_NAMES = {
    "en": "English",
    "es": "Spanish",
    "pt": "Portuguese",
    "fr": "French",
    "kr": "Korean",
    "jp": "Japanese",
    "zh": "Chinese Mandarin",
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

    return f"📚 Study {language_name} conversations with subtitles in {joined}!"


# =========================================================
# 폴더 탐색: 언어 -> 시리즈 -> 레벨 -> 주제(영상) 폴더
# =========================================================

def _list_subdirs(parent_dir):
    return [d for d in sorted(parent_dir.iterdir()) if d.is_dir()]


def _prompt_choice(items, label_fn, prompt_text):
    if not items:
        raise FileNotFoundError("선택할 폴더가 없습니다.")

    print()
    for i, item in enumerate(items, start=1):
        print(f"  {i:>2} - {label_fn(item)}")

    choice = input(prompt_text).strip()

    if not choice.isdigit() or not (1 <= int(choice) <= len(items)):
        raise ValueError(f"잘못된 번호: {choice}")

    return items[int(choice) - 1]


def list_language_dirs():
    """
    facebook/ 바로 아래 폴더 중, LANGUAGES 의 "name" 과
    (대소문자 무시) 매칭되는 폴더만 (lang_code, path) 로 반환.
    """

    results = []

    for d in _list_subdirs(SOCIAL_VIDEO_DIR):
        code = LANGUAGE_NAME_TO_CODE.get(d.name.lower())
        if code:
            results.append((code, d))

    if not results:
        raise FileNotFoundError(
            "언어 폴더를 찾을 수 없습니다. "
            f"facebook/ 아래에 {', '.join(l['name'] for l in LANGUAGES.values())} "
            "중 하나의 이름으로 된 폴더가 있어야 합니다.\n"
            f"확인한 경로: {SOCIAL_VIDEO_DIR}"
        )

    return results


def prompt_language_dir():
    lang_dirs = list_language_dirs()

    print("\n[1/4] 언어 선택")
    code, path = _prompt_choice(
        lang_dirs,
        label_fn=lambda pair: f"{pair[0]} - {LANGUAGES[pair[0]]['name']}",
        prompt_text="번호 선택: ",
    )

    return code, path


def prompt_series_dir(lang_dir):
    series_dirs = _list_subdirs(lang_dir)

    if not series_dirs:
        raise FileNotFoundError(f"시리즈 폴더가 없습니다:\n{lang_dir}")

    print("\n[2/4] 시리즈 선택")
    return _prompt_choice(
        series_dirs,
        label_fn=lambda d: d.name,
        prompt_text="번호 선택: ",
    )


def prompt_level_dir(series_dir):
    level_dirs = [
        d for d in _list_subdirs(series_dir) if LEVEL_DIR_PATTERN.match(d.name)
    ]

    if not level_dirs:
        raise FileNotFoundError(f"레벨 폴더(A1~C2)가 없습니다:\n{series_dir}")

    print("\n[3/4] 레벨 선택")
    return _prompt_choice(
        level_dirs,
        label_fn=lambda d: d.name.upper(),
        prompt_text="번호 선택: ",
    )


def prompt_topic_dir(level_dir):
    topic_dirs = _list_subdirs(level_dir)

    if not topic_dirs:
        raise FileNotFoundError(f"게시할 영상 폴더가 없습니다:\n{level_dir}")

    print("\n[4/4] 영상(주제) 선택")
    return _prompt_choice(
        topic_dirs,
        label_fn=lambda d: d.name,
        prompt_text="번호 선택: ",
    )


def folder_name_to_title(folder_name):
    # 과거 구조(레벨 접두사가 폴더명에 남아있는 경우)와 호환
    name = re.sub(r"^(a1|a2|b1|b2|c1|c2)_", "", folder_name, flags=re.IGNORECASE)
    words = [w for w in name.split("_") if w]
    return " ".join(w.capitalize() for w in words)


# =========================================================
# 동영상 찾기: {topic_dir}/{topic_dir.name}.fx.mp4
# =========================================================

def find_social_video(topic_dir):
    video_path = topic_dir / f"{topic_dir.name}.fx.mp4"

    if not video_path.exists():
        raise FileNotFoundError(
            f"{topic_dir.name}.fx.mp4 를 찾을 수 없습니다:\n"
            f"{video_path}\n"
            "먼저 assemble_social.py로 Facebook/X용 .fx.mp4를 만들어 두세요."
        )

    print(f"[Facebook/X 동영상 발견] {video_path.name}")

    return video_path


# =========================================================
# 캡션 빌드
# =========================================================

def build_caption(
    language,
    lang_code,
    level,
    series_name,
    folder_name,
    include_cta=True,
):
    conversation_title = folder_name_to_title(folder_name)
    name = language["name"]

    playlist_entries = get_playlist_urls(lang_code, series_name)
    playlist_lines = [
        f"{lvl}: {url}" for lvl, url in playlist_entries
    ]
    subtitle_promo = build_subtitle_promo(lang_code, name)

    lines = [
        f"{name} {series_name} | {level} | {conversation_title}",
    ]

    if include_cta:
        lines += ["", FREE_TRIAL_CTA]

    lines += [
        "",
        f"🎬 Watch all {name} playlists:",
        *playlist_lines,
        "",
        subtitle_promo,
        "",
        MANYLANGS_TAGLINE,
        "",
        f"#Learn{name} "
        f"#{name}{series_name.replace(' ', '')} "
        f"#{name}Speaking "
        f"#{name}Practice "
        f"#ManyLangs "
        f"#LanguageLearning",
    ]

    return "\n".join(lines).strip()


# =========================================================
# Facebook: 로컬 동영상 게시
# =========================================================

def _raise_with_detail(resp):
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


def post_facebook_video(video_path, caption):
    if not FB_ACCESS_TOKEN or not FB_PAGE_ID:
        raise RuntimeError(
            "FB_ACCESS_TOKEN / FB_PAGE_ID 환경변수가 없습니다. "
            ".env.local 을 확인하세요."
        )

    with open(video_path, "rb") as f:
        resp = requests.post(
            f"{GRAPH_URL}/{FB_PAGE_ID}/videos",
            data={
                "description": caption,
                "access_token": FB_ACCESS_TOKEN,
            },
            files={"source": f},
        )

    _raise_with_detail(resp)

    result = resp.json()
    print(f"[Facebook 동영상 게시 완료] {result}")

    return result


# =========================================================
# MAIN
# =========================================================

def main():
    print()
    print("========================================")
    print("ManyLangs Facebook Uploader")
    print("========================================")

    lang_code, lang_dir = prompt_language_dir()
    series_dir = prompt_series_dir(lang_dir)
    level_dir = prompt_level_dir(series_dir)
    topic_dir = prompt_topic_dir(level_dir)

    language = LANGUAGES[lang_code]
    series_name = series_dir.name
    level = level_dir.name.upper()
    folder_name = topic_dir.name

    video_path = find_social_video(topic_dir)

    print()

    include_cta_input = input(
        "7-day free trial 신청 링크를 캡션에 포함할까요? [Y/n]: "
    ).strip().lower()

    include_cta = include_cta_input in ("", "y", "yes")

    caption = build_caption(
        language=language,
        lang_code=lang_code,
        level=level,
        series_name=series_name,
        folder_name=folder_name,
        include_cta=include_cta,
    )

    print()
    print("========================================")
    print("캡션 미리보기")
    print("========================================")
    print(caption)
    print("========================================")

    confirm = input("\n이 설정으로 Facebook에 게시할까요? [y/N]: ").strip().lower()

    if confirm != "y":
        print("게시를 취소했습니다.")
        return

    post_facebook_video(video_path, caption)

    print()
    print("========================================")
    print("전체 작업 완료")
    print("========================================")


if __name__ == "__main__":
    main()