"""
pipeline_semantic_axis_gate.py (v1.1 — dead code removed, stub clarified)

ManyLangs voca 파이프라인의 validate_and_gate()에 통합할
의미 축(semantic axis) 하드 게이트 모듈.

v1.1 변경점:
  - validate_and_gate_v2()를 삭제했다. deepseek_eval_pipeline.py는 이 모듈에서
    check_meaning_zone_semantic_axis()만 import해서 자체 validate_and_gate()에
    직접 통합하고 있었고, 이 파일의 validate_and_gate_v2()는 어디서도 호출되지
    않는 미사용 중복 구현이었다.
  - check_substitution_test()가 실제로는 항상 빈 리스트만 반환하는 미구현
    placeholder라는 점을 문서화했다. ②-3(문장 교체 테스트)은 현재 채점
    프롬프트(voca_en/kr_평가프롬프트_v2.md)의 LLM 판단에 전적으로 의존하며,
    이 코드가 별도 하드게이트로 뒷받침하지 않는다.

용법:
    from pipeline_semantic_axis_gate import check_meaning_zone_semantic_axis

    for block in data["blocks"]:
        lang = "kr"  # 또는 "en"
        core = block["word"][lang]["core"]
        mz = block["word"][lang]["meaning_zone"]
        issues = check_meaning_zone_semantic_axis(core, mz, lang)
        if issues:
            blocking_issues.extend(issues)
"""

from typing import List

# ---------------------------------------------------------------------------
# 의미 축 충돌 사전 (확장 가능)
# key: core 단어, value: meaning_zone에 들어가면 안 되는 단어(어근/패턴) 목록
# 지금은 과거 QA에서 실제로 문제가 됐던 소수 단어만 등록되어 있다. 새로운
# 문제 사례가 나올 때마다 이 사전에 추가하는 식으로 커버리지를 넓혀간다.
# ---------------------------------------------------------------------------
SEMANTIC_AXIS_CLASH = {
    "kr": {
        # 난해함(중~부정) ↔ 깊이/가치(긍정)
        "난해한": ["심오한", "깊은", "고상한"],
        "recondite": ["심오한", "깊은"],
        # 건성(부정) ↔ 절차(중성)
        "건성의": ["형식적인", "공식적인", "절차적인"],
        "perfunctory": ["형식적인", "공식적인", "절차적인"],
        # 지칠 줄 모르는(긍정) ↔ 반의어
        "지칠 줄 모르는": ["게으른", "나태한", "무기력한"],
        "indefatigable": ["게으른", "나태한", "무기력한"],
        # 거스를 수 없는(중~부정) ↔ 피할 수 없는(중성, 의미 축은 비슷하나 뉘앙스 다름 - 주의)
        # 표면상의(중성) ↔ 겉으로 드러난(중성, OK)
        # 난해한 ↔ 어려운(OK, 같은 축)
    },
    "en": {
        # recondite: difficulty of access/understanding (neutral~negative)
        "recondite": ["profound", "deep", "sublime", "elevated"],
        # perfunctory: lack of care/interest (negative)
        "perfunctory": ["formal", "official", "procedural", "ceremonial"],
        # indefatigable: positive energy
        "indefatigable": ["lazy", "listless", "weary", "lethargic"],
        # inexorable: unstoppable (neutral~negative)
        "inexorable": ["inevitable"],  # inevitable은 중성이나 뉘앙스가 다름 - 경고 수준
        # ostensible: apparent but not real (neutral~negative)
        "ostensible": ["obvious", "clear", "evident"],  # ostensible은 "겉으로 그럴듯"이지 "분명한" 게 아님
    }
}

# 감정 색채 불일치 감지용 휴리스틱 (한국어)
# core의 감정 색채와 meaning_zone 항목의 감정 색채가 반대면 위반
AFFECTIVE_VALENCE_MAP = {
    "kr": {
        # 긍정적 meaning_zone이 core가 중~부정일 때 위반
        "positive_mz_for_negative_core": [
            ("난해한", "심오한"),
            ("recondite", "심오한"),
            ("건성의", "성실한"),
            ("perfunctory", "성실한"),
        ],
        # 부정적 meaning_zone이 core가 긍정일 때 위반
        "negative_mz_for_positive_core": [
            ("지칠 줄 모르는", "게으른"),
            ("indefatigable", "게으른"),
        ]
    },
    "en": {
        "positive_mz_for_negative_core": [
            ("recondite", "profound"),
            ("perfunctory", "diligent"),
            ("perfunctory", "conscientious"),
        ],
        "negative_mz_for_positive_core": [
            ("indefatigable", "lazy"),
            ("indefatigable", "listless"),
        ]
    }
}


def check_meaning_zone_semantic_axis(core: str, meaning_zone: List[str], lang: str) -> List[str]:
    """
    core와 meaning_zone 항목들이 같은 의미 축과 감정 색채를 공유하는지 검사.
    위반 항목이 있으면 사람이 읽을 수 있는 issue 문자열 목록을 반환.
    """
    issues = []
    lang = lang.lower()

    # 1. 의미 축 충돌 검사 (SEMANTIC_AXIS_CLASH)
    clash_dict = SEMANTIC_AXIS_CLASH.get(lang, {})
    banned_for_core = clash_dict.get(core, [])

    for mz_item in meaning_zone:
        # 정확 매칭 + 포함 매칭 (예: "형식적인"이 "형식"으로도 잡히게)
        for banned in banned_for_core:
            if banned in mz_item or mz_item in banned:
                issues.append(
                    f"의미 축 불일치: core=\"{core}\" vs meaning_zone=\"{mz_item}\" "
                    f"(\"{banned}\"은(는) core와 다른 의미 축)"
                )
                break

    # 2. 감정 색채 불일치 검사 (AFFECTIVE_VALENCE_MAP)
    valence_map = AFFECTIVE_VALENCE_MAP.get(lang, {})
    for category, pairs in valence_map.items():
        for core_pattern, mz_pattern in pairs:
            if core == core_pattern:
                for mz_item in meaning_zone:
                    if mz_pattern in mz_item or mz_item in mz_pattern:
                        issues.append(
                            f"감정 색채 불일치({category}): core=\"{core}\"(긍/부정 뉘앙스 불일치) "
                            f"vs meaning_zone=\"{mz_item}\""
                        )
                        break

    return issues


def check_substitution_test(core: str, meaning_zone: List[str], examples: List[str], lang: str) -> List[str]:
    """
    문장 교체 가능성 테스트 (미구현 placeholder).

    항상 빈 리스트를 반환한다 -- 실제 ②-3 판정은 채점 프롬프트(voca_en/kr_
    평가프롬프트_v2.md)에서 LLM이 전담하며, deepseek_eval_pipeline.py도 이
    함수를 import하지 않는다. 코드 레벨 하드게이트를 원한다면 여기를 실제로
    구현해야 한다 (예: 예문 문자열에서 core 위치를 찾아 meaning_zone 항목으로
    치환한 뒤 규칙 기반 어색함 탐지, 또는 별도 LLM 호출).
    """
    return []