"""
voice_pool_b.py

story/longform 전용 B 화자(매 씬 새 인물) 성별별 보이스 풀.
tts/common/config.py(A 화자 고정 보이스, LANGUAGE_CODE 등 기존 공용 설정)는
건드리지 않고, longform에서만 쓰는 값을 이 파일에 별도로 둔다.

7개 언어 전부 Chirp3 HD, 같은 캐릭터 이름(Puck/Charon/Fenrir,
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
}
