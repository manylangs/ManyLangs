# 21_STORY_PLANNER.md — 20-beat 스토리 기획 매뉴얼 v1.2

## 1. 역할
상황 한 줄(예: "영화관 가기")을 20개의 세부 비트(beat)로 분해한다.
target_lang과 무관하게 항상 한국어로 출력한다. 같은 기획을 여러 target_lang
버전이 재사용할 수 있어야 하므로, 특정 언어/문화에 종속된 디테일은
넣지 않는다 (문화 현지화는 22_STORY_TARGET.md 단계에서 처리).

## 2. 입력
- SITUATION: 상황 한 줄
- LEVEL: A1~C2
- EPISODE_ID: 폴더명에 쓰일 slug

## 3. 인물 규칙
- 주인공 A: 1인, 고정 인물, 20비트 내내 동일
- 상대 B: 대화 비트에서만 등장, 매번 새로운 인물 (현지인 — 직원, 기사,
  동승객 등). 독백 비트에는 B가 없음.
  - 대화 비트는 성별 필드 반드시 명시 (TTS 보이스 선택에 사용됨)
- A 외 인물 재등장 금지 규칙 없음 (B는 원래 매번 다른 사람이므로 해당 없음)
- A는 항상 그 비트의 주인공 관점 행동을 맡는다. 예를 들어 물건을
  잃어버리고 당황하는 쪽, 무언가를 요청하는 쪽, 감정을 느끼는 쪽은
  언제나 A다. B가 그 역할을 대신 맡고 A가 반대로 말하는 구성은 금지.

## 4. 독백 vs 대화 구분 (핵심 — 반드시 지킬 것)

모든 비트가 대화일 필요는 없다. 실제로 그 상황을 겪을 때, 타인과의
실질적인 상호작용(거래, 요청, 확인)이 필요한 순간과, 혼자 겪는 순간
(이동, 대기, 관람, 감정 반응)은 분명히 다르다. 대화 상대가 굳이 필요
없는 비트에 억지로 인물을 등장시키지 않는다.

각 비트에 "monologue": true 또는 "monologue": false를 지정한다.

- monologue: true — A 혼자 말하거나 속으로 생각하는 형태. B 없음.
  기준: 이동 중, 대기 중, 무언가를 관람/감상 중, 혼자 느끼는 감정,
  방금 겪은 일을 되새기는 순간 등
  - b_gender 필드는 생략하거나 null
  - line_count는 짝수 제약 없음 (1~4줄 정도의 짧은 독백도 가능)
- monologue: false — 기존과 동일한 A-B 대화. 실제로 타인과 말을
  주고받아야 하는 순간(매표, 주문, 길 묻기, 좌석 확인 등)에만 사용
  - b_gender 필수, line_count는 짝수 (A-B로 끝남)

목표 비율: 20비트 중 독백이 대략 6~10개 정도 나오는 게 자연스럽다
(상황에 따라 다를 수 있음 — 강제 개수는 아니지만, 전부 대화이거나
전부 독백인 기획은 잘못된 것으로 간주한다).

## 5. 비트 배분 규칙

20비트 중 최소 14개는 SITUATION 자체의 구체적인 행동/디테일이어야 한다.
이동(버스/지하철/걷기)이나 집에서 출발·귀가하는 비트는 장식일 뿐 본론이
아니다. 아래 배분을 정확히 따른다:

- 도입 이동 비트: 최대 2개 (예: 집에서 나옴, 이동수단 탑승 — 독백으로
  처리 가능)
- SITUATION 본론 비트: 최소 14개 — SITUATION을 실제로 겪을 때
  일어나는 세부 단계를 최대한 잘게 쪼갠다. 대화가 필요한 순간과
  독백이 자연스러운 순간을 섞어서 구성한다.
- 귀가/마무리 이동 비트: 최대 2개 (독백으로 처리 가능)
- 도입+귀가를 합쳐 4개를 넘기지 않는다. 넘으면 잘못된 기획이다.

## 6. 돌발 슬롯 규칙 (핵심 — 반드시 지킬 것)

scene_plan 20개 중 정확히 2개는 반드시 아래 형식을 그대로 따르는
돌발 슬롯이어야 한다. (2개가 기본 목표, 3개까지는 허용, 1개 이하나
4개 이상은 잘못된 출력이다.)

돌발 슬롯은 monologue든 대화든 상관없이 배치 가능하다. 형식 (situation과
problem은 반드시 null, 다른 필드는 정상 채움):

대화형 돌발 슬롯 예시:
{
  "scene_id": "009",
  "location": "매점",
  "situation": null,
  "problem": null,
  "monologue": false,
  "b_gender": "여성",
  "line_count": 6,
  "surprise": true
}

독백형 돌발 슬롯 예시:
{
  "scene_id": "013",
  "location": "상영관 내부",
  "situation": null,
  "problem": null,
  "monologue": true,
  "line_count": 3,
  "surprise": true
}

- 돌발 슬롯은 SITUATION 본론 구간(도입/귀가 제외) 안에서만 배치한다
- 돌발 슬롯이 만든 문제는 이후 비트 중 하나가 자연스럽게 해소해야 함
  (22_STORY_TARGET.md 단계에서 처리 — 여기서는 위치와 monologue
  여부만 지정)
- 출력 직전 반드시 scene_plan을 훑어서 surprise: true 개수를 세어라.
  2개(또는 3개)가 아니면 다시 배치하고 나서 출력하라.

## 7. 출력 스키마
{
  "episode_id": "",
  "level": "",
  "situation": "",
  "characters": {
    "A": {"role": "주인공", "gender": ""}
  },
  "scene_plan": [
    {
      "scene_id": "001",
      "location": "",
      "situation": "",
      "problem": null,
      "monologue": false,
      "b_gender": "",
      "line_count": 6,
      "surprise": false
    }
  ]
}

## 8. 자체 확인 (self-check, 출력 전 반드시 수행)
- scene_plan 길이 정확히 20
- surprise=true 개수를 실제로 세어서 2개 또는 3개인지 확인
- 도입+귀가 이동 비트를 세어서 4개를 넘지 않는지 확인
- monologue=true/false가 섞여 있는지 확인 (전부 한쪽으로 쏠리면 오류)
- surprise=false이고 monologue=false인 비트는 situation과 b_gender 필수,
  line_count는 짝수
- surprise=false이고 monologue=true인 비트는 situation 필수, b_gender 없음
- surprise=true인 비트는 situation과 problem이 정확히 null인지 확인
- 같은 장소/사건이 단순 반복되지 않는지 (다양성 확인)
