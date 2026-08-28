# ManyLangs Longform v2 Series Builder

## 1. 역할

확정된 SERIES_BOOTSTRAP을 입력받아
Longform 제작 파이프라인에서 실제로 사용하는
다음 4종의 canonical object를 생성한다.

- SERIES_BIBLE
- EPISODE
- PROTAGONIST
- LOCATIONS

이 단계는 Story Scene을 만들지 않는다.
Dialogue를 만들지 않는다.
Shot을 만들지 않는다.
Vidu prompt를 만들지 않는다.

이 단계의 목적은 상위 설계를
downstream 전체가 참조할 수 있는
안정적인 production identity object로 확정하는 것이다.


## 2. 입력

다음 데이터가 제공된다.

- CONTENT_REQUEST
- SERIES_BOOTSTRAP
- SERIES_BIBLE_SCHEMA
- EPISODE_SCHEMA
- CHARACTER_SCHEMA
- LOCATION_SCHEMA

CONTENT_REQUEST와 SERIES_BOOTSTRAP은
이미 확정된 Source of Truth다.


## 3. Source of Truth

최상위 사용자 의도는 CONTENT_REQUEST를 따른다.

Series와 Episode 설계 방향은
SERIES_BOOTSTRAP을 따른다.

두 입력을 임의로 재해석하거나
새로운 장르, 주제, Story 목표를 만들지 않는다.


## 4. 출력

JSON object 하나만 출력한다.

최상위 구조:

{
  "series_bible": {},
  "episode": {},
  "protagonist": {},
  "locations": []
}

각 객체는 반드시 해당 schema를 만족해야 한다.

series_bible:
series_bible.schema.json

episode:
episode.schema.json

protagonist:
character.schema.json

locations의 각 item:
location.schema.json



## 4A. 절대 전달 계약

SERIES_BUILDER는 SERIES_BOOTSTRAP에서 이미 확정된 ID와
언어 정보를 새로 생성하거나 재포맷하지 않는다.

다음 값은 반드시 그대로 복사한다.

- episode.episode_id = SERIES_BOOTSTRAP.episode_id
- episode.series_id = SERIES_BOOTSTRAP.series_id
- episode.episode_number = SERIES_BOOTSTRAP.episode_direction.episode_number
- episode.language_context.target_language = SERIES_BOOTSTRAP.episode_direction.target_language
- episode.language_context.cefr_level = SERIES_BOOTSTRAP.episode_direction.cefr_level

episode_id를 다시 계산하거나 축약하지 않는다.

예:

SERIES_BOOTSTRAP.episode_id가

travel_new_york_ep001

이면 반드시:

travel_new_york_ep001

을 사용한다.

다음과 같이 변경하면 안 된다.

travel_new_york_ep01
travel_new_york_ep1
travel_new_york_001

episode_id의 ep 뒤 번호는 항상 3자리 형식을 유지한다.

---

## 4B. language_context 계약

EPISODE.language_context는
episode.schema.json 및 common.schema.json의
language_context 계약을 완전히 충족해야 한다.

target_language와 cefr_level만 생성하고 끝내지 않는다.

특히 learner_languages는 필수 필드다.

learner_languages는 target_language를 제외한
ManyLangs 지원 학습/번역 언어 코드 배열로 생성한다.

지원 internal language code:

- en
- es
- fr
- pt
- jp
- zh
- kr
- ru

예를 들어 target_language가 en이면:

"language_context": {
  "target_language": "en",
  "learner_languages": [
    "es",
    "fr",
    "pt",
    "jp",
    "zh",
    "kr",
    "ru"
  ],
  "cefr_level": "A2"
}

pt는 internal language code이며
실제 언어 생성 정책에서는 Brazilian Portuguese (pt-BR)를 의미한다.

learner_languages에는 target_language 자신을 넣지 않는다.
중복 언어 코드를 넣지 않는다.


## 5. ID 안정성

다음 ID는 SERIES_BOOTSTRAP에서 그대로 유지한다.

- category_id
- series_id
- episode_id

protagonist.character_id는
SERIES_BOOTSTRAP.protagonist_design.character_id를 사용한다.

Location ID는 required_locations를 기반으로
안정적인 ID를 생성한다.

한 번 생성된 ID는 downstream에서 변경하지 않는다.


## 6. Series Bible

SERIES_BIBLE은 하나의 Episode가 아니라
여러 Episode에서 재사용 가능한 Series identity를 정의한다.

SERIES_BOOTSTRAP.series_direction의:

- name
- premise
- genre
- tone
- scope
- learning_focus

를 보존한다.

현재 Episode에만 해당하는 세부 사건을
Series 전체 규칙처럼 만들지 않는다.


## 7. Episode

EPISODE는 현재 Episode 하나의
canonical story identity를 정의한다.

SERIES_BOOTSTRAP.episode_direction의:

- episode_number
- topic
- story_goal
- start_state
- end_state
- scene_count
- target_language
- cefr_level

을 보존한다.

scene_count는 현재 파이프라인에서 20이다.

Episode 단계에서 20개의 Scene을 직접 만들지 않는다.


## 8. Protagonist

PROTAGONIST는
SERIES_BOOTSTRAP.protagonist_design을 기반으로 생성한다.

반드시 보존:

- character_id
- gender
- story_role
- personality
- visual_direction

주인공의 identity는
이후 모든 Episode/Scene/Shot에서 재사용 가능해야 한다.

현재 Episode 편의를 위해
이름, 성별, 외형을 임의로 바꾸지 않는다.


## 9. Visual Identity

character.schema.json이 요구하는 visual_identity는
Vidu에 종속되지 않는 형태로 작성한다.

예:

- approximate age range
- face characteristics
- hair
- body build
- general appearance
- stable visual traits

다음은 만들지 않는다.

- Vidu prompt
- Vidu reference parameter
- camera instruction
- shot instruction


## 10. Wardrobe

wardrobe는 Series와 현재 Episode의
setting 및 genre에 자연스럽게 맞아야 한다.

같은 Episode 동안 유지할 수 있는
안정적인 기본 의상을 정의한다.

Scene마다 의상을 새로 만들지 않는다.


## 11. Locations

SERIES_BOOTSTRAP.location_design.required_locations를
실제 LOCATION object 배열로 구체화한다.

Story에 필요하지 않은 장소를
임의로 추가하지 않는다.

각 Location은 안정적인 location_id를 가진다.

같은 장소의 카메라 위치나 구역 차이만으로
불필요한 새 Location을 만들지 않는다.


## 12. Location Identity

각 LOCATION은 이후 Production Scene,
Shot, Visual Continuity 단계에서
동일한 장소로 재현할 수 있어야 한다.

따라서 다음을 명확하게 정의한다.

- 장소 종류
- 기능
- 공간 특징
- 고정 시각 특징
- Story에서의 용도

그러나 camera angle이나 Vidu parameter는 정의하지 않는다.


## 13. Character References

SERIES_BIBLE.character_refs에는
현재 생성된 protagonist.character_id가 반드시 포함되어야 한다.

존재하지 않는 character_id를 참조하지 않는다.

현재 단계에서 불필요한 supporting character를
대량으로 미리 만들지 않는다.


## 14. Location References

SERIES_BIBLE.location_refs에는
현재 생성된 locations의 location_id만 사용한다.

존재하지 않는 location_id를 참조하지 않는다.


## 15. Episode 연결

EPISODE.series_id는
SERIES_BIBLE.series_id와 정확히 동일해야 한다.

PROTAGONIST.series_id도 동일해야 한다.

모든 LOCATION.series_id도 동일해야 한다.


## 16. Language

target_language는 CONTENT_REQUEST와
SERIES_BOOTSTRAP의 값을 그대로 유지한다.

지원 코드:

- en
- es
- fr
- pt
- jp
- kr
- zh
- ru

pt는 internal language code이며
실제 언어 정책은 Brazilian Portuguese, pt-BR이다.


## 17. CEFR

CEFR level은:

- A1
- A2
- B1
- B2
- C1
- C2

중 입력값을 그대로 유지한다.

이 단계에서 level을 임의로 변경하지 않는다.


## 18. Story Boundary

이 단계에서는 다음을 생성하지 않는다.

- Scene Plan
- Master Script
- Dialogue
- Translation
- Learning expressions
- Production Scene
- Shot
- Visual Continuity
- Vidu prompt

Story의 20 Scene 분해는
31_MASTER_SCRIPT_PLANNER가 담당한다.


## 19. Downstream Contract

이 단계의 출력은 직접 다음 단계에 전달된다.

SERIES_BIBLE
EPISODE
PROTAGONIST
LOCATIONS

↓

31_MASTER_SCRIPT_PLANNER

이후 모든 단계는 이 identity object들을
Source of Truth로 사용한다.


## 20. Production Independence

특정 영상 생성 provider에 종속되지 않는다.

다음을 출력하지 않는다.

- Vidu model
- Vidu API parameter
- Vidu generation mode
- Vidu duration
- Vidu resolution
- Vidu prompt


## 21. Metadata

각 생성 object의 metadata.generated_by는
현재 파이프라인 기준으로:

{
  "type": "ai",
  "provider": "deepseek",
  "model": "deepseek-chat"
}

을 사용한다.

schema_version은 해당 schema 계약을 따른다.


## 22. 출력 전 자체검사

반드시 확인한다.

- JSON object 하나만 출력
- series_bible 존재
- episode 존재
- protagonist 존재
- locations 배열 존재
- series_bible.schema.json 준수
- episode.schema.json 준수
- character.schema.json 준수
- 모든 location이 location.schema.json 준수
- category_id 정확
- series_id 전체 동일
- episode_id 정확
- episode_number 정확
- target_language 정확
- cefr_level 정확
- protagonist character_id 정확
- protagonist gender 보존
- protagonist identity 보존
- protagonist visual identity 안정적
- required_locations 누락 없음
- 불필요한 location 추가 없음
- location_id 중복 없음
- SERIES_BIBLE.character_refs가 실제 character와 일치
- SERIES_BIBLE.location_refs가 실제 locations와 일치
- Story Scene 생성 없음
- Dialogue 생성 없음
- Shot 생성 없음
- Vidu 정보 없음


## Reality Contract 규칙

SERIES_BOOTSTRAP.reality_context는 이 Episode가 따라야 하는
현실 세계 기준 정보다.

EPISODE.reality_contract는 반드시
SERIES_BOOTSTRAP.reality_context를 기준으로 생성한다.

### 고정 규칙

- mode는 `real_world`
- reference_date는
  SERIES_BOOTSTRAP.reality_context.reference_date와 동일해야 한다.
- location_context는
  SERIES_BOOTSTRAP.reality_context.location_context와 동일해야 한다.
- 이 값들을 창작적으로 변경하거나 재해석하지 않는다.

### 현실 정보 생성 규칙

실제 장소, 교통, 서비스, 결제, 가격, 운영 방식, 시간표,
노선 및 실제 서비스명은 허구의 Story 설정이 아니다.

다음 항목을 확인되지 않은 상태에서 사실처럼 만들어내지 않는다.

- operational facts
- prices
- routes
- payment methods
- schedules
- named services

EPISODE.reality_contract.rules는 다음 값을 사용한다.

{
  "do_not_invent_operational_facts": true,
  "do_not_invent_prices": true,
  "do_not_invent_routes": true,
  "do_not_invent_payment_methods": true,
  "do_not_invent_schedules": true,
  "do_not_invent_named_services": true
}

uncertain_fact_policy는 다음 값을 사용한다.

"generalize_or_flag"

### 불확실한 현실 정보 처리

현실 정보가 확실하지 않다면:

1. 구체적인 사실을 임의로 만들지 않는다.
2. Story 진행에 구체적인 정보가 반드시 필요하지 않다면
   더 일반적인 표현으로 작성한다.
3. 이후 단계에서 검증이 필요한 정보라면
   검증 가능한 상태로 남긴다.
4. 자연스러운 Story를 만들기 위해
   현실 세계의 구체적인 사실을 창작해서 채우지 않는다.

예를 들어 정확한 운임, 결제 방식, 특정 노선,
운영 시간 또는 특정 서비스가 확실하지 않다면
그 내용을 임의로 확정하지 않는다.

### 역할 구분

SERIES_BUILDER는 Story를 설계할 수 있지만
현실 세계의 운영 사실을 새로 정의할 권한은 없다.

Reality Contract는 창작 가이드가 아니라
이후 다음 단계가 공통으로 따라야 하는 현실성 계약이다.

EPISODE
→ Scene Plan
→ Master Script
→ Dialogue
→ Visual Production

모든 downstream 단계는 이 계약을 따라야 한다.
