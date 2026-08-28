#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ManyLangs TTS 공통 설정
=======================
"""

SUPPORTED_LANGS = ["en", "kr", "es", "fr", "pt", "jp", "zh", "ru"]

LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"]

LANGUAGE_CODE = {
    "en": "en-US",
    "kr": "ko-KR",
    "es": "es-ES",
    "fr": "fr-FR",
    "pt": "pt-BR",   # Chirp3 HD는 pt-PT 미지원 → pt-BR로 변경
    "jp": "ja-JP",
    "zh": "cmn-CN",  # 중국어 간체자(중국 본토) — Google TTS는 zh가 아닌 cmn-CN 사용
    "ru": "ru-RU",
}

# voca / idiom / conversation 용 (kr 콘텐츠는 "target" 키에 있음)
TEXT_FIELD_DEFAULT = {
    "en": "en",
    "kr": "target",
    "es": "es",
    "fr": "fr",
    "pt": "pt",
    "jp": "jp",
    "zh": "zh",
    "ru": "ru",
}

# real 전용 (real JSON은 "kr" 키가 직접 존재)
TEXT_FIELD_REAL = {
    "en": "en",
    "kr": "kr",
    "es": "es",
    "fr": "fr",
    "pt": "pt",
    "jp": "jp",
    "zh": "zh",
    "ru": "ru",
}

SAMPLE_RATE = 24000

# ── Voice ──────────────────────────────────────────────────────────────
# 현재 최종 음성 정책:
#
# - en / kr / es / fr / pt / jp / zh / ru 전부 Chirp 3 HD로 통일
# - pt는 Chirp3 HD의 pt-PT 미지원으로 pt-BR 사용
# - zh는 중국 본토 간체 중국어용 cmn-CN 사용
# - ru는 러시아어 ru-RU 사용
#
# 성별 규칙 (전 언어 공통):
# - 단일 목소리 = 여성 (Aoede)
# - conversation A = 여성 (Aoede)
# - conversation B = 남성 (Charon)
#
# ※ jp/zh/ru는 첫 챕터 생성 후 문장 경계/억양 청취 검증 권장

# voca / idiom / real 등 단일 목소리 시리즈
VOICE_SINGLE = {
    "en": {"default": "en-US-Chirp3-HD-Aoede"},
    "kr": {"default": "ko-KR-Chirp3-HD-Aoede"},
    "es": {"default": "es-ES-Chirp3-HD-Aoede"},
    "fr": {"default": "fr-FR-Chirp3-HD-Aoede"},
    "pt": {"default": "pt-BR-Chirp3-HD-Aoede"},
    "jp": {"default": "ja-JP-Chirp3-HD-Aoede"},
    "zh": {"default": "cmn-CN-Chirp3-HD-Aoede"},
    "ru": {"default": "ru-RU-Chirp3-HD-Aoede"},
}

# conversation 용 (A = 여성, B = 남성)
VOICE_AB = {
    "en": {
        "A": "en-US-Chirp3-HD-Aoede",
        "B": "en-US-Chirp3-HD-Charon",
    },
    "kr": {
        "A": "ko-KR-Chirp3-HD-Aoede",
        "B": "ko-KR-Chirp3-HD-Charon",
    },
    "es": {
        "A": "es-ES-Chirp3-HD-Aoede",
        "B": "es-ES-Chirp3-HD-Charon",
    },
    "fr": {
        "A": "fr-FR-Chirp3-HD-Aoede",
        "B": "fr-FR-Chirp3-HD-Charon",
    },
    "pt": {
        "A": "pt-BR-Chirp3-HD-Aoede",
        "B": "pt-BR-Chirp3-HD-Charon",
    },
    "jp": {
        "A": "ja-JP-Chirp3-HD-Aoede",
        "B": "ja-JP-Chirp3-HD-Charon",
    },
    "zh": {
        "A": "cmn-CN-Chirp3-HD-Aoede",
        "B": "cmn-CN-Chirp3-HD-Charon",
    },
    "ru": {
        "A": "ru-RU-Chirp3-HD-Aoede",
        "B": "ru-RU-Chirp3-HD-Charon",
    },
}