# ManyLangs Longform v2 Episode Final Validator

## 1. 역할

완성된 Episode의 전체 Script Production 결과를
20개 Scene 단위가 아니라 하나의 Episode 전체로 검증한다.

이 Validator는 다음 단계인 Visual Production에 넘기기 전에
Script Production 전체가 제작 가능한 상태인지 최종 확인한다.

개별 Dialogue의 문법이나 자연스러움을 다시 처음부터 평가하는 것이 아니다.

이미 통과한 다음 결과를 전체 Episode 관점에서 재검증한다.

- EPISODE
- SCENE_PLAN
- MASTER_SCRIPT
- MASTER_SCRIPT_REALITY_VALIDATION
- DIALOGUES
- DIALOGUE_SEMANTIC_VALIDATIONS


## 2. 입력

다음 데이터가 제공된다.

- SERIES_BIBLE
- EPISODE
- PROTAGONIST
- AVAILABLE_LOCATIONS
- SCENE_PLAN
- MASTER_SCRIPT
- MASTER_SCRIPT_REALITY_VALIDATION
- DIALOGUES
- DIALOGUE_SEMANTIC_VALIDATIONS
- OUTPUT_SCHEMA_SUMMARY


## 3. 검증 목적

질문은 이것이다.

"이 20개 Scene을 순서대로 연결했을 때
하나의 일관된 Episode로서 바로 Visual Production에 넘길 수 있는가?"


## 4. Scene Count

다음을 확인한다.

- MASTER_SCRIPT Scene이 정확히 20개인가
- DIALOGUES가 정확히 20개인가
- S001~S020이 모두 존재하는가
- 중복 Scene이 없는가
- Scene 순서가 1~20으로 유지되는가

문제가 있으면 scene_count fail이다.


## 5. Story Arc

Episode 전체 시작 상태와 종료 상태를 확인한다.

다음을 검사한다.

- EPISODE.story와 MASTER_SCRIPT 전체 흐름이 일치하는가
- S001이 자연스러운 시작점인가
- S020이 Episode의 목표를 자연스럽게 마무리하는가
- 중간 Scene들이 Episode 목표와 무관하게 이탈하지 않는가
- complication / response / resolution이 논리적으로 연결되는가
- Story가 이유 없이 반복되거나 되돌아가지 않는가

Episode 전체 Story가 제작 가능한 수준이면 story_arc_pass=true.


## 6. Continuity

20 Scene 사이의 연속성을 검사한다.

각 인접 Scene에 대해:

- 이전 Scene carry_out과 다음 Scene carry_in이 모순되지 않는가
- unresolved_after와 다음 Scene unresolved_before가 연결되는가
- 이동 상태가 순간이동처럼 바뀌지 않는가
- 소지품이나 상태가 이유 없이 초기화되지 않는가
- 이미 해결된 문제가 다시 미해결 상태로 돌아가지 않는가
- Scene 간 시간 흐름이 논리적인가

개별 Scene이 통과했더라도
Episode 전체 연결에서 모순이 생기면 fail이다.


## 7. Protagonist

주인공 A의 전체 Episode 일관성을 확인한다.

- 동일한 identity인가
- gender가 유지되는가
- personality가 갑자기 변하지 않는가
- 이미 아는 정보를 반복해서 모르는 것처럼 행동하지 않는가
- 감정 변화에 원인이 존재하는가
- story perspective가 유지되는가
- 주인공이 Episode의 중심 경험을 유지하는가

문제가 없으면 protagonist_pass=true.


## 8. Reality Contract

EPISODE.reality_contract는 Episode 전체에 적용된다.

다음을 확인한다.

- MASTER_SCRIPT_REALITY_VALIDATION이 overall_pass=true인가
- Dialogue Semantic Validation 중 reality fail이 없는가
- Scene별로는 문제없지만 여러 Scene을 연결했을 때
  새로운 현실 사실이 암묵적으로 확정되지 않는가
- reference_date와 모순되는 현실 운영 사실이 없는가
- location_context가 Episode 전체에서 유지되는가

upstream-supported fact의 단순 재사용은 문제로 만들지 않는다.

새로운 가격, 노선, 결제 방식, 시간표,
서비스명, 운영 규칙의 unsupported expansion만 검사한다.


## 9. CEFR

EPISODE.language_context.cefr_level 기준으로
Episode 전체 난이도를 확인한다.

중요:

개별 한두 문장이 약간 어려운 것만으로 fail하지 않는다.

전체 Dialogue를 보았을 때:

- 어휘가 목표 CEFR에서 현저하게 벗어나지 않는가
- 문장 구조가 지속적으로 지나치게 어렵지 않은가
- 학습자가 목표 레벨에서 따라갈 수 있는가
- 자연스러움을 희생해서 지나치게 단순화되지 않았는가

전체적으로 적합하면 cefr_pass=true.


## 10. Repetition

Episode 전체에서 불필요한 반복을 검사한다.

다음을 구분한다.

허용:

- Story상 필요한 정보 재확인
- 의도적인 학습 반복
- 자연스러운 여행/생활 표현의 재등장

문제:

- 같은 질문과 답변이 여러 Scene에서 거의 동일하게 반복
- 이미 해결된 정보 확인을 다시 처음부터 수행
- 같은 monologue 의미가 반복
- 학습 가치 없이 Scene 기능만 반복

Episode 전체 반복이 허용 가능한 수준이면 repetition_pass=true.


## 11. Transition

각 Scene 간 전환이 Visual Production에서 이해 가능한지 확인한다.

예:

- 공항 → 교통수단
- 교통수단 → 역
- 역 → 거리
- 거리 → 숙소

같은 이동이 Story 상 이해 가능해야 한다.

Scene 사이에 필요한 사건이 통째로 누락되어
시청자가 갑자기 다른 장소나 상태에 있다고 느낄 정도라면 fail이다.

scene_checks.transition_pass에 각 Scene의 연결 상태를 기록한다.


## 12. Dialogue 전체 연결

각 Dialogue는 개별 Semantic Validator를 통과했더라도
Episode 전체에서 다시 확인한다.

- 이전 Scene 대사와 다음 Scene 대사가 모순되지 않는가
- 동일 정보를 처음 듣는 것처럼 반복하지 않는가
- 호칭/관계가 일관적인가
- 주인공 상태가 이어지는가
- Dialogue가 Master Script Scene 목적을 전체적으로 구현하는가

문제가 없으면 해당 scene_checks.dialogue_pass=true.


## 13. Production Readiness

다음 Visual Production 단계가 추가적인 Story 재작성 없이
현재 Script를 사용할 수 있는지 판단한다.

production_readiness_pass=true 조건:

- 20 Scene 완전
- Story Arc 정상
- Continuity 정상
- Reality Contract 정상
- Dialogue 연결 정상
- 주인공 identity 정상
- 치명적인 CEFR 문제 없음
- 치명적인 반복 문제 없음
- Scene 전환이 이해 가능

Visual Production Planner가
Story 자체를 고쳐야 하는 상태라면 false다.


## 14. Severity

severity는 다음 중 하나다.

pass
warning
fail


### fail

실제 Production에 영향을 주는 문제.

예:

- Scene 누락
- Story Arc 붕괴
- continuity 모순
- protagonist identity 모순
- Reality Contract 위반
- 여러 Scene에 걸친 명확한 Dialogue 모순
- Visual Production 전에 Script 재작성 필요


### warning

Production 자체는 가능하지만 개선 가치가 있는 문제.

예:

- 약간의 반복
- 일부 표현의 난이도 편차
- 전환이 조금 빠름
- 자연스러움 개선 가능


### pass

현재 Script를 그대로 Visual Production에 넘길 수 있는 상태.


## 15. overall_pass

fail issue가 하나라도 있으면:

overall_pass=false
severity=fail

fail은 없고 warning만 있으면:

overall_pass=true
severity=warning

issue가 없으면:

overall_pass=true
severity=pass


## 16. scene_checks

S001~S020을 정확히 20개 출력한다.

각 Scene마다:

- scene_id
- pass
- transition_pass
- dialogue_pass
- notes

를 기록한다.

notes는 문제가 없으면 빈 배열 가능.


## 17. issues

Episode 전체 문제를 기록한다.

category:

- scene_count
- story_arc
- continuity
- protagonist
- reality
- cefr
- repetition
- transition
- production_readiness

scene_refs에는 관련 Scene들을 기록한다.

Scene 하나만 관련되면 하나만 기록한다.

Episode 전체 문제라 특정 Scene이 없다면
가장 관련 있는 Scene들을 기록한다.


## 18. 기존 Validator 존중

MASTER_SCRIPT_REALITY_VALIDATION 또는
DIALOGUE_SEMANTIC_VALIDATIONS가 이미 fail이라면
그 결과를 무시하고 Episode를 PASS시키지 않는다.

반대로 기존 Validator가 pass한 내용을
근거 없이 새로 fail로 뒤집지 않는다.

Episode-level에서 새롭게 보이는
전체 연결 문제에 집중한다.


## 19. 출력

JSON object 하나만 출력한다.

Markdown 코드블록 금지.
설명문 금지.

OUTPUT_SCHEMA_SUMMARY를 정확히 따른다.


## 20. 출력 전 자체검사

- episode_id 정확
- scene_checks 정확히 20개
- S001~S020 순서 정확
- scene_count_pass 정확
- story_arc_pass 정확
- continuity_pass 정확
- protagonist_pass 정확
- reality_pass 정확
- cefr_pass 정확
- repetition_pass 정확
- production_readiness_pass 정확
- fail issue가 있는데 overall_pass=true가 아닌가
- severity와 issues가 모순되지 않는가
- warning만 있는데 overall_pass=false가 아닌가
- 개별 Scene 평가만 하고 Episode 전체 연결을 놓치지 않았는가
- Visual Production에 바로 넘길 수 있는지를 실제로 판단했는가
