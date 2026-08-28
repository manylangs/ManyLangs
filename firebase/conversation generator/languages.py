"""
languages.py — ManyLangs conversation 파이프라인의 언어 목록 단일 소스.

merge.py / review.py / conversation_checker.py / deepseek_generate.py가
전부 이 파일 하나를 import해서 언어 목록을 가져온다.
새 번역 언어를 추가하고 싶으면 TRANSLATE_LANGS에 코드 하나만 추가하면
나머지 스크립트는 전부 자동으로 따라간다 (수정 불필요).

주의: 여기 추가하는 건 "번역 언어"다. "목표(target) 언어"를 새로 추가하는
것과는 다른 작업이며, 목표 언어 추가는 prompts/GENERATOR_{LANG}.md 파일을
새로 작성하는 것만으로 충분하다 (이 파일을 건드릴 필요 없음 — 목표 언어가
무엇이든 번역 언어 목록에서 그 언어 자기 자신만 제외하고 나머지를 모두
번역하면 되므로).
"""

# 8개 번역 언어 (target 자기 자신은 매번 이 목록에서 동적으로 제외됨)
TRANSLATE_LANGS = ["en", "es", "fr", "pt", "kr", "jp", "zh", "ru"]


def translate_langs_for(target_lang: str):
    """이번 배치의 target_lang을 제외한 번역 대상 언어 리스트.
    target_lang이 TRANSLATE_LANGS에 없는 새 언어(예: 'de')여도 그냥
    전체 8개를 그대로 반환한다 — 뺄 것이 없기 때문."""
    return [l for l in TRANSLATE_LANGS if l != target_lang]


def all_langs_for(target_lang: str):
    """merge.py가 쓰는 전체 컬럼 목록: target + 8개 언어."""
    return ["target"] + TRANSLATE_LANGS
