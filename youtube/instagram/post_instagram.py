#!/usr/bin/env python3
"""
ManyLangs Instagram Uploader

youtube_upload.py와 동일한 흐름을 따릅니다:
  1) 언어 코드 입력
  2) 해당 언어 폴더 아래 a1_~c2_ 로 시작하는 하위 폴더를 번호로 보여주고 선택
  3) 폴더 안의 {folder_name}_001.png ~ {folder_name}_006.png 를 순서대로 찾아
     Firebase Storage(social/{lang}/{folder_name}/)에 업로드 후, 그 공개 URL로
     Instagram에 캐러셀(여러 장) 게시물 게시
  4) 마지막 장에는 www.manylangs.studio + Grammar/Vocab/Idiom/Real-Life Situations/
     Conversation 을 강조하는 캡션을 붙임
  5) 오디오/전체 강의를 원하면 YouTube에서 "ManyLangsStudio" 를 검색해서
     방문하라는 안내 문구를 캡션에 포함 (Instagram은 캡션 내 URL을 클릭 가능하게
     만들지 않고, "@계정명" 형태는 실제 멘션 링크로 자동 변환되어 버리므로
     URL과 "@" 표기 모두 사용하지 않고 순수 텍스트 안내만 사용합니다)
  6) 무료 체험(7-day free trial) 프로필 링크 CTA를 캡션에 포함

실행 위치: /Users/junghasuk/Desktop/ManyLangs/web/youtube/instagram/post_instagram.py
실행:
    cd /Users/junghasuk/Desktop/ManyLangs/web/youtube/instagram
    python3 post_instagram.py

주의:
  - Instagram Graph API는 로컬 파일을 직접 업로드할 수 없고, 반드시 인터넷에서
    접근 가능한 이미지 URL(image_url)이 필요합니다. 게시 전에 로컬 이미지를
    자동으로 Firebase Storage(social/{lang}/{folder_name}/ 경로)에 업로드하고,
    그 공개 다운로드 URL을 image_url로 사용합니다. 이 방식은 로컬 폴더 삭제나
    Vercel 재배포와 완전히 무관하게 안정적으로 유지됩니다.
    (기존 firebase/upload_content_to_firebase.py 와 같은 버킷 사용, 서비스 계정
    권한도 동일하게 GOOGLE_APPLICATION_CREDENTIALS 환경변수/gcloud 인증을 사용)
  - "Instagram API with Instagram Login" 방식은 Facebook과 다른 base URL
    (graph.instagram.com)과 토큰 체계를 사용합니다.
  - google-cloud-storage 패키지가 필요합니다: pip3 install google-cloud-storage
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
# youtube/instagram/post_instagram.py 기준으로 youtube/conversation 을 바라봄
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

# YouTube 채널 안내 - "@계정명" 형태는 Instagram이 실제 멘션 링크로 자동 변환해
# 버리므로 사용하지 않고, 순수 텍스트로만 안내합니다.
YOUTUBE_VISIT_TEXT = (
    "🎧 Want the full audio lesson? Search \"ManyLangsStudio\" on YouTube and visit us!"
)

MANYLANGS_TAGLINE = (
    "🌐 Grammar · Vocabulary · Idiom · Real-Life Situations · Conversation\n"
    "👉 www.manylangs.studio"
)


# =========================================================
# 언어 설정 (youtube_upload.py 와 동일)
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
        raise ValueError(f"지원하지 않는 언어 코드입니다: {lang_code}")

    return lang_code


# =========================================================
# 폴더 검색 (CONVERSATION_DIR/{lang_code}/ 아래, a1_~c2_ 로 시작하는 폴더만)
# =========================================================

def list_language_folders(lang_code):
    lang_dir = CONVERSATION_DIR / lang_code

    if not lang_dir.exists():
        raise FileNotFoundError(f"언어 폴더가 없습니다:\n{lang_dir}")

    folders = [
        d for d in sorted(lang_dir.iterdir())
        if d.is_dir()
        and re.match(r"^(a1|a2|b1|b2|c1|c2)_", d.name, re.IGNORECASE)
    ]

    if not folders:
        raise FileNotFoundError(f"게시할 폴더가 없습니다:\n{lang_dir}")

    return folders


def prompt_folder_selection(folders):
    print("\n게시 가능한 폴더:")
    for i, d in enumerate(folders, start=1):
        print(f"  {i:>2} - {d.name}")

    choice = input("번호 선택: ").strip()

    if not choice.isdigit() or not (1 <= int(choice) <= len(folders)):
        raise ValueError(f"잘못된 번호: {choice}")

    return folders[int(choice) - 1]


def build_folder_info(lang_code, item_dir):
    folder_name = item_dir.name

    match = re.match(r"^(a1|a2|b1|b2|c1|c2)_", folder_name, re.IGNORECASE)

    if not match:
        raise ValueError(f"레벨을 폴더명에서 찾을 수 없습니다:\n{folder_name}")

    level = match.group(1).upper()

    return {
        "item_dir": item_dir,
        "folder_name": folder_name,
        "lang_code": lang_code,
        "language": LANGUAGES[lang_code],
        "level": level,
    }


def folder_name_to_title(folder_name):
    name = re.sub(r"^(a1|a2|b1|b2|c1|c2)_", "", folder_name, flags=re.IGNORECASE)
    words = [w for w in name.split("_") if w]
    return " ".join(w.capitalize() for w in words)


# =========================================================
# 이미지 찾기: {folder_name}_001.png ~ {folder_name}_006.png
# =========================================================

def find_sequential_images(item_dir, folder_name):
    images = []

    for n in range(1, 7):
        candidate = item_dir / f"{folder_name}_{n:03d}.png"

        if candidate.exists():
            images.append(candidate)

    if not images:
        raise FileNotFoundError(
            f"{folder_name}_001.png ~ {folder_name}_006.png 를 찾을 수 없습니다:\n{item_dir}"
        )

    print(f"[이미지 {len(images)}장 발견]")

    for img in images:
        print(f"  - {img.name}")

    return images


# =========================================================
# 캡션 빌드
# =========================================================

def build_caption(language, level, folder_name, include_cta=True):
    conversation_title = folder_name_to_title(folder_name)
    name = language["name"]

    lines = [
        "👉 Swipe to see the full conversation →",
    ]

    # 2번째: 7-Day Free Trial
    if include_cta:
        lines += [
            "",
            FREE_TRIAL_CTA,
        ]

    # 나머지는 기존 순서 그대로
    lines += [
        "",
        f"{name} Conversation | {level} | {conversation_title}",
        "",
        YOUTUBE_VISIT_TEXT,
        "",
        MANYLANGS_TAGLINE,
        "",
        f"#Learn{name} #{name}Conversation #{name}Speaking #{name}Practice "
        f"#ManyLangs #LanguageLearning",
    ]

    return "\n".join(lines).strip()


# =========================================================
# Firebase Storage 업로드 (Vercel 배포/로컬 폴더 삭제와 완전히 무관한
# 공개 URL을 얻기 위해 사용 - 기존 콘텐츠 업로드 파이프라인과 같은 버킷)
# =========================================================

def upload_images_to_firebase(image_paths, lang_code, folder_name):
    client = storage.Client()
    bucket = client.bucket(FIREBASE_BUCKET_NAME)

    urls = []

    for path in image_paths:
        blob_path = f"social/{lang_code}/{folder_name}/{path.name}"
        blob = bucket.blob(blob_path)

        if blob.exists():
            print(f"[이미 존재, 재사용] {blob_path}")
        else:
            blob.upload_from_filename(str(path), content_type="image/png")
            print(f"[Firebase 업로드 완료] {blob_path}")

        # 이미 올라가 있어도 공개 상태인지 항상 보장
        blob.make_public()
        urls.append(blob.public_url)

    print("\n[사용할 이미지 URL - Firebase Storage]")
    for u in urls:
        print(f"  - {u}")

    return urls


# =========================================================
# Instagram: 캐러셀(여러 장) 게시
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


def _wait_until_ready(container_id, max_wait_seconds=60):
    """캐러셀/미디어 컨테이너가 FINISHED 상태가 될 때까지 대기."""
    waited = 0
    interval = 3

    while waited < max_wait_seconds:
        resp = requests.get(
            f"{IG_GRAPH_URL}/{container_id}",
            params={
                "fields": "status_code",
                "access_token": IG_ACCESS_TOKEN,
            },
        )
        resp.raise_for_status()
        status = resp.json().get("status_code")
        print(f"[컨테이너 상태 확인] {container_id} -> {status}")

        if status == "FINISHED":
            return True

        if status == "ERROR":
            raise RuntimeError(f"컨테이너 처리 실패: {container_id}")

        time.sleep(interval)
        waited += interval

    print(f"[경고] {max_wait_seconds}초 대기했지만 아직 FINISHED가 아닙니다. 게시를 시도합니다.")
    return False


def post_instagram_carousel(image_urls, caption):
    if not IG_ACCESS_TOKEN or not IG_ACCOUNT_ID:
        raise RuntimeError(
            "IG_ACCESS_TOKEN / IG_ACCOUNT_ID 환경변수가 없습니다. "
            ".env.local 을 확인하세요."
        )

    child_ids = []

    for url in image_urls:
        resp = requests.post(
            f"{IG_GRAPH_URL}/{IG_ACCOUNT_ID}/media",
            data={
                "image_url": url,
                "is_carousel_item": "true",
                "access_token": IG_ACCESS_TOKEN,
            },
        )
        _raise_with_detail(resp)
        child_id = resp.json()["id"]
        child_ids.append(child_id)
        print(f"[컨테이너 생성] {child_id}")
        time.sleep(1)

    carousel_resp = requests.post(
        f"{IG_GRAPH_URL}/{IG_ACCOUNT_ID}/media",
        data={
            "media_type": "CAROUSEL",
            "children": ",".join(child_ids),
            "caption": caption,
            "access_token": IG_ACCESS_TOKEN,
        },
    )
    _raise_with_detail(carousel_resp)
    carousel_id = carousel_resp.json()["id"]
    print(f"[캐러셀 컨테이너 생성] {carousel_id}")

    print("\n[캐러셀 처리 대기 중...]")
    _wait_until_ready(carousel_id)

    publish_resp = requests.post(
        f"{IG_GRAPH_URL}/{IG_ACCOUNT_ID}/media_publish",
        data={
            "creation_id": carousel_id,
            "access_token": IG_ACCESS_TOKEN,
        },
    )

    # "Media ID is not available" 에러(2207027)가 나오면 몇 초 더 기다렸다가 재시도
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
                        "creation_id": carousel_id,
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
    print("ManyLangs Instagram Uploader")
    print("========================================")

    lang_code = prompt_language()
    folders = list_language_folders(lang_code)
    selected_dir = prompt_folder_selection(folders)

    info = build_folder_info(lang_code, selected_dir)
    item_dir = info["item_dir"]
    language = info["language"]
    level = info["level"]
    folder_name = info["folder_name"]

    images = find_sequential_images(item_dir, folder_name)

    print()
    include_cta_input = input(
        "무료 체험 CTA를 캡션에 포함할까요? [Y/n]: "
    ).strip().lower()
    include_cta = include_cta_input in ("", "y", "yes")

    caption = build_caption(
        language=language,
        level=level,
        folder_name=folder_name,
        include_cta=include_cta,
    )

    print()
    print("========================================")
    print("캡션 미리보기")
    print("========================================")
    print(caption)
    print("========================================")

    confirm = input("\n이 설정으로 Instagram에 게시할까요? [y/N]: ").strip().lower()

    if confirm != "y":
        print("게시를 취소했습니다.")
        return

    image_urls = upload_images_to_firebase(images, lang_code, folder_name)
    post_instagram_carousel(image_urls, caption)

    print()
    print("========================================")
    print("전체 작업 완료")
    print("========================================")


if __name__ == "__main__":
    main()