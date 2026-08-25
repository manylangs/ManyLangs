#!/usr/bin/env python3
"""
ManyLangs Instagram Uploader (동영상 버전)

인스타그램은 캡션에 링크를 넣어도 클릭이 안 되므로, 이미지 캐러셀 대신
assemble_social.py가 만든 Instagram 전용 .insta.mp4 동영상을
Reels로 게시합니다.

폴더 구조 (post_facebook.py 와 동일):
    facebook/{Language}/{Series}/{Level}/{topic}/{topic}.insta.mp4

흐름:
  1) 언어 → 시리즈 → 레벨 → 영상(주제 폴더) 순서로 번호 선택
  2) 선택한 폴더 안의 {topic}.insta.mp4 를 찾아
     Firebase Storage(social/{Language}/{Series}/{Level}/{topic}/)에 업로드 후,
     그 공개 URL로 Instagram에 Reels(동영상) 게시물 게시
  3) 무료 체험(7-day free trial) CTA는 그대로 유지
  4) 자막 지원 언어 안내와, 전체 재생목록을 보고 싶으면 유튜브에서
     ManyLangs Studio를 검색하라는 안내 문구를 함께 포함
     (Instagram은 캡션 내 URL을 클릭 가능하게 만들지 않고, "@계정명" 형태는
     실제 멘션 링크로 자동 변환되어 버리므로 순수 텍스트 안내만 사용)

실행 위치:
/Users/junghasuk/Desktop/ManyLangs/web/youtube/instagram/post_instagram.py

실행:
    cd /Users/junghasuk/Desktop/ManyLangs/web/youtube/instagram
    python3 post_instagram.py

주의:
  - Instagram Graph API는 로컬 파일을 직접 업로드할 수 없고, 반드시 인터넷에서
    접근 가능한 동영상 URL(video_url)이 필요합니다. 게시 전에 로컬 .insta.mp4를
    자동으로 Firebase Storage에 업로드하고, 그 공개 다운로드 URL을 video_url로
    사용합니다.
  - "Instagram API with Instagram Login" 방식은 Facebook과 다른 base URL
    (graph.instagram.com)과 토큰 체계를 사용합니다.
  - google-cloud-storage 패키지가 필요합니다: pip3 install google-cloud-storage
  - 게시할 .insta.mp4가 없으면(assemble_social.py를 아직 안 돌렸으면) 에러가 납니다.
    먼저 assemble_social.py로 해당 폴더의 mp4를 만들어 두세요.
"""

from pathlib import Path
import os
import re
import time

import requests
from dotenv import load_dotenv
from google.cloud import storage


# =========================================================
# 기본 설정
# =========================================================

BASE_DIR = Path(__file__).resolve().parent

# youtube/instagram/post_instagram.py 기준으로 youtube/facebook 을 바라봄
# assemble_social.py가 만든 facebook/{Language}/{Series}/{Level}/{topic}/ 를 사용
FACEBOOK_DIR = BASE_DIR.parent / "facebook"


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

IG_ACCESS_TOKEN = os.environ.get("IG_ACCESS_TOKEN", "").strip()
IG_ACCOUNT_ID = os.environ.get("IG_ACCOUNT_ID", "").strip()

# Instagram API with Instagram Login 은 Facebook과 다른 base URL을 사용합니다.
IG_GRAPH_URL = "https://graph.instagram.com/v21.0"

# Firebase Storage 설정 - 기존 firebase/upload_content_to_firebase.py 와 같은 버킷
FIREBASE_BUCKET_NAME = os.environ.get(
    "FIREBASE_STORAGE_BUCKET",
    "manylangs-55fd3.firebasestorage.app",
).strip()

FREE_TRIAL_CTA = "🎁 Want a 7-day free trial? Tap our profile → tap the link."

MANYLANGS_TAGLINE = (
    "🌐 Grammar · Vocabulary · Idiom · Real-Life Situations · Conversation\n"
    "👉 www.manylangs.studio"
)


# =========================================================
# 언어 설정
#
# "name" 값이 그대로 facebook/{Language}/ 폴더명과
# 대소문자 무시하고 매칭됩니다. (예: "English" -> facebook/English/)
# =========================================================

LANGUAGES = {
    "en": {"name": "English", "native_name": "English"},
    "kr": {"name": "Korean", "native_name": "한국어"},
    "ja": {"name": "Japanese", "native_name": "日本語"},
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
# 자막 지원 언어 안내 문구
# =========================================================

SUBTITLE_LANGS = ["en", "es", "pt", "fr", "kr", "ja", "zh", "ru"]

SUBTITLE_LANG_NAMES = {
    "en": "English",
    "es": "Spanish",
    "pt": "Portuguese",
    "fr": "French",
    "kr": "Korean",
    "ja": "Japanese",
    "zh": "Chinese Mandarin",
    "ru": "Russian",
}


def build_subtitle_promo(lang_code, language_name):
    """
    자막 지원 8개 언어 중, 지금 게시하는 언어 자신은 제외하고 안내한다.
    """
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


def youtube_playlists_text(language_name):
    """
    Instagram은 캡션 내 URL을 클릭 가능하게 만들지 않고, "@계정명" 형태는
    실제 멘션 링크로 자동 변환되어 버리므로, 실제 재생목록 URL을 나열하는
    Facebook 버전과 달리 유튜브에서 채널을 검색하도록 순수 텍스트로 안내합니다.
    """
    return (
        f'🎬 Watch all {language_name} playlists — '
        f'search "ManyLangs Studio" on YouTube!'
    )


# =========================================================
# 폴더 탐색: 언어 -> 시리즈 -> 레벨 -> 주제(영상) 폴더
# (post_facebook.py 와 동일한 구조/로직)
# =========================================================

LEVEL_DIR_PATTERN = re.compile(r"^(a1|a2|b1|b2|c1|c2)$", re.IGNORECASE)


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

    for d in _list_subdirs(FACEBOOK_DIR):
        code = LANGUAGE_NAME_TO_CODE.get(d.name.lower())
        if code:
            results.append((code, d))

    if not results:
        raise FileNotFoundError(
            "언어 폴더를 찾을 수 없습니다 (먼저 assemble_social.py를 실행하세요). "
            f"확인한 경로: {FACEBOOK_DIR}"
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
# Instagram 동영상 찾기: {topic_dir}/{topic_dir.name}.insta.mp4
#
# 같은 폴더에 .fx.mp4가 있어도 사용하지 않음
# =========================================================

def find_social_video(topic_dir):
    video_path = topic_dir / f"{topic_dir.name}.insta.mp4"

    if not video_path.exists():
        raise FileNotFoundError(
            f"{topic_dir.name}.insta.mp4 를 찾을 수 없습니다:\n"
            f"{video_path}\n"
            "먼저 assemble_social.py로 Instagram용 .insta.mp4를 만들어 두세요."
        )

    print(f"[Instagram 동영상 발견] {video_path.name}")

    return video_path


# =========================================================
# 캡션 빌드
# =========================================================

def build_caption(language, lang_code, level, series_name, folder_name, include_cta=True):
    conversation_title = folder_name_to_title(folder_name)
    name = language["name"]

    subtitle_promo = build_subtitle_promo(lang_code, name)
    playlists_text = youtube_playlists_text(name)

    lines = [
        f"{name} {series_name} | {level} | {conversation_title}",
    ]

    if include_cta:
        lines += [
            "",
            FREE_TRIAL_CTA,
        ]

    lines += [
        "",
        subtitle_promo,
        playlists_text,
        "",
        MANYLANGS_TAGLINE,
        "",
        f"#Learn{name} #{name}{series_name.replace(' ', '')} #{name}Speaking "
        f"#{name}Practice #ManyLangs #LanguageLearning",
    ]

    return "\n".join(lines).strip()


# =========================================================
# Firebase Storage 업로드
#
# Instagram Graph API는 인터넷에서 접근 가능한 video_url이 필요하므로,
# 로컬 .insta.mp4를 Firebase Storage에 올린다.
# =========================================================

def upload_video_to_firebase(video_path, language, series_name, level, folder_name):
    client = storage.Client()
    bucket = client.bucket(FIREBASE_BUCKET_NAME)

    blob_path = (
        f"social/{language['name']}/{series_name}/{level}/"
        f"{folder_name}/{video_path.name}"
    )
    blob = bucket.blob(blob_path)

    if blob.exists():
        print(f"[이미 존재, 재사용] {blob_path}")
    else:
        blob.upload_from_filename(str(video_path), content_type="video/mp4")
        print(f"[Firebase 업로드 완료] {blob_path}")

    # 이미 올라가 있어도 공개 상태인지 항상 보장
    blob.make_public()

    print(f"\n[사용할 동영상 URL - Firebase Storage]\n  - {blob.public_url}")

    return blob.public_url


# =========================================================
# Instagram: 동영상(Reels) 게시
# =========================================================

def _raise_with_detail(resp):
    """requests 에러를 Meta Graph API 응답 본문과 함께 자세히 보여준다."""
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


def _wait_until_ready(container_id, max_wait_seconds=600):
    """
    동영상 컨테이너가 FINISHED 상태가 될 때까지 대기.

    상태 조회 중 Application request limit reached 같은
    일시적 사용량 제한 에러가 나오면 대기 시간을 점점 늘려가며 재시도한다.
    """
    waited = 0
    interval = 10
    backoff = 10
    max_backoff = 60

    while waited < max_wait_seconds:
        resp = requests.get(
            f"{IG_GRAPH_URL}/{container_id}",
            params={
                "fields": "status_code",
                "access_token": IG_ACCESS_TOKEN,
            },
        )

        if resp.status_code != 200:
            try:
                err = resp.json().get("error", {})
            except Exception:
                err = {}

            if err.get("is_transient") or err.get("code") == 4:
                print(
                    f"[일시적 사용량 제한] "
                    f"{err.get('error_user_msg') or err.get('message')} "
                    f"-> {backoff}초 대기 후 재시도"
                )

                time.sleep(backoff)
                waited += backoff
                backoff = min(backoff * 2, max_backoff)
                continue

            _raise_with_detail(resp)

        backoff = 10

        status = resp.json().get("status_code")
        print(f"[컨테이너 상태 확인] {container_id} -> {status}")

        if status == "FINISHED":
            return True

        if status == "ERROR":
            raise RuntimeError(f"컨테이너 처리 실패: {container_id}")

        time.sleep(interval)
        waited += interval

    print(
        f"[경고] {max_wait_seconds}초 대기했지만 아직 FINISHED가 아닙니다. "
        "게시를 시도합니다."
    )

    return False


def post_instagram_video(video_url, caption):
    if not IG_ACCESS_TOKEN or not IG_ACCOUNT_ID:
        raise RuntimeError(
            "IG_ACCESS_TOKEN / IG_ACCOUNT_ID 환경변수가 없습니다. "
            ".env.local 을 확인하세요."
        )

    container_resp = requests.post(
        f"{IG_GRAPH_URL}/{IG_ACCOUNT_ID}/media",
        data={
            "media_type": "REELS",
            "video_url": video_url,
            "caption": caption,
            "access_token": IG_ACCESS_TOKEN,
        },
    )

    _raise_with_detail(container_resp)

    container_id = container_resp.json()["id"]
    print(f"[컨테이너 생성] {container_id}")

    print("\n[동영상 처리 대기 중...]")
    _wait_until_ready(container_id)

    publish_resp = requests.post(
        f"{IG_GRAPH_URL}/{IG_ACCOUNT_ID}/media_publish",
        data={
            "creation_id": container_id,
            "access_token": IG_ACCESS_TOKEN,
        },
    )

    # Media ID is not available 에러가 나오면 몇 초 더 기다렸다가 재시도
    if publish_resp.status_code == 400:
        try:
            err = publish_resp.json().get("error", {})
        except Exception:
            err = {}

        if err.get("error_subcode") == 2207027:
            for attempt in range(5):
                print(f"[아직 준비 안 됨, 재시도 {attempt + 1}/5]")
                time.sleep(5)

                publish_resp = requests.post(
                    f"{IG_GRAPH_URL}/{IG_ACCOUNT_ID}/media_publish",
                    data={
                        "creation_id": container_id,
                        "access_token": IG_ACCESS_TOKEN,
                    },
                )

                if publish_resp.status_code == 200:
                    break

    _raise_with_detail(publish_resp)

    result = publish_resp.json()
    print(f"[Instagram 게시 완료] {result}")

    return result


# =========================================================
# MAIN
# =========================================================

def main():
    print()
    print("========================================")
    print("ManyLangs Instagram Uploader (동영상)")
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
        "7-day free trial 신청 안내를 캡션에 포함할까요? [Y/n]: "
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

    confirm = input(
        "\n이 설정으로 Instagram에 게시할까요? [y/N]: "
    ).strip().lower()

    if confirm != "y":
        print("게시를 취소했습니다.")
        return

    video_url = upload_video_to_firebase(
        video_path,
        language,
        series_name,
        level,
        folder_name,
    )

    post_instagram_video(video_url, caption)

    print()
    print("========================================")
    print("전체 작업 완료")
    print("========================================")


if __name__ == "__main__":
    main()