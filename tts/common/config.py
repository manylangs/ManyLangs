#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ManyLangs TTS 공통 설정
=======================

언어를 추가할 때는 이 파일만 수정한다. 빌더의 생성 로직은 절대 수정하지 않는다.

새 언어(예: 독일어 "de") 추가 시 수정할 곳 — 정확히 4곳:

    1. SUPPORTED_LANGS 에 "de" 추가
    2. LANGUAGE_CODE["de"] = "de-DE"
    3. TEXT_FIELD_DEFAULT["de"] = "de"   (그리고 TEXT_FIELD_REAL["de"] = "de")
    4. VOICE_SINGLE["de"] = {"default": ...}
       VOICE_AB["de"] = {"A": <여성>, "B": <남성>}

voice 이름은 반드시 Google Cloud TTS 지원 목록에서 확인 후
첫 챕터 생성 → 청취 검증을 거친다.

★★★ Real 시리즈의 TEXT_FIELD 예외 (중요) ★★★
--------------------------------------------------
Real JSON만 문장 구조가 다르다:

    real:                "texts":     { "kr": ..., "en": ..., "es": ... }
    voca/idiom/conv:     "sentences": { "target": ..., "en": ..., "es": ... }

따라서:
    - voca / idiom / conversation → TEXT_FIELD_DEFAULT (kr → "target")
    - real                        → TEXT_FIELD_REAL    (kr → "kr")

이 차이는 JSON 스키마 세대 차이에서 온 것으로, 콘텐츠를 재생성하지 않는 한 유지한다.
"""

SUPPORTED_LANGS = ["en", "kr", "es", "fr", "pt"]

LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"]

LANGUAGE_CODE = {
    "en": "en-US",
    "kr": "ko-KR",
    "es": "es-ES",
    "fr": "fr-FR",
    "pt": "pt-PT",
}

# voca / idiom / conversation 용 (kr 콘텐츠는 "target" 키에 있음)
TEXT_FIELD_DEFAULT = {
    "en": "en",
    "kr": "target",
    "es": "es",
    "fr": "fr",
    "pt": "pt",
}

# real 전용 (real JSON은 "kr" 키가 직접 존재 — 상단 주석 참조)
TEXT_FIELD_REAL = {
    "en": "en",
    "kr": "kr",
    "es": "es",
    "fr": "fr",
    "pt": "pt",
}

SAMPLE_RATE = 24000

# ── Voice ──────────────────────────────────────────────────────────────
# 현재 최종 음성 정책:
#
# - en-US: Chirp 3 HD
# - ko-KR: Neural2
# - es/fr: Neural2
# - pt-PT: WaveNet
#
# 성별 규칙:
# - 단일 목소리 = 여성
# - conversation A = 여성
# - conversation B = 남성
#
# 한국어 ko-KR 테스트 결과:
# - Chirp3 Aoede / Charon:
#     음색과 발음은 자연스럽지만 단어 경계 및 끊어읽기가 불안정
# - Chirp3 Kore / Orus:
#     쉼표 휴지 및 한국어 운율이 학습용 콘텐츠에 부적합
# - WaveNet A / C:
#     띄어읽기는 정확하지만 Neural2보다 기계음이 강함
# - Neural2 A / C:
#     띄어읽기와 문장 호흡이 정확하고 전체 균형이 가장 좋음
#
# 따라서 한국어 최종 음성은 Neural2를 사용한다.

# voca / idiom / real 등 단일 목소리 시리즈
VOICE_SINGLE = {
    "en": {"default": "en-US-Chirp3-HD-Aoede"},
    "kr": {"default": "ko-KR-Neural2-A"},
    "es": {"default": "es-ES-Neural2-A"},
    "fr": {"default": "fr-FR-Neural2-A"},
    "pt": {"default": "pt-PT-Wavenet-A"},
}

# conversation 용 (A = 여성, B = 남성)
VOICE_AB = {
    "en": {
        "A": "en-US-Chirp3-HD-Aoede",
        "B": "en-US-Chirp3-HD-Charon",
    },
    "kr": {
        "A": "ko-KR-Neural2-A",
        "B": "ko-KR-Neural2-C",
    },
    "es": {
        "A": "es-ES-Neural2-A",
        "B": "es-ES-Neural2-B",
    },
    "fr": {
        "A": "fr-FR-Neural2-A",
        "B": "fr-FR-Neural2-B",
    },
    "pt": {
        "A": "pt-PT-Wavenet-A",
        "B": "pt-PT-Wavenet-B",
    },
}