#!/usr/bin/env python3

from pathlib import Path
import json
import os
import re
import urllib.error
import urllib.request

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload


# =========================================================
# 기본 설정
# =========================================================

BASE_DIR = Path(__file__).resolve().parent
TOKEN_FILE = Path("/Users/junghasuk/Desktop/manylangs 최종 설계/중요한키/youtube_keys/token.json")

SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube",
]

# 테스트 완료 전까지 PRIVATE
PRIVACY_STATUS = "private"

# =========================================================
# 언어 설정
# =========================================================

LANGUAGES = {
    "en": {
        "name": "English",
        "native_name": "English",
        "learn": "LearnEnglish",
        "conversation": "EnglishConversation",
        "speaking": "EnglishSpeaking",
        "practice": "EnglishPractice",
    },
    "kr": {
        "name": "Korean",
        "native_name": "한국어",
        "learn": "LearnKorean",
        "conversation": "KoreanConversation",
        "speaking": "KoreanSpeaking",
        "practice": "KoreanPractice",
    },
    "ja": {
        "name": "Japanese",
        "native_name": "日本語",
        "learn": "LearnJapanese",
        "conversation": "JapaneseConversation",
        "speaking": "JapaneseSpeaking",
        "practice": "JapanesePractice",
    },
    "zh": {
        "name": "Chinese",
        "native_name": "简体中文",
        "learn": "LearnChinese",
        "conversation": "ChineseConversation",
        "speaking": "ChineseSpeaking",
        "practice": "ChinesePractice",
    },
    "es": {
        "name": "Spanish",
        "native_name": "Español",
        "learn": "LearnSpanish",
        "conversation": "SpanishConversation",
        "speaking": "SpanishSpeaking",
        "practice": "SpanishPractice",
    },
    "fr": {
        "name": "French",
        "native_name": "Français",
        "learn": "LearnFrench",
        "conversation": "FrenchConversation",
        "speaking": "FrenchSpeaking",
        "practice": "FrenchPractice",
    },
    "pt": {
        "name": "Portuguese",
        "native_name": "Português",
        "learn": "LearnPortuguese",
        "conversation": "PortugueseConversation",
        "speaking": "PortugueseSpeaking",
        "practice": "PortuguesePractice",
    },
    "de": {
        "name": "German",
        "native_name": "Deutsch",
        "learn": "LearnGerman",
        "conversation": "GermanConversation",
        "speaking": "GermanSpeaking",
        "practice": "GermanPractice",
    },
}


# YouTube 현지화 언어 코드
# 내부 코드 kr/jp는 YouTube BCP-47 코드 ko/ja로 변환한다.
YOUTUBE_LANGUAGE_CODES = {
    "en": "en",
    "es": "es",
    "fr": "fr",
    "pt": "pt",
    "zh": "zh-CN",
    "ja": "ja",
    "kr": "ko",
    "de": "de",
}

# 현재 ManyLangs 기본 사용자 언어 7종
BASE_LOCALIZATION_LANGS = ["en", "es", "fr", "pt", "zh", "ja", "kr"]


# =========================================================
# YouTube 인증
# =========================================================

def get_youtube():
    if not TOKEN_FILE.exists():
        raise FileNotFoundError(
            f"token.json이 없습니다:\n{TOKEN_FILE}"
        )

    creds = Credentials.from_authorized_user_file(
        str(TOKEN_FILE),
        SCOPES,
    )

    return build(
        "youtube",
        "v3",
        credentials=creds,
    )


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
# 폴더 검색 (BASE_DIR/{lang_code}/ 아래, a1_~c2_로 시작하는 폴더만)
# =========================================================

def list_language_folders(lang_code):
    lang_dir = BASE_DIR / lang_code

    if not lang_dir.exists():
        raise FileNotFoundError(
            f"언어 폴더가 없습니다:\n{lang_dir}"
        )

    folders = [
        d for d in sorted(lang_dir.iterdir())
        if d.is_dir()
        and re.match(r"^(a1|a2|b1|b2|c1|c2)_", d.name, re.IGNORECASE)
    ]

    if not folders:
        raise FileNotFoundError(
            f"업로드할 폴더가 없습니다:\n{lang_dir}"
        )

    return folders


# =========================================================
# 번호로 폴더 선택
# =========================================================

def prompt_folder_selection(folders):
    print("\n업로드 가능한 폴더:")
    for i, d in enumerate(folders, start=1):
        print(f"  {i:>2} - {d.name}")

    choice = input("번호 선택: ").strip()

    if not choice.isdigit() or not (1 <= int(choice) <= len(folders)):
        raise ValueError(
            f"잘못된 번호: {choice}"
        )

    return folders[int(choice) - 1]


# =========================================================
# 선택된 폴더 정보 구성
#
# en/a1_ordering_at_a_cafe (폴더) -> English / A1
# =========================================================

def build_folder_info(lang_code, item_dir):
    folder_name = item_dir.name

    match = re.match(
        r"^(a1|a2|b1|b2|c1|c2)_",
        folder_name,
        re.IGNORECASE,
    )

    if not match:
        raise ValueError(
            f"레벨을 폴더명에서 찾을 수 없습니다:\n{folder_name}"
        )

    level = match.group(1).upper()

    return {
        "item_dir": item_dir,
        "folder_name": folder_name,
        "lang_code": lang_code,
        "language": LANGUAGES[lang_code],
        "level": level,
    }


# =========================================================
# 순번 입력
# =========================================================

def ask_sequence_number():
    while True:
        value = input(
            "이 영상의 순번 (예: 10): "
        ).strip()

        if not value.isdigit():
            print("숫자만 입력해주세요.")
            continue

        number = int(value)

        if number < 1:
            print("순번은 1 이상이어야 합니다.")
            continue

        return number


# =========================================================
# 순번 표시
#
# 1  -> 01
# 9  -> 09
# 10 -> 10
# =========================================================

def format_sequence(number):
    return f"{number:02d}"


# =========================================================
# final.mp4 찾기
# =========================================================

def find_final_video(item_dir):
    item_dir = Path(item_dir)

    expected = item_dir / f"{item_dir.name}.final.mp4"

    if expected.exists():
        return expected

    videos = list(item_dir.glob("*.final.mp4"))

    if len(videos) == 1:
        return videos[0]

    if not videos:
        raise FileNotFoundError(
            f"final.mp4를 찾을 수 없습니다:\n{item_dir}"
        )

    raise RuntimeError(
        f"final.mp4가 여러 개 있습니다:\n{item_dir}"
    )


# =========================================================
# 폴더명 -> 영어 상황 제목
#
# a1_ordering_at_a_cafe
# -> Ordering At A Cafe
#
# 중요:
# YouTube 영어 상황 제목은 JSON을 보지 않고
# 사용자가 입력한 실제 폴더명을 기준으로 한다.
# =========================================================

def folder_name_to_title(folder_name):
    name = re.sub(
        r"^(a1|a2|b1|b2|c1|c2)_",
        "",
        folder_name,
        flags=re.IGNORECASE,
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


# =========================================================
# 회화 제목 결정
#
# 반드시 폴더명 기준
# =========================================================

def get_conversation_title(folder_name):
    return folder_name_to_title(folder_name)


# =========================================================
# 비영어 영상용 현지어 상황 제목
#
# 예:
# Korean Conversation | A1 | 10 |
# Ordering At A Cafe | 카페에서 주문하기
#
# 1) English(en)은 번역하지 않음
# 2) 다른 언어는 DeepSeek로 상황명만 짧고 자연스럽게 번역
# 3) 결과는 폴더 안 youtube_title_cache.json에 저장해서 재사용
# 4) API 키가 없으면 터미널에서 현지어 제목을 한 번 직접 입력 가능
# =========================================================

DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"
DEEPSEEK_MODEL = "deepseek-chat"
TITLE_CACHE_FILENAME = "youtube_title_cache.json"


def load_title_cache(item_dir):
    cache_path = Path(item_dir) / TITLE_CACHE_FILENAME

    if not cache_path.exists():
        return {}

    try:
        with open(cache_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        return data if isinstance(data, dict) else {}

    except Exception:
        return {}


def save_title_cache(item_dir, cache):
    cache_path = Path(item_dir) / TITLE_CACHE_FILENAME

    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(
            cache,
            f,
            ensure_ascii=False,
            indent=2,
        )


def translate_topic_with_deepseek(
    english_title,
    lang_code,
    language_name,
    native_name,
):
    api_key = os.environ.get(
        "DEEPSEEK_API_KEY",
        "",
    ).strip()

    if not api_key:
        return None

    prompt = (
        "Translate the following short language-learning conversation topic "
        f"from English into {language_name} ({native_name}). "
        "Return ONLY the translated topic. "
        "Use a natural, concise title suitable for a YouTube Shorts title. "
        "Do not add quotation marks, explanations, labels, emojis, "
        "or punctuation at the end.\n\n"
        f"English topic: {english_title}"
    )

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a professional localization editor "
                    "for language-learning content. "
                    "Translate titles naturally and concisely."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        "temperature": 0.2,
        "max_tokens": 80,
    }

    request = urllib.request.Request(
        DEEPSEEK_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(
            request,
            timeout=30,
        ) as response:
            data = json.loads(
                response.read().decode("utf-8")
            )

        translated = (
            data["choices"][0]["message"]["content"]
            .strip()
            .strip('"')
            .strip("'")
        )

        return translated or None

    except (
        urllib.error.URLError,
        urllib.error.HTTPError,
        KeyError,
        IndexError,
        json.JSONDecodeError,
    ) as e:
        print(
            f"[경고] DeepSeek 제목 번역 실패: {e}"
        )
        return None


def get_localized_topic_title(
    item_dir,
    lang_code,
    language,
    english_title,
):
    # 영어 영상은 영어 제목 하나만 사용
    if lang_code == "en":
        return None

    cache = load_title_cache(item_dir)

    cache_key = f"{lang_code}:{english_title}"
    cached = cache.get(cache_key)

    if isinstance(cached, str) and cached.strip():
        print(
            f"[현지어 제목 캐시 사용] "
            f"{cached.strip()}"
        )
        return cached.strip()

    translated = translate_topic_with_deepseek(
        english_title=english_title,
        lang_code=lang_code,
        language_name=language["name"],
        native_name=language["native_name"],
    )

    if translated:
        print(
            f"[현지어 제목 자동 번역] "
            f"{translated}"
        )

        cache[cache_key] = translated
        save_title_cache(
            item_dir,
            cache,
        )

        return translated

    print()
    print(
        f"[안내] DEEPSEEK_API_KEY가 없거나 번역에 실패했습니다. "
        f"{language['name']} 상황 제목을 직접 입력하면 됩니다."
    )

    manual = input(
        f"현지어 상황 제목 "
        f"({language['native_name']}): "
    ).strip()

    if not manual:
        raise ValueError(
            "비영어 영상은 현지어 상황 제목이 필요합니다."
        )

    cache[cache_key] = manual
    save_title_cache(
        item_dir,
        cache,
    )

    return manual


# =========================================================
# YouTube 제목
#
# 영어:
# English Conversation | A1 | 10 | Ordering At A Cafe
#
# 비영어:
# Korean Conversation | A1 | 10 |
# Ordering At A Cafe | 카페에서 주문하기
# =========================================================

def build_youtube_title(
    language_name,
    level,
    sequence,
    conversation_title,
    localized_title=None,
):
    """
    업로드 시 기본 제목.

    영어 목표 영상은 영어 제목을 사용한다.
    비영어 목표 영상은 해당 목표 언어의 상황 제목을 사용한다.
    이후 localizations API로 시청자 언어별 전체 제목을 추가한다.
    """
    seq = format_sequence(sequence)

    if language_name == "English":
        topic = conversation_title
    else:
        if not localized_title:
            raise ValueError("비영어 영상은 현지어 제목이 필요합니다.")
        topic = localized_title

    # 목표 언어 자체의 자연스러운 표기는 현지화 단계에서 다시 등록되지만,
    # 기본 제목은 기존 파이프라인 호환성을 위해 영어 language_name을 유지한다.
    title = f"{language_name} Conversation | {level} | {seq} | {topic}"
    return title[:100]


# =========================================================
# 개별 Shorts 설명란
# =========================================================

def build_description(
    language,
    level,
    sequence,
    conversation_title,
    localized_title=None,
):
    name = language["name"]
    seq = format_sequence(sequence)

    display_topic = conversation_title

    if localized_title:
        display_topic = (
            f"{conversation_title} | "
            f"{localized_title}"
        )

    description = f"""\
{name} Conversation | {level} | {seq} | {display_topic}

Learn natural {name} conversations step by step with ManyLangs.

🎧 Listen and practice real-life conversations
🔁 Play and repeat each line
💬 Turn on CC for translations
🧠 Hide/show translations to test your memory

This course includes:
• A1–C2 Levels
• 10 Chapters per Level
• 10 Conversation Sets per Chapter

🌐 Practice on ManyLangs:
https://www.manylangs.studio

📧 help@manylangs.studio

📱 Google Play: Search "ManyLangs"
 Apple App Store: Coming Soon

📸 Instagram: https://instagram.com/manylangs
📘 Facebook: https://facebook.com/manylangs
𝕏 X: https://x.com/manylangs
👽 Reddit: https://reddit.com/u/manylangs

🔍 Google: Search "ManyLangs"

#{language["learn"]} #{language["conversation"]} #{language["speaking"]} #{language["practice"]} #ManyLangs #Shorts
"""

    return description.strip()


# =========================================================
# 플레이리스트 설명
#
# 모든 언어 + 레벨 플레이리스트 공통 설명
# =========================================================

def build_playlist_description():
    description = """\
🌍 Learn languages through real-life conversations with ManyLangs.

Choose the language you want to learn, then study with explanations and subtitles in the language you understand best — English, Spanish, French, Portuguese, Mandarin Chinese, Japanese, or Korean.

🎧 Listen to natural conversations

🔁 Listen, repeat, and practice

💬 Learn with multilingual subtitles

📚 Progress from A1 to C2

🌎 Learn multiple languages in one place

🚀 Try free lessons and explore the full curriculum

📧 Email: help@manylangs.studio

Try Free Lesson 👉
https://www.manylangs.studio/demo

Official Website
https://www.manylangs.studio

Sign Up
https://www.manylangs.studio/signup

Google Play
Search "ManyLangs" on Google Play

Full Curriculum
https://www.manylangs.studio/curriculum

Instagram
https://instagram.com/manylangs

Facebook
https://facebook.com/manylangs

X
https://x.com/manylangs

Reddit
https://reddit.com/u/manylangs

 Apple App Store: Coming Soon
"""

    return description.strip()


# =========================================================
# 다국어 제목 현지화
#
# 기본 7종: EN / ES / FR / PT / ZH / JA / KR
# 목표 언어가 DE처럼 기본 7종 밖이면 목표 언어도 자동 추가
#
# 예: 목표 언어 Korean
# ko -> 한국어 회화 | A1 | 10 | 카페에서 주문하기
# en -> Korean Conversation | A1 | 10 | Ordering At A Cafe
# es -> Conversación en coreano | A1 | 10 | Pedir en una cafetería
# =========================================================

def get_localization_language_codes(target_lang_code):
    codes = list(BASE_LOCALIZATION_LANGS)
    if target_lang_code not in codes:
        codes.append(target_lang_code)
    return codes


def translate_full_titles_with_deepseek(
    target_lang_code,
    target_language_name,
    level,
    sequence,
    english_topic,
    target_topic,
):
    api_key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError(
            "다국어 제목 생성에는 DEEPSEEK_API_KEY가 필요합니다."
        )

    requested_codes = get_localization_language_codes(target_lang_code)
    seq = format_sequence(sequence)

    language_labels = {
        "en": "English",
        "es": "European Spanish",
        "fr": "French",
        "pt": "European Portuguese",
        "zh": "Simplified Chinese",
        "ja": "Japanese",
        "kr": "Korean",
        "de": "German",
    }

    requested = ", ".join(
        f'{code}={language_labels.get(code, LANGUAGES[code]["name"])}'
        for code in requested_codes
    )

    prompt = f"""
Create localized YouTube Shorts titles for a language-learning video.

TARGET LANGUAGE BEING LEARNED: {target_language_name}
LEVEL: {level}
NUMBER: {seq}
ENGLISH TOPIC: {english_topic}
TARGET-LANGUAGE TOPIC: {target_topic or english_topic}

Return ONLY one valid JSON object.
Required keys: {requested}

For every language, translate the ENTIRE semantic title naturally, including
the target-language label and the word 'Conversation', not only the topic.
Keep A1 and {seq} unchanged.
Use this structure semantically:
[target language] Conversation | {level} | {seq} | [topic]

Examples for a Korean target:
English: Korean Conversation | A1 | 10 | Ordering At A Cafe
Korean: 한국어 회화 | A1 | 10 | 카페에서 주문하기

Rules:
- es must be natural European Spanish.
- pt must be natural European Portuguese.
- zh must be natural Simplified Chinese.
- Keep each title concise and under 100 characters.
- No emojis, explanations, markdown, or extra keys.
""".strip()

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a professional multilingual localization editor "
                    "for language-learning YouTube content. Output strict JSON only."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.1,
        "max_tokens": 700,
        "response_format": {"type": "json_object"},
    }

    request = urllib.request.Request(
        DEEPSEEK_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=45) as response:
        data = json.loads(response.read().decode("utf-8"))

    raw = data["choices"][0]["message"]["content"].strip()
    titles = json.loads(raw)

    result = {}
    for code in requested_codes:
        title = titles.get(code)
        if not isinstance(title, str) or not title.strip():
            raise ValueError(f"현지화 제목 누락: {code}")
        result[code] = title.strip()[:100]

    return result


def build_video_localizations(localized_titles, base_description):
    localizations = {}
    for internal_code, title in localized_titles.items():
        youtube_code = YOUTUBE_LANGUAGE_CODES[internal_code]
        localizations[youtube_code] = {
            "title": title,
            # 제목만 현지화하는 목적이지만 YouTube 리소스 호환성을 위해
            # 설명은 현재 기본 설명을 그대로 보존한다.
            "description": base_description,
        }
    return localizations


def update_video_localizations(
    youtube,
    video_id,
    target_lang_code,
    localized_titles,
    base_description,
):
    # 기존 snippet/localizations를 먼저 읽어 안전하게 보존한다.
    response = youtube.videos().list(
        part="snippet,localizations",
        id=video_id,
    ).execute()

    items = response.get("items", [])
    if not items:
        raise RuntimeError(f"YouTube 영상을 찾을 수 없습니다: {video_id}")

    video = items[0]
    snippet = video["snippet"]
    existing_localizations = video.get("localizations", {}) or {}

    new_localizations = build_video_localizations(
        localized_titles,
        base_description,
    )
    existing_localizations.update(new_localizations)

    # localizations를 쓰려면 snippet.defaultLanguage가 필요하다.
    default_language = YOUTUBE_LANGUAGE_CODES[target_lang_code]

    update_snippet = {
        "title": snippet["title"],
        "description": snippet.get("description", ""),
        "categoryId": snippet.get("categoryId", "27"),
        "defaultLanguage": default_language,
    }

    if "tags" in snippet:
        update_snippet["tags"] = snippet["tags"]

    youtube.videos().update(
        part="snippet,localizations",
        body={
            "id": video_id,
            "snippet": update_snippet,
            "localizations": existing_localizations,
        },
    ).execute()

    print("[다국어 제목 현지화 완료]")
    for code in get_localization_language_codes(target_lang_code):
        print(f"  {code}: {localized_titles[code]}")


# =========================================================
# Tags
# =========================================================

def build_tags(language, level):
    name = language["name"]

    return [
        f"Learn {name}",
        f"{name} Conversation",
        f"{name} Speaking",
        f"{name} Practice",
        f"{name} {level}",
        "Language Learning",
        "ManyLangs",
        "Shorts",
    ]


# =========================================================
# 기존 플레이리스트 설명 업데이트
# =========================================================

def update_playlist_description(
    youtube,
    playlist_id,
    playlist_title,
):
    description = build_playlist_description()

    youtube.playlists().update(
        part="snippet",
        body={
            "id": playlist_id,
            "snippet": {
                "title": playlist_title,
                "description": description,
            },
        },
    ).execute()

    print(
        f"[플레이리스트 설명 동기화 완료] "
        f"{playlist_title}"
    )


# =========================================================
# 플레이리스트 검색 / 생성
#
# English | A1
# Korean | A1
# Japanese | B1
# =========================================================

def get_or_create_playlist(
    youtube,
    language_name,
    level,
):
    playlist_title = (
        f"{language_name} | {level}"
    )

    playlist_description = (
        build_playlist_description()
    )

    print()
    print("========================================")
    print("플레이리스트 확인")
    print("========================================")
    print(
        f"플레이리스트: "
        f"{playlist_title}"
    )

    request = youtube.playlists().list(
        part="snippet",
        mine=True,
        maxResults=50,
    )

    while request:
        response = request.execute()

        for item in response.get(
            "items",
            [],
        ):
            existing_title = (
                item["snippet"]["title"].strip()
            )

            if (
                existing_title.lower()
                == playlist_title.lower()
            ):
                playlist_id = item["id"]

                print(
                    f"[기존 플레이리스트 사용] "
                    f"{playlist_title}"
                )

                # 기존 플레이리스트도
                # 최신 공통 설명으로 자동 동기화
                update_playlist_description(
                    youtube=youtube,
                    playlist_id=playlist_id,
                    playlist_title=playlist_title,
                )

                return playlist_id

        request = youtube.playlists().list_next(
            request,
            response,
        )

    print(
        f"[플레이리스트 없음] "
        f"{playlist_title}"
    )

    print(
        "[새 플레이리스트 생성 중]"
    )

    response = youtube.playlists().insert(
        part="snippet,status",
        body={
            "snippet": {
                "title": playlist_title,
                "description": (
                    playlist_description
                ),
            },
            "status": {
                "privacyStatus": "public",
            },
        },
    ).execute()

    playlist_id = response["id"]

    print(
        f"[플레이리스트 생성 완료] "
        f"{playlist_title}"
    )

    return playlist_id


# =========================================================
# 플레이리스트에 영상 등록
# =========================================================

def add_video_to_playlist(
    youtube,
    playlist_id,
    video_id,
):
    response = (
        youtube.playlistItems()
        .insert(
            part="snippet",
            body={
                "snippet": {
                    "playlistId": (
                        playlist_id
                    ),
                    "resourceId": {
                        "kind": (
                            "youtube#video"
                        ),
                        "videoId": video_id,
                    },
                },
            },
        )
        .execute()
    )

    print(
        "[플레이리스트 등록 완료]"
    )

    return response["id"]


# =========================================================
# 플레이리스트 전체 영상 가져오기
# =========================================================

def get_playlist_items(
    youtube,
    playlist_id,
):
    items = []

    request = (
        youtube.playlistItems()
        .list(
            part="snippet",
            playlistId=playlist_id,
            maxResults=50,
        )
    )

    while request:
        response = request.execute()

        items.extend(
            response.get(
                "items",
                [],
            )
        )

        request = (
            youtube.playlistItems()
            .list_next(
                request,
                response,
            )
        )

    return items


# =========================================================
# 제목에서 순번 읽기
#
# English Conversation | A1 | 10 | Ordering At A Cafe
# -> 10
# =========================================================

def extract_sequence_from_title(title):
    match = re.search(
        r"\|\s*(\d+)\s*\|",
        title,
    )

    if not match:
        return None

    return int(
        match.group(1)
    )


# =========================================================
# 플레이리스트 번호순 자동 정렬
#
# 01
# 02
# 03
# ...
# 10
# =========================================================

def reorder_playlist_by_sequence(
    youtube,
    playlist_id,
):
    print()
    print("========================================")
    print("플레이리스트 순번 자동 정렬")
    print("========================================")

    items = get_playlist_items(
        youtube,
        playlist_id,
    )

    sortable = []
    unnumbered = []

    for item in items:
        title = (
            item["snippet"]["title"]
        )

        sequence = (
            extract_sequence_from_title(
                title
            )
        )

        if sequence is None:
            unnumbered.append(
                item
            )

        else:
            sortable.append(
                (
                    sequence,
                    title,
                    item,
                )
            )

    sortable.sort(
        key=lambda x: x[0]
    )

    ordered_items = [
        item
        for _, _, item in sortable
    ] + unnumbered

    for position, item in enumerate(
        ordered_items
    ):
        snippet = item["snippet"]

        current_position = (
            snippet.get("position")
        )

        if current_position == position:
            continue

        youtube.playlistItems().update(
            part="snippet",
            body={
                "id": item["id"],
                "snippet": {
                    "playlistId": (
                        playlist_id
                    ),
                    "position": position,
                    "resourceId": {
                        "kind": (
                            "youtube#video"
                        ),
                        "videoId": (
                            snippet[
                                "resourceId"
                            ]["videoId"]
                        ),
                    },
                },
            },
        ).execute()

    print(
        "[번호순 자동 정렬 완료]"
    )

    print()

    if sortable:
        print(
            "현재 번호 영상:"
        )

        for (
            sequence,
            title,
            _,
        ) in sortable:
            print(
                f"  "
                f"{format_sequence(sequence)} "
                f"-> {title}"
            )

    if unnumbered:
        print()
        print(
            "[참고] 번호가 없는 기존 영상은 "
            "재생목록 뒤쪽에 유지됩니다."
        )


# =========================================================
# 영상 업로드
# =========================================================

def upload_video(
    youtube,
    video_path,
    title,
    description,
    tags,
    default_language,
):
    print()
    print("========================================")
    print("YouTube 업로드")
    print("========================================")
    print(
        f"영상: {video_path}"
    )
    print(
        f"제목: {title}"
    )
    print(
        f"공개 상태: "
        f"{PRIVACY_STATUS.upper()}"
    )
    print("========================================")
    print()

    body = {
        "snippet": {
            "title": title,
            "description": description,
            "tags": tags,
            "categoryId": "27",
            "defaultLanguage": default_language,
        },
        "status": {
            "privacyStatus": (
                PRIVACY_STATUS
            ),
            "selfDeclaredMadeForKids": (
                False
            ),
        },
    }

    media = MediaFileUpload(
        str(video_path),
        mimetype="video/mp4",
        resumable=True,
        chunksize=8 * 1024 * 1024,
    )

    request = (
        youtube.videos()
        .insert(
            part="snippet,status",
            body=body,
            media_body=media,
        )
    )

    response = None

    while response is None:
        status, response = (
            request.next_chunk()
        )

        if status:
            percent = int(
                status.progress()
                * 100
            )

            print(
                f"업로드 중: "
                f"{percent}%"
            )

    video_id = response["id"]

    print()
    print("========================================")
    print("영상 업로드 성공")
    print("========================================")
    print(
        f"Video ID: {video_id}"
    )
    print(
        f"YouTube: "
        f"https://youtu.be/{video_id}"
    )
    print(
        f"공개 상태: "
        f"{PRIVACY_STATUS.upper()}"
    )
    print("========================================")

    return video_id


# =========================================================
# MAIN
# =========================================================

def main():
    print()
    print("========================================")
    print("ManyLangs YouTube Uploader")
    print("========================================")

    # -----------------------------------------------------
    # 언어 선택 -> 해당 언어 폴더 안 후보를 번호로 보여주고 선택
    # (예전처럼 "en/a1_ordering_at_a_cafe"를 직접 입력하지 않는다)
    # -----------------------------------------------------

    lang_code = prompt_language()

    folders = list_language_folders(lang_code)

    selected_dir = prompt_folder_selection(folders)

    info = build_folder_info(
        lang_code,
        selected_dir,
    )

    item_dir = info["item_dir"]
    language = info["language"]
    lang_code = info["lang_code"]
    level = info["level"]
    folder_name = info["folder_name"]

    # -----------------------------------------------------
    # 순번 입력
    # -----------------------------------------------------

    sequence = ask_sequence_number()

    sequence_text = format_sequence(
        sequence
    )

    # -----------------------------------------------------
    # 영상 찾기
    # -----------------------------------------------------

    video_path = find_final_video(
        item_dir
    )

    # -----------------------------------------------------
    # 영어 회화 제목
    #
    # 반드시 폴더명 기준
    # -----------------------------------------------------

    conversation_title = (
        get_conversation_title(
            folder_name
        )
    )

    # -----------------------------------------------------
    # 비영어 영상 현지어 상황 제목
    # -----------------------------------------------------

    localized_title = (
        get_localized_topic_title(
            item_dir=item_dir,
            lang_code=lang_code,
            language=language,
            english_title=(
                conversation_title
            ),
        )
    )

    # -----------------------------------------------------
    # YouTube 메타데이터
    # -----------------------------------------------------

    youtube_title = (
        build_youtube_title(
            language["name"],
            level,
            sequence,
            conversation_title,
            localized_title,
        )
    )

    description = (
        build_description(
            language,
            level,
            sequence,
            conversation_title,
            localized_title,
        )
    )

    # -----------------------------------------------------
    # 7개 사용자 언어 + 목표 언어 전체 제목 현지화 생성
    # -----------------------------------------------------

    localized_titles = translate_full_titles_with_deepseek(
        target_lang_code=lang_code,
        target_language_name=language["name"],
        level=level,
        sequence=sequence,
        english_topic=conversation_title,
        target_topic=localized_title,
    )

    tags = build_tags(
        language,
        level,
    )

    playlist_title = (
        f"{language['name']} | "
        f"{level}"
    )

    # -----------------------------------------------------
    # 업로드 전 최종 확인
    # -----------------------------------------------------

    print()
    print("========================================")
    print("자동 생성 결과")
    print("========================================")
    print(
        f"언어: "
        f"{language['name']}"
    )
    print(
        f"레벨: {level}"
    )
    print(
        f"순번: {sequence_text}"
    )
    print(
        f"회화(영어/폴더명 기준): "
        f"{conversation_title}"
    )

    if localized_title:
        print(
            f"회화(현지어): "
            f"{localized_title}"
        )

    print(
        f"플레이리스트: "
        f"{playlist_title}"
    )

    print()
    print(
        f"영상: {video_path}"
    )

    print()
    print("제목:")
    print(
        youtube_title
    )

    print()
    print("설명:")
    print(
        "----------------------------------------"
    )
    print(
        description
    )
    print(
        "----------------------------------------"
    )

    print()
    print("다국어 현지화 제목:")
    for code in get_localization_language_codes(lang_code):
        print(f"  {code}: {localized_titles[code]}")

    print()
    print(
        f"공개 상태: "
        f"{PRIVACY_STATUS.upper()}"
    )

    print()

    confirm = input(
        "이 설정으로 YouTube에 업로드할까요? "
        "[y/N]: "
    ).strip().lower()

    if confirm != "y":
        print(
            "업로드를 취소했습니다."
        )
        return

    # -----------------------------------------------------
    # YouTube 연결
    # -----------------------------------------------------

    youtube = get_youtube()

    # -----------------------------------------------------
    # 플레이리스트 확인 / 생성
    #
    # 새 플레이리스트:
    #   공통 설명 자동 생성
    #
    # 기존 플레이리스트:
    #   공통 설명 자동 동기화
    # -----------------------------------------------------

    playlist_id = (
        get_or_create_playlist(
            youtube=youtube,
            language_name=(
                language["name"]
            ),
            level=level,
        )
    )

    # -----------------------------------------------------
    # 영상 업로드
    # -----------------------------------------------------

    video_id = upload_video(
        youtube=youtube,
        video_path=video_path,
        title=youtube_title,
        description=description,
        tags=tags,
        default_language=YOUTUBE_LANGUAGE_CODES[lang_code],
    )

    # -----------------------------------------------------
    # 다국어 제목 현지화 등록
    # 영상은 재업로드하지 않고 같은 Video ID에 localizations만 추가
    # -----------------------------------------------------

    update_video_localizations(
        youtube=youtube,
        video_id=video_id,
        target_lang_code=lang_code,
        localized_titles=localized_titles,
        base_description=description,
    )

    # -----------------------------------------------------
    # 플레이리스트 등록
    # -----------------------------------------------------

    add_video_to_playlist(
        youtube=youtube,
        playlist_id=playlist_id,
        video_id=video_id,
    )

    # -----------------------------------------------------
    # 플레이리스트 번호순 재정렬
    # -----------------------------------------------------

    reorder_playlist_by_sequence(
        youtube=youtube,
        playlist_id=playlist_id,
    )

    # -----------------------------------------------------
    # 완료
    # -----------------------------------------------------

    print()
    print("========================================")
    print("전체 작업 완료")
    print("========================================")
    print(
        f"언어: "
        f"{language['name']}"
    )
    print(
        f"레벨: {level}"
    )
    print(
        f"순번: {sequence_text}"
    )
    print(
        f"회화(영어/폴더명 기준): "
        f"{conversation_title}"
    )

    if localized_title:
        print(
            f"회화(현지어): "
            f"{localized_title}"
        )

    print(
        f"플레이리스트: "
        f"{playlist_title}"
    )
    print(
        f"Video ID: "
        f"{video_id}"
    )
    print(
        f"YouTube: "
        f"https://youtu.be/{video_id}"
    )
    print(
        f"공개 상태: "
        f"{PRIVACY_STATUS.upper()}"
    )
    print("========================================")


if __name__ == "__main__":
    main()
