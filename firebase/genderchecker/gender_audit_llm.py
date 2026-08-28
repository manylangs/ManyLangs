#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gender_audit_llm.py — DeepSeek API를 이용한 성별 판단 레이어

gender_audit.py의 discover/parse로 만든 Segment들을 배치로 묶어
DeepSeek chat completions API에 보내고, 판정 결과를 파싱해서 돌려준다.

사용법:
    export DEEPSEEK_API_KEY="sk-..."
    python3 gender_audit.py --path <경로> --use-llm

환경 요구사항:
    pip install requests --break-system-packages   (표준 requests만 사용, 의존성 최소화)

주의:
- 이 모듈은 로컬(사용자 PC)에서 실제 DeepSeek API 키로 실행하는 것을 전제로 만들어졌다.
- 배치 크기(BATCH_SIZE)는 토큰 한도와 비용을 감안해 조절 가능하게 뒀다.
- 응답이 JSON 파싱에 실패하면 해당 배치를 건너뛰고 경고만 남긴다 (전체 실행 중단 방지).
"""

import json
import os
import time
from typing import Optional

try:
    import requests
except ImportError:
    requests = None

DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"
DEEPSEEK_MODEL = "deepseek-chat"
BATCH_SIZE = 25          # 한 번의 API 호출에 묶어 보낼 세그먼트 수
MAX_RETRIES = 3
RETRY_BACKOFF_SEC = 5

SYSTEM_PROMPT = """당신은 ManyLangs 언어학습 콘텐츠의 "성별(문법적 성) 검수관"입니다.
아래 방법론을 엄격히 따라 판정합니다.

[대상 언어] es, fr, pt, it, ru — 형용사·과거분사·직업명·대명사 등이 성별에 따라
어미가 바뀌는 언어. de는 부분 해당(직업명/대명사/소유격/한정적 형용사만 성별 드러남).

[콘텐츠 타입별 판정 기준]

1) role="conversation_line" (conversation, conversation_shorts):
   화자 A=여성, B=남성으로 고정되어 있고, own_gender/interlocutor_gender 필드로
   현재 줄 화자 자신의 성별과 대화 상대의 성별이 주어집니다.
   성별이 드러나는 표현마다 그것이 실제로 누구를 지칭하는지 먼저 판단하세요:
   - 본인 지칭 (화자 자신을 묘사) → own_gender와 일치해야 함
   - 상대방 지칭 (대화 상대를 묘사) → interlocutor_gender와 일치해야 함
   - 제3자 지칭 (대화에 등장하는 A/B 외 인물) → 문맥상 확정 가능하면 그 인물의
     실제 성별과 일치해야 함. 확정 불가능하면 판정하지 말고 넘어가세요.
   과거분사·형용사·직업명·대명사·호칭 모두 동일 기준 적용.

   가족관계 호칭은 특히 주의해서 판단하세요:
   - 화자가 "내 형/누나/오빠/언니/동생" 등 본인의 가족을 지칭 → 그 가족 구성원의
     실제 성별(오빠/형=남성, 누나/언니=여성, 동생은 문맥으로 확정)에 맞는 번역인지 확인
   - 화자가 "네(상대방)의 형/누나/오빠/언니/동생"처럼 대화 상대방의 가족을 지칭 →
     역시 그 가족 구성원의 실제 성별에 맞아야 함 (상대방 본인의 성별과는 무관 —
     예: B(남성)에게 "너희 언니는 잘 지내?"라고 물으면 "언니"는 여성이므로 여성형)
   - 단순 "brother"/"sister"를 기계적으로 남/여로만 번역하지 말고, 실제로 그
     가족 구성원이 화자 기준 손위/손아래인지, 남성/여성인지까지 문맥으로 확정해서 판단

   룸메이트/동거인처럼 원문에 성별이 명시되지 않은 제3자 관계는 기본적으로
   화자와 같은 성별로 간주하세요 (예: 화자가 여성이면 "roommate"는 여성으로
   간주). 이 경우 여러 언어에서 서로 다른 성별로 번역되어 있으면(예: es는
   여성형, pt/ru는 남성형) 언어 간 불일치 오류로 판정하고, 정답은 화자와
   같은 성별 쪽입니다.

   존댓말/반말 및 격식(tu/vous, ты/Вы, usted 등)이 세트 안에서 섞이는지도 확인.
   특히 격식 있는 상황(면접, 업무, 초면)에서 특정 언어만 반말을 쓰는 경우도
   지적하세요 (예: es/fr는 격식체인데 pt만 반말인 경우).

2) role="narrator" (grammar, idiom, voca, real):
   고정된 캐릭터 정체성이 없습니다. 아래로 분기해서 판정하세요:
   - target(원문)에 성별이 이미 명시된 경우 (예: "she", "his mother", 성별이
     명백한 이름) → 번역이 그 성별과 일치하는지 확인. 불일치 = 오류.
   - target이 성별 중립인 경우 → 성별을 강제하지 않되, 같은 문장/문단 안에서
     성별 표지가 도중에 바뀌지 않는지(내적 일관성)만 확인.

[절대 원칙]
- 성별이 드러나지 않음 = 허용 (모든 문장에 성별 표지를 강제할 필요 없음)
- 성별이 드러났는데 위 기준과 불일치 = 필수 수정 대상
- 언어 간 상호 일치: 같은 세그먼트 안에서 es/fr/pt/it/ru 중 실제 존재하는
  컬럼끼리 서로 다른 성별을 나타내면 반드시 불일치로 표시 (구조적 비교이므로
  가장 확실한 신호입니다)
- 확신이 없으면 억지로 오류를 만들지 말고 건너뛰세요 (과잉 검출 금지)

[입력 형식]
segments라는 JSON 배열이 주어집니다. 각 항목:
{
  "id": "고유 식별자",
  "content_type": "conversation | conversation_shorts | grammar | idiom | voca | real",
  "role": "conversation_line | narrator",
  "speaker": "A|B|null",
  "own_gender": "F|M|null",
  "interlocutor_gender": "F|M|null",
  "texts": {"target":..., "en":..., "es":..., "fr":..., "pt":..., "ru":..., ...}
}

[출력 형식]
반드시 아래 JSON 형식으로만 응답하세요. 다른 설명 텍스트는 절대 포함하지 마세요.
{
  "results": [
    {
      "id": "세그먼트 id (입력과 동일)",
      "issues": [
        {
          "lang": "es|fr|pt|it|ru|de",
          "check_type": "본인지칭 | 상대방지칭 | 제3자지칭 | 언어간불일치 | 원문성별대조 | 내적일관성",
          "current_text_snippet": "문제가 되는 부분 원문 그대로 짧게",
          "issue_description": "무엇이 왜 틀렸는지 한국어로 간단히",
          "suggested_fix": "수정된 전체 문장 또는 해당 부분",
          "confidence": "high | medium | low"
        }
      ]
    }
  ]
}
issues가 없는 세그먼트는 "issues": [] 로 표시하되, results 배열에는 반드시 포함하세요
(id 개수가 입력과 정확히 일치해야 합니다).

절대 금지: 문제가 없다는 것을 알리기 위한 목적으로 "문제 없음", "일치함", "정상",
"올바름", "맞습니다", "허용될 수 있음", "오류 없음" 같은 문구가 issue_description에
들어가는 항목을 만들지 마세요. issues 배열에 들어가는 모든 항목은 예외 없이
반드시 "실제로 고쳐야 하는 오류"여야 합니다.

각 이슈를 출력하기 직전에 스스로 검증하세요: "이 issue_description이 결국
문제없다는 뜻으로 끝나는가?" 만약 그렇다면 그 항목 자체를 통째로 삭제하고
issues 배열에 넣지 마세요. 애매하거나 확신이 안 서는 경우도 억지로 issue로
만들지 말고 그냥 건너뛰세요 (과잉 검출보다 누락이 낫습니다).
"""


def build_user_prompt(segments_payload: list[dict]) -> str:
    return "segments = " + json.dumps(segments_payload, ensure_ascii=False)


# ─────────────────────────────────────────────────────────
# 전체판정 모드 (--full-report)
# 이슈만 골라 보고하는 대신, 성별표시 언어가 있는 모든 항목에 대해
# PASS/FIX 판정과 이유를 무조건 출력하게 한다. 사람이 대화로 전체를
# 검토하고 반영 여부를 직접 정할 수 있도록 하기 위함 — 실행마다
# 판정이 흔들리는 문제에 대응하는 감사(audit trail) 목적.
# ─────────────────────────────────────────────────────────

SYSTEM_PROMPT_FULL = SYSTEM_PROMPT.replace(
    '''[출력 형식]
반드시 아래 JSON 형식으로만 응답하세요. 다른 설명 텍스트는 절대 포함하지 마세요.
{
  "results": [
    {
      "id": "세그먼트 id (입력과 동일)",
      "issues": [
        {
          "lang": "es|fr|pt|it|ru|de",
          "check_type": "본인지칭 | 상대방지칭 | 제3자지칭 | 언어간불일치 | 원문성별대조 | 내적일관성",
          "current_text_snippet": "문제가 되는 부분 원문 그대로 짧게",
          "issue_description": "무엇이 왜 틀렸는지 한국어로 간단히",
          "suggested_fix": "수정된 전체 문장 또는 해당 부분",
          "confidence": "high | medium | low"
        }
      ]
    }
  ]
}
issues가 없는 세그먼트는 "issues": [] 로 표시하되, results 배열에는 반드시 포함하세요
(id 개수가 입력과 정확히 일치해야 합니다).

절대 금지: 문제가 없다는 것을 알리기 위한 목적으로 "문제 없음", "일치함", "정상",
"올바름", "맞습니다", "허용될 수 있음", "오류 없음" 같은 문구가 issue_description에
들어가는 항목을 만들지 마세요. issues 배열에 들어가는 모든 항목은 예외 없이
반드시 "실제로 고쳐야 하는 오류"여야 합니다.

각 이슈를 출력하기 직전에 스스로 검증하세요: "이 issue_description이 결국
문제없다는 뜻으로 끝나는가?" 만약 그렇다면 그 항목 자체를 통째로 삭제하고
issues 배열에 넣지 마세요. 애매하거나 확신이 안 서는 경우도 억지로 issue로
만들지 말고 그냥 건너뛰세요 (과잉 검출보다 누락이 낫습니다).''',
    '''[출력 형식 — 전체판정 모드]
이번엔 "문제 있는 것만" 골라내지 말고, 입력으로 받은 segments 각각에 대해
그 세그먼트에 존재하는 성별표시 언어(es/fr/pt/it/ru/de 중 texts에 실제로
있는 것) 전부에 대해 반드시 판정 하나씩을 출력하세요. 통과(PASS)든
수정필요(FIX)든 이유를 반드시 설명하세요.

반드시 아래 JSON 형식으로만 응답하세요. 다른 설명 텍스트는 절대 포함하지 마세요.
{
  "results": [
    {
      "id": "세그먼트 id (입력과 동일)",
      "verdicts": [
        {
          "lang": "es|fr|pt|it|ru|de",
          "status": "PASS 또는 FIX",
          "current_text_snippet": "판정 대상이 된 부분 원문 그대로 짧게 (성별 표지가 아예 없으면 빈 문자열)",
          "reason": "PASS면 왜 문제없는지(성별표지 없음/올바른 지칭 대상과 일치 등),
                     FIX면 무엇이 왜 틀렸는지, 한국어로 간단히",
          "suggested_fix": "FIX일 때만: 수정된 전체 문장 또는 해당 부분. PASS면 빈 문자열."
        }
      ]
    }
  ]
}
- verdicts 배열은 그 세그먼트에 존재하는 성별표시 언어 개수와 정확히 일치해야 합니다
  (예: es/fr/pt 3개 언어가 있으면 verdicts도 3개).
- id 개수는 입력 segments 개수와 정확히 일치해야 합니다.
- FIX인데 suggested_fix가 비어있거나 OLD와 동일하면 안 됩니다.
- suggested_fix에는 반드시 그 언어(lang 필드) 하나의 텍스트만 넣으세요.
  다른 언어 라벨이나 다른 언어 제안을 섞어 넣지 마세요.'''
)


def build_full_report_prompt(segments_payload: list[dict]) -> str:
    return "segments = " + json.dumps(segments_payload, ensure_ascii=False)


def call_deepseek_full(api_key: str, segments_payload: list[dict]) -> Optional[dict]:
    if requests is None:
        raise RuntimeError("requests 패키지가 필요합니다: pip install requests --break-system-packages")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT_FULL},
            {"role": "user", "content": build_full_report_prompt(segments_payload)},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0,
    }

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.post(DEEPSEEK_API_URL, headers=headers, json=body, timeout=180)
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            return json.loads(content)
        except Exception as e:
            print(f"  [warn] DeepSeek 호출 실패 (시도 {attempt}/{MAX_RETRIES}): {e}")
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_BACKOFF_SEC)
    return None


def audit_segments_full_report(segments: list, gender_lang_universe: set,
                                api_key: Optional[str] = None,
                                batch_size: int = 15) -> list[dict]:
    """모든 세그먼트에 대해 PASS/FIX 판정+이유를 전부 수집.
    이슈 여부와 무관하게 전체 레코드를 반환 (사람이 대화로 검토하기 위함)."""
    api_key = api_key or os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        raise RuntimeError(
            "DEEPSEEK_API_KEY가 설정되어 있지 않습니다. "
            "export DEEPSEEK_API_KEY='sk-...' 로 설정 후 다시 실행하세요."
        )

    targets = []
    for seg in segments:
        present = set(seg.texts.keys()) & gender_lang_universe
        if present:
            targets.append((seg, present))

    print(f"[llm-full] 판정 대상 세그먼트 {len(targets)}개 / 배치 크기 {batch_size} "
          f"/ 예상 API 호출 {(len(targets) + batch_size - 1) // batch_size}회")

    all_records = []
    for i in range(0, len(targets), batch_size):
        batch = targets[i:i + batch_size]
        payload = [segment_to_payload(seg, present) for seg, present in batch]
        by_id = {p["id"]: seg for p, (seg, _) in zip(payload, batch)}

        print(f"  [batch {i // batch_size + 1}] {len(batch)}개 세그먼트 전체판정 요청 중...")
        result = call_deepseek_full(api_key, payload)
        if result is None:
            print(f"  [skip] 이 배치는 실패로 건너뜁니다 (수동 재확인 필요)")
            continue

        for r in result.get("results", []):
            seg_id = r.get("id")
            seg = by_id.get(seg_id)
            for v in r.get("verdicts", []):
                record = {
                    "group_key": seg.group_key if seg else None,
                    "content_type": seg.content_type if seg else None,
                    "unit_id": seg.unit_id if seg else None,
                    "sub_id": seg.sub_id if seg else None,
                    "speaker": seg.speaker if seg else None,
                    **v,
                }
                all_records.append(record)

    return all_records


def call_deepseek(api_key: str, segments_payload: list[dict]) -> Optional[dict]:
    """DeepSeek chat completions 호출. 실패 시 None 반환 (재시도는 호출부에서)."""
    if requests is None:
        raise RuntimeError("requests 패키지가 필요합니다: pip install requests --break-system-packages")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_prompt(segments_payload)},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0,
    }

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.post(DEEPSEEK_API_URL, headers=headers, json=body, timeout=120)
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            return json.loads(content)
        except Exception as e:
            print(f"  [warn] DeepSeek 호출 실패 (시도 {attempt}/{MAX_RETRIES}): {e}")
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_BACKOFF_SEC)
    return None


def segment_to_payload(seg, present_gender_langs: set[str]) -> dict:
    keep_langs = present_gender_langs | {"target", "en"}
    return {
        "id": f"{seg.group_key}::{seg.unit_id}::{seg.sub_id}",
        "content_type": seg.content_type,
        "role": seg.role,
        "speaker": seg.speaker,
        "own_gender": seg.own_gender,
        "interlocutor_gender": seg.interlocutor_gender,
        "texts": {k: v for k, v in seg.texts.items() if k in keep_langs},
    }


def audit_segments_via_llm(segments: list, gender_lang_universe: set[str],
                            api_key: Optional[str] = None,
                            batch_size: int = BATCH_SIZE) -> list[dict]:
    """세그먼트 리스트를 배치로 나눠 DeepSeek에 판정 요청. review 항목 리스트 반환."""
    api_key = api_key or os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        raise RuntimeError(
            "DEEPSEEK_API_KEY가 설정되어 있지 않습니다. "
            "export DEEPSEEK_API_KEY='sk-...' 로 설정 후 다시 실행하세요."
        )

    # 성별표시 언어 컬럼이 하나라도 있는 세그먼트만 대상
    targets = []
    for seg in segments:
        present = set(seg.texts.keys()) & gender_lang_universe
        if present:
            targets.append((seg, present))

    print(f"[llm] 판정 대상 세그먼트 {len(targets)}개 / 배치 크기 {batch_size} "
          f"/ 예상 API 호출 {(len(targets) + batch_size - 1) // batch_size}회")

    review_items = []
    for i in range(0, len(targets), batch_size):
        batch = targets[i:i + batch_size]
        payload = [segment_to_payload(seg, present) for seg, present in batch]
        by_id = {p["id"]: seg for p, (seg, _) in zip(payload, batch)}

        print(f"  [batch {i // batch_size + 1}] {len(batch)}개 세그먼트 판정 요청 중...")
        result = call_deepseek(api_key, payload)
        if result is None:
            print(f"  [skip] 이 배치는 실패로 건너뜁니다 (수동 재확인 필요)")
            continue

        for r in result.get("results", []):
            seg_id = r.get("id")
            seg = by_id.get(seg_id)
            for issue in r.get("issues", []):
                item = {
                    "group_key": seg.group_key if seg else None,
                    "content_type": seg.content_type if seg else None,
                    "unit_id": seg.unit_id if seg else None,
                    "sub_id": seg.sub_id if seg else None,
                    "speaker": seg.speaker if seg else None,
                    **issue,
                }
                review_items.append(item)
                print(f"    [ISSUE][{issue.get('confidence')}] "
                      f"{item['content_type']} unit={item['unit_id']} sub={item['sub_id']} "
                      f"lang={issue.get('lang')} type={issue.get('check_type')} "
                      f"-> {issue.get('issue_description')}")

    return review_items
