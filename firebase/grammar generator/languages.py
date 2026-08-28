"""
languages.py — ManyLangs grammar 파이프라인의 언어 목록 단일 소스.

merge.py / deepseek_generate.py / checker.py / review.py가 전부 이 파일
하나를 import해서 언어 목록을 가져온다. 새 번역 언어를 추가하고 싶으면
TRANSLATE_LANGS에 코드 하나만 추가하면 나머지 스크립트는 전부 자동으로
따라간다 (수정 불필요).

주의: 여기 추가하는 건 "번역 언어"다. "목표(target) 언어"를 새로 추가하는
것과는 다른 작업이며, 목표 언어 추가는 prompts/GENERATOR_{LANG}.md 파일을
새로 작성하는 것만으로 충분하다 (이 파일을 건드릴 필요 없음 — 목표 언어가
무엇이든 번역 언어 목록에서 그 언어 자기 자신만 제외하고 나머지를 모두
번역하면 되므로).

grammar 시리즈는 conversation과 달리 러시아어(ru)를 아직 지원하지 않는다
(checker.py의 LANGS 집합과 동일하게 맞춤). ru를 추가하려면 이 리스트에
"ru" 하나만 추가하고 prompts/TRANSLATOR_RU.md를 새로 작성하면 된다.
"""

# 7개 번역 언어 (target 자기 자신은 매번 이 목록에서 동적으로 제외됨)
TRANSLATE_LANGS = ["en", "es", "fr", "pt", "kr", "jp", "zh"]


def translate_langs_for(target_lang: str):
    """이번 배치의 target_lang을 제외한 번역 대상 언어 리스트."""
    return [l for l in TRANSLATE_LANGS if l != target_lang]


def all_langs_for(target_lang: str):
    """merge.py가 쓰는 전체 컬럼 목록: target + 7개 언어."""
    return ["target"] + TRANSLATE_LANGS
