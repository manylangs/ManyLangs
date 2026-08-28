"""
voice_pool_b.py

story/longform 전용 B 화자(매 씬 새 인물) 성별별 보이스 풀.
tts/common/config.py(A 화자 고정 보이스, LANGUAGE_CODE 등 기존 공용 설정)는
건드리지 않고, longform에서만 쓰는 값을 이 파일에 별도로 둔다.

8개 언어(ru 포함) 전부 Chirp3 HD, 같은 캐릭터 이름(Puck/Charon/Fenrir,
Kore/Aoede/Leda)으로 통일. pt는 target_lang으로 쓰일 때 원문 자체가
pt-BR로 생성되므로 pt-BR Chirp3 HD 사용 (번역 전용 pt-PT 표준과는 무관).
"""

VOICE_POOL_B = {
    "en": {
        "male": [
            "en-US-Chirp3-HD-Puck",
            "en-US-Chirp3-HD-Charon",
            "en-US-Chirp3-HD-Fenrir",
        ],
        "female": [
            "en-US-Chirp3-HD-Kore",
            "en-US-Chirp3-HD-Aoede",
            "en-US-Chirp3-HD-Leda",
        ],
    },
    "kr": {
        "male": [
            "ko-KR-Chirp3-HD-Puck",
            "ko-KR-Chirp3-HD-Charon",
            "ko-KR-Chirp3-HD-Fenrir",
        ],
        "female": [
            "ko-KR-Chirp3-HD-Kore",
            "ko-KR-Chirp3-HD-Aoede",
            "ko-KR-Chirp3-HD-Leda",
        ],
    },
    "es": {
        "male": [
            "es-ES-Chirp3-HD-Puck",
            "es-ES-Chirp3-HD-Charon",
            "es-ES-Chirp3-HD-Fenrir",
        ],
        "female": [
            "es-ES-Chirp3-HD-Kore",
            "es-ES-Chirp3-HD-Aoede",
            "es-ES-Chirp3-HD-Leda",
        ],
    },
    "fr": {
        "male": [
            "fr-FR-Chirp3-HD-Puck",
            "fr-FR-Chirp3-HD-Charon",
            "fr-FR-Chirp3-HD-Fenrir",
        ],
        "female": [
            "fr-FR-Chirp3-HD-Kore",
            "fr-FR-Chirp3-HD-Aoede",
            "fr-FR-Chirp3-HD-Leda",
        ],
    },
    "pt": {
        "male": [
            "pt-BR-Chirp3-HD-Puck",
            "pt-BR-Chirp3-HD-Charon",
            "pt-BR-Chirp3-HD-Fenrir",
        ],
        "female": [
            "pt-BR-Chirp3-HD-Kore",
            "pt-BR-Chirp3-HD-Aoede",
            "pt-BR-Chirp3-HD-Leda",
        ],
    },
    "jp": {
        "male": [
            "ja-JP-Chirp3-HD-Puck",
            "ja-JP-Chirp3-HD-Charon",
            "ja-JP-Chirp3-HD-Fenrir",
        ],
        "female": [
            "ja-JP-Chirp3-HD-Kore",
            "ja-JP-Chirp3-HD-Aoede",
            "ja-JP-Chirp3-HD-Leda",
        ],
    },
    "zh": {
        "male": [
            "cmn-CN-Chirp3-HD-Puck",
            "cmn-CN-Chirp3-HD-Charon",
            "cmn-CN-Chirp3-HD-Fenrir",
        ],
        "female": [
            "cmn-CN-Chirp3-HD-Kore",
            "cmn-CN-Chirp3-HD-Aoede",
            "cmn-CN-Chirp3-HD-Leda",
        ],
    },
    "ru": {
        "male": [
            "ru-RU-Chirp3-HD-Puck",
            "ru-RU-Chirp3-HD-Charon",
            "ru-RU-Chirp3-HD-Fenrir",
        ],
        "female": [
            "ru-RU-Chirp3-HD-Kore",
            "ru-RU-Chirp3-HD-Aoede",
            "ru-RU-Chirp3-HD-Leda",
        ],
    },
}

# ---------------------------------------------------------------------------
# tts/common/config.py에는 아직 ru가 없다 (SUPPORTED_LANGS/LANGUAGE_CODE/
# VOICE_AB 전부 기존 7개 언어만 등록됨, 2026-08 확인). 공용 config.py는
# 건드리지 않는다는 기존 원칙을 그대로 지키기 위해, longform 전용으로
# A 화자 보이스 + LANGUAGE_CODE를 여기서만 보강한다.
# longform_pipeline.py는 tts_config.VOICE_AB / LANGUAGE_CODE에 target_lang이
# 없을 때만 이 값을 대신 쓴다 -- 나중에 config.py에 ru가 정식으로 추가되면
# 그쪽이 우선되고 이 블록은 자동으로 안 쓰이게 된다.
EXTRA_VOICE_AB = {
    "ru": {
        "A": "ru-RU-Chirp3-HD-Aoede",
        "B": "ru-RU-Chirp3-HD-Charon",
    },
}
EXTRA_LANGUAGE_CODE = {
    "ru": "ru-RU",
}
