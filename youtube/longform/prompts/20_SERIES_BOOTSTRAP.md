# ManyLangs Longform v2 Series Bootstrap

## 1. 역할

사용자가 정의한 CONTENT_REQUEST를 입력받아
Longform 시리즈와 Episode 제작에 필요한 최상위 설계인
SERIES_BOOTSTRAP을 생성한다.

이 단계의 목적은 특정 장르에 종속된 Story를 직접 작성하는 것이 아니라,

category
genre
topic
target language
CEFR
episode 조건

을 실제 ManyLangs Longform 생산 파이프라인이 사용할 수 있는
구조화된 Series 방향으로 변환하는 것이다.

출력은 반드시 series_bootstrap.schema.json 계약을 따른다.


## 2. 입력

다음 데이터가 제공된다.

- CONTENT_REQUEST
- LANGUAGE_CONFIG
- OUTPUT_SCHEMA_SUMMARY

CONTENT_REQUEST는 content_request.schema.json 계약을 따른다.


## 3. Source of Truth

사용자가 제공한 CONTENT_REQUEST가 최상위 Source of Truth다.

다음 값은 임의로 변경하지 않는다.

- category
- genre
- topic
- target_language
- cefr_level
- episode.scene_count
- 사용자가 명시한 setting
- 사용자가 명시한 protagonist preference

사용자가 지정하지 않은 부분만 합리적으로 설계한다.


## 4. 출력 목적

SERIES_BOOTSTRAP은 이후 다음 객체를 생성하기 위한 상위 설계다.

- SERIES_BIBLE
- EPISODE
- PROTAGONIST
- LOCATION

이 단계에서는 위 객체들의 완전한 최종 JSON을 직접 생성하지 않는다.

대신 downstream writer가 일관된 결과를 만들 수 있도록
필요한 설계 방향을 명확하게 정의한다.


## 5. 범용 장르 원칙

특정 장르에 하드코딩하지 않는다.

다음과 같은 서로 다른 콘텐츠가 동일한 파이프라인을 사용할 수 있어야 한다.

- travel
- daily life
- workplace
- school
- relationships
- culture
- service situations
- documentary-style learning
- practical conversation
- 기타 사용자가 정의한 장르

장르가 달라져도 downstream 생산 구조를 변경하지 않는다.


## 6. category_id

CONTENT_REQUEST.category를 기반으로
안정적인 내부 category_id를 만든다.

규칙:

- lowercase
- 영문
- snake_case 허용
- 장기적으로 재사용 가능한 이름
- episode topic 자체를 category_id로 사용하지 않는다

예:

travel
daily_life
workplace
school


## 7. series_id

현재 콘텐츠가 속할 Series의 안정적인 ID를 만든다.

Series는 여러 Episode를 포함할 수 있는 단위다.

episode 하나에만 맞춘 지나치게 구체적인 ID를 만들지 않는다.

예:

travel_new_york
travel_tokyo
daily_life_beginner
workplace_english


## 8. episode_id

현재 Episode를 식별하는 안정적인 ID를 만든다.

기존 입력에 episode 식별 정보가 있다면 그것을 우선한다.

없다면 series_id와 episode_number를 기반으로
예측 가능한 형태로 만든다.

episode_id는 이후 전체 파이프라인에서 변경하지 않는다.


## 9. series_direction.name

Series의 사람이 읽을 수 있는 이름이다.

짧고 명확해야 한다.

Episode 제목과 동일할 필요는 없다.

Series 전체 범위를 나타낸다.


## 10. series_direction.premise

Series가 반복적으로 어떤 경험을 제공하는지 정의한다.

다음을 설명할 수 있어야 한다.

- 주인공이 어떤 세계/상황을 경험하는가
- 시청자가 무엇을 따라가게 되는가
- 어떤 종류의 실제 언어 상황이 반복적으로 등장하는가

한 Episode의 줄거리만 설명하지 않는다.


## 11. series_direction.genre

CONTENT_REQUEST.genre를 보존한다.

장르를 임의로 다른 장르로 재해석하지 않는다.


## 12. series_direction.tone

콘텐츠 전체의 기본 정서와 표현 방식을 정의한다.

예:

- warm
- realistic
- practical
- light
- immersive
- calm
- energetic

장르와 topic에 맞게 선택하되
지나치게 많은 tone을 혼합하지 않는다.


## 13. series_direction.scope

Series가 다룰 수 있는 Story 범위를 정의한다.

scope는 downstream Story Planner가
어디까지 사건을 확장할 수 있는지 판단할 수 있을 정도로 명확해야 한다.

Series 범위를 불필요하게 좁히지 않는다.


## 14. series_direction.learning_focus

언어 학습 콘텐츠로서 반복적으로 제공할 학습 가치를 정의한다.

예:

- practical travel conversation
- everyday interaction
- workplace communication
- situational listening
- natural spoken expressions

CEFR_LEVEL과 모순되지 않아야 한다.


## 15. episode_direction

현재 Episode 하나의 방향을 정의한다.

다음은 반드시 CONTENT_REQUEST와 일치해야 한다.

- episode_number
- topic
- scene_count
- target_language
- cefr_level

story_goal은 topic을 실제 하나의 Episode 경험으로 변환한다.


## 16. episode_direction.story_goal

20 Scene 전체가 향해야 하는 하나의 명확한 경험 목표를 정의한다.

단순한 학습 목표 목록이 아니다.

Episode 시작부터 종료까지
주인공에게 실제 진행감이 있어야 한다.

예:

처음 뉴욕에 도착한 여행자가
공항 도착부터 숙소에 안전하게 도착하기까지
실제 여행 상황을 경험한다.


## 17. start_state / end_state

Episode의 시작 상태와 종료 상태를 정의한다.

start_state는 Episode 시작 시점의:

- 위치
- 상황
- 감정
- 해결해야 할 목표

를 downstream에서 이해할 수 있게 한다.

end_state는 Episode가 정상적으로 끝났을 때:

- 위치
- Story 진행 결과
- 감정 변화
- 다음 Episode로 이어질 수 있는 상태

를 정의한다.

중간 Scene의 상세 사건은 여기서 만들지 않는다.


## 18. scene_count

CONTENT_REQUEST.episode.scene_count를 그대로 사용한다.

현재 기본 계약에서는 20이다.

임의로 Scene 수를 변경하지 않는다.


## 19. target_language

CONTENT_REQUEST.target_language를 그대로 사용한다.

허용 내부 코드는:

- en
- es
- fr
- pt
- jp
- kr
- zh
- ru

내부 코드와 locale을 혼동하지 않는다.

특히:

pt = internal language code
pt-BR = Brazilian Portuguese locale

target_language가 pt이면
downstream 언어 생성은 Brazilian Portuguese를 사용한다.


## 20. cefr_level

CONTENT_REQUEST.cefr_level을 그대로 사용한다.

허용값:

- A1
- A2
- B1
- B2
- C1
- C2

CEFR은 Story 자체를 단순하게 만드는 값이 아니다.

Story는 자연스러울 수 있으며,
실제 Dialogue 난이도는 downstream Dialogue Writer가 조절한다.


## 21. protagonist_design

Series 전체에서 유지할 주인공 설계 방향을 만든다.

반드시 포함한다.

- character_id
- gender
- story_role
- personality
- visual_direction

사용자가 protagonist_preferences를 지정했다면 우선한다.


## 22. protagonist identity

주인공은 Series의 중심 관점이다.

주인공은 Episode마다 이유 없이 바뀌지 않는다.

character_id는 downstream 전체에서 사용할
안정적인 reference여야 한다.

주인공에게 지나치게 복잡한 배경 설정을 추가하지 않는다.

Story 제작에 실제 필요한 identity만 정의한다.


## 23. protagonist gender

CONTENT_REQUEST.protagonist_preferences.gender가 지정되어 있으면
반드시 그대로 사용한다.

지정되지 않은 경우 콘텐츠에 자연스러운 값을 선택할 수 있다.

선택된 gender는 이후:

- Dialogue
- Translation
- Visual Production
- Continuity

전체에서 고정된다.


## 24. protagonist personality

실제 Story와 Dialogue에 영향을 줄 수 있는
소수의 안정적인 성격 특성만 정의한다.

예:

- curious
- polite
- observant
- slightly cautious

서로 모순되는 성격을 과도하게 넣지 않는다.


## 25. protagonist visual_direction

아직 이미지 생성 prompt를 작성하지 않는다.

다만 이후 Character 설계와 영상 continuity에 필요한
상위 visual direction을 정의한다.

예:

- realistic modern traveler
- approachable everyday appearance
- practical travel clothing
- visually consistent across episodes

Vidu 전용 parameter는 작성하지 않는다.


## 26. location_design

Series와 현재 Episode에서 필요한 장소 설계 방향을 만든다.

포함:

- setting
- location_strategy
- required_locations


## 27. setting

CONTENT_REQUEST.setting이 명시되어 있다면 그대로 사용한다.

명시되지 않았다면 topic과 genre에서
필요한 수준까지만 추론한다.

불필요하게 특정 도시나 국가를 만들어내지 않는다.


## 28. location_strategy

downstream Location Writer가
어떤 방식으로 장소를 분리해야 하는지 설명한다.

장소는 Story에서 실제 의미가 있을 때만 분리한다.

카메라 각도가 바뀐다는 이유로 새로운 location을 만들지 않는다.

같은 실제 장소 내부의 작은 이동은
필요한 경우 zone/state로 처리할 수 있다.


## 29. required_locations

현재 Episode Story를 구성하는 데
명백히 필요한 장소 후보를 정의한다.

이 목록은 Story의 기반이다.

불필요하게 많은 장소를 만들지 않는다.

각 장소는 이후 stable location_ref로 구체화될 수 있어야 한다.


## 30. Story 상세 생성 금지

이 단계에서는 다음을 생성하지 않는다.

- 20개 Scene 상세
- Scene별 사건
- Dialogue
- Translation
- Learning expression
- Production Scene
- Shot
- Camera
- Vidu prompt

이들은 downstream 단계가 담당한다.


## 31. production_policy

다음 값은 항상 고정한다.

"preserve_series_identity": true

"preserve_protagonist_identity": true

"preserve_location_identity": true

"allow_downstream_story_redefinition": false


## 32. downstream 책임

SERIES_BOOTSTRAP 이후 writer는
Bootstrap을 기반으로 구체적인 JSON을 생성한다.

Bootstrap에서 확정된:

- Series identity
- Episode identity
- protagonist identity
- location direction
- Story goal

을 downstream에서 이유 없이 재정의하지 않는다.


## 33. 출력

반드시 series_bootstrap.schema.json 계약을 따르는
JSON object 하나만 출력한다.

마크다운 코드블록을 사용하지 않는다.

JSON 앞뒤에 설명문을 붙이지 않는다.

metadata.generated_by는 현재 파이프라인 기준으로:

{
  "type": "ai",
  "provider": "deepseek",
  "model": "deepseek-chat"
}

을 사용한다.


## 34. 출력 전 자체검사

출력 직전 반드시 확인한다.

- JSON object 하나만 출력
- series_bootstrap.schema.json 구조 준수
- CONTENT_REQUEST.category 보존
- CONTENT_REQUEST.genre 보존
- CONTENT_REQUEST.topic 보존
- target_language 정확
- cefr_level 정확
- scene_count 정확
- category_id 안정적
- series_id 안정적
- episode_id 안정적
- Series와 Episode 범위를 혼동하지 않음
- story_goal이 하나의 명확한 Episode 경험을 정의
- start_state와 end_state가 논리적으로 연결
- protagonist preference 보존
- protagonist identity가 downstream에서 재사용 가능
- protagonist visual_direction이 Vidu 종속적이지 않음
- setting 보존
- required_locations가 Story에 실제 필요한 장소만 포함
- Story 상세 Scene을 미리 만들지 않음
- Dialogue 생성 없음
- Shot 생성 없음
- Vidu prompt 생성 없음
- preserve_series_identity=true
- preserve_protagonist_identity=true
- preserve_location_identity=true
- allow_downstream_story_redefinition=false


## Reality Context 규칙

CONTENT_REQUEST.reality_context와 CONTENT_REQUEST.setting은
현실 세계 콘텐츠의 기준 정보다.

SERIES_BOOTSTRAP.reality_context는 반드시 다음 원칙을 따른다.

- reference_date는 CONTENT_REQUEST.reality_context.reference_date와 동일해야 한다.
- location_context는 CONTENT_REQUEST.setting을 기준으로 한다.
- reference_date를 임의로 다른 날짜로 변경하지 않는다.
- location_context를 임의로 더 좁거나 다른 지역으로 변경하지 않는다.
- 실제 장소, 교통, 서비스, 결제, 가격, 운영 방식 등은 창작 설정으로 취급하지 않는다.
- 확인되지 않은 현실 세계의 구체적 사실을 사실처럼 만들어내지 않는다.
- 현실 정보가 불확실한 경우 downstream 단계가 일반화하거나 검증 대상으로 처리할 수 있도록 한다.

Reality Context는 Story 아이디어가 아니라
이후 Episode, Master Script, Dialogue, Visual Production이
공통으로 따라야 하는 현실 기준 계약이다.

예:

CONTENT_REQUEST:

{
  "setting": "New York City",
  "reality_context": {
    "reference_date": "2026-08"
  }
}

SERIES_BOOTSTRAP:

{
  "reality_context": {
    "reference_date": "2026-08",
    "location_context": "New York City"
  }
}

이 값들은 창작적 판단으로 변경하지 않는다.
