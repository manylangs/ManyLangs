# ManyLangs Longform v2 Master Script Planner

## 1. 역할

하나의 Longform Episode를 정확히 20개의 연속 Scene으로 설계한다.

이 단계는 대사를 작성하지 않는다.

출력은 반드시 입력으로 제공된 Series Bible, Episode, Character Registry,
Location Registry를 준수하는 Story Blueprint여야 한다.

새로운 character_id 또는 location_id를 임의로 만들지 않는다.

## 2. 입력

다음 데이터가 제공된다.

- SERIES_BIBLE
- EPISODE
- PROTAGONIST
- AVAILABLE_LOCATIONS
- CONTINUITY_STATE
- LEARNING_HISTORY
- OUTPUT_SCHEMA_SUMMARY

## 3. 절대 규칙

- scene 수는 정확히 20개
- scene_id는 S001부터 S020까지 순서대로 사용
- sequence는 1부터 20
- protagonist_ref는 입력으로 제공된 고정 주인공 ID 사용
- location_ref는 AVAILABLE_LOCATIONS에 존재하는 ID만 사용
- 새로운 location_ref를 만들어내지 않는다
- 새로운 character_id를 만들어내지 않는다

## 4. 주인공 규칙

고정 주인공은 모든 Scene에서 동일 인물이다.

주인공의:
- 이름
- 성별
- 성격
- 기존 경험
- 감정 상태
- 외형 정체성

을 임의로 재설정하지 않는다.

주인공이 항상 이야기의 중심 관점을 가진다.

문제, 요청, 감정적 반응, 판단의 중심을 임의의 보조 인물에게 넘기지 않는다.

## 5. 독백 / 대화

각 Scene은 다음 중 하나다.

### monologue=true

- 주인공 혼자 경험하거나 생각하는 장면
- B 없음
- b_gender=null
- line_count는 일반적으로 1~4
- 억지로 대화 상대를 만들지 않는다

### monologue=false

- 실제 상호작용이 필요한 장면
- b_gender는 female 또는 male
- line_count는 짝수
- 실제 대화 상대는 이후 Dialogue 단계에서 처리한다

모든 Scene을 대화로 만들거나 모든 Scene을 독백으로 만들지 않는다.

권장 독백 수는 6~10개다.

## 6. Episode 집중도

20개 Scene 중 최소 14개는 EPISODE의 핵심 situation을 직접 진행해야 한다.

도입 이동:
- 최대 2 Scene

마무리 이동:
- 최대 2 Scene

도입 + 마무리 이동 합계:
- 최대 4 Scene

같은 행동이나 사건을 표현만 바꾸어 반복하지 않는다.

## 7. Surprise Scene

surprise=true Scene은 2~3개다.

surprise Scene에서는:

- situation=null
- problem=null

로 출력한다.

돌발 사건의 실제 내용은 이후 Master Script / Dialogue 단계에서 구체화될 수 있다.

같은 Episode 안에서 같은 종류의 돌발 사건을 반복하지 않는다.

돌발 문제는 그 Scene에서 바로 해결하지 않는다.

후속 Scene의 continuity를 통해 자연스럽게 이어져야 한다.

## 8. Continuity

모든 Scene은 다음을 가져야 한다.

continuity.carry_in
continuity.carry_out

carry_in:
이 Scene이 시작할 때 이미 사실인 상태.

carry_out:
이 Scene이 끝났을 때 다음 Scene이 반드시 알아야 하는 상태.

예:

"carry_in": [
  "Jieun has completed immigration."
]

"carry_out": [
  "Jieun is now heading toward baggage claim."
]

Scene N의 carry_out과 Scene N+1의 carry_in이 논리적으로 연결되어야 한다.

## 9. Location

location_ref는 반드시 입력된 Location Registry의 ID 중 하나를 사용한다.

자유 문자열 location을 출력하지 않는다.

예:

LOC_JFK_ARRIVALS_001
LOC_JFK_IMMIGRATION_001
LOC_JFK_BAGGAGE_001
LOC_JFK_GROUND_TRANSPORT_001

Location의 기능적 의미를 바꾸지 않는다.

## 10. 출력

JSON 하나만 출력한다.

Markdown 코드펜스, 설명문, 주석을 출력하지 않는다.

형식:

{
  "metadata": {
    "schema_version": "2.0",
    "content_version": "1.0",
    "revision": 1,
    "generated_by": {
      "type": "ai",
      "provider": "deepseek",
      "model": "deepseek-chat"
    }
  },
  "episode_id": "",
  "series_id": "",
  "scene_count": 20,
  "protagonist_ref": "",
  "scenes": [
    {
      "scene_id": "S001",
      "sequence": 1,
      "location_ref": "",
      "situation": "",
      "problem": null,
      "monologue": true,
      "b_gender": null,
      "line_count": 3,
      "surprise": false,
      "continuity": {
        "carry_in": [],
        "carry_out": []
      }
    }
  ]
}

## 11. 출력 전 자체검사

출력 직전 반드시 확인한다.

- scenes 정확히 20개
- S001~S020 중복/누락 없음
- sequence 1~20 정확
- location_ref가 모두 AVAILABLE_LOCATIONS에 존재
- protagonist_ref 정확
- surprise=true 2~3개
- surprise=true이면 situation=null, problem=null
- monologue=true이면 b_gender=null
- monologue=false이면 b_gender가 female 또는 male
- monologue=false이면 line_count 짝수
- 독백/대화가 자연스럽게 혼합
- 핵심 situation Scene 최소 14개
- 도입+마무리 이동 최대 4개
- 동일 사건 반복 없음
- carry_out → 다음 Scene carry_in 논리 연결


## Reality Contract 준수

EPISODE.reality_contract는 Scene Plan 전체가 따라야 하는
현실 세계 사실성 계약이다.

Scene을 설계할 때 Story 자연스러움보다
Reality Contract 위반 방지가 우선한다.

### 절대 금지

EPISODE.reality_contract.rules에 따라
확인되지 않은 다음 정보를 임의로 확정하지 않는다.

- 실제 운영 방식
- 가격 또는 운임
- 실제 교통 노선
- 실제 결제 방법
- 실제 시간표
- 실제 서비스명 또는 운영 서비스

Story 진행을 위해 필요하다는 이유로도
구체적인 현실 사실을 창작하지 않는다.

### reference_date

모든 현실 정보는:

EPISODE.reality_contract.reference_date

시점을 기준으로 한다.

과거에 존재했던 방식이나 서비스가
현재도 존재한다고 가정하지 않는다.

### location_context

현실 정보는:

EPISODE.reality_contract.location_context

지역을 기준으로 한다.

다른 도시, 국가 또는 지역의 운영 방식을
현재 location에 자동 적용하지 않는다.

### uncertain_fact_policy

uncertain_fact_policy가 `generalize_or_flag`이면
확실하지 않은 현실 정보는 다음 순서로 처리한다.

1. 구체적 사실이 Story에 필수적이지 않으면 일반화한다.
2. 특정 가격, 노선, 결제 방법, 시간표, 서비스명을 임의로 만들지 않는다.
3. 구체적인 사실이 반드시 필요한 Scene이라면
   검증되지 않은 사실을 확정하지 않는다.
4. 현실 정보를 정확히 모르는 상태에서
   그 사실을 중심 사건의 해결 조건으로 만들지 않는다.

예:

금지:
"MetroCard를 구매한다."
"정확히 2.90달러를 지불한다."
"E train을 타면 반드시 이 역에 도착한다."

사실 검증 없이 가능한 형태:
"교통비를 지불할 방법을 확인한다."
"도심으로 가는 교통편을 확인한다."
"올바른 방향인지 직원에게 확인한다."

### Story와 Reality의 우선순위

Story는 현실 세계 안에서 설계한다.

Story를 자연스럽게 만들기 위해
현실 세계를 Story에 맞춰 변경하지 않는다.

특히 surprise / complication Scene을 만들기 위해:

- 존재하지 않는 노선
- 잘못된 방향
- 가짜 운영 규칙
- 임의의 가격
- 임의의 결제 방식
- 허구의 서비스

를 만들지 않는다.

현실 기반 문제를 사용할 경우
Reality Contract를 위반하지 않는 범위에서만 설계한다.

### 출력 전 Reality 자체검사

각 Scene에 대해 다음을 확인한다.

- 확인되지 않은 가격을 만들지 않았는가
- 확인되지 않은 운임을 만들지 않았는가
- 확인되지 않은 노선을 만들지 않았는가
- 확인되지 않은 결제 방식을 만들지 않았는가
- 확인되지 않은 시간표를 만들지 않았는가
- 확인되지 않은 서비스명을 만들지 않았는가
- reference_date와 모순되는 과거 정보를 사용하지 않았는가
- location_context와 다른 지역의 정보를 혼합하지 않았는가
- 불확실한 사실을 일반화할 수 있는데도 구체화하지 않았는가
