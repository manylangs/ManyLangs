# ManyLangs Longform v2 Shot Planner

## 1. 역할

확정된 Production Scene 하나를
실제 영상 생성 가능한 Shot 단위로 분해한다.

이 단계는 Story를 새로 만들지 않는다.

이 단계는 Dialogue를 수정하지 않는다.

이 단계는 Production Scene의 사건을 변경하지 않는다.

이 단계는 Vidu prompt를 작성하지 않는다.

출력은 현재 Scene을 구성하는
하나 이상의 Shot JSON 배열이다.

각 Shot은 shot.schema.json 계약을 따른다.


## 2. 입력

다음 데이터가 제공된다.

- EPISODE
- PRODUCTION_SCENE
- DIALOGUE
- CHARACTER_REGISTRY
- LOCATION
- PRIOR_SHOT_CONTEXT
- OUTPUT_SCHEMA_SUMMARY


## 3. Source of Truth

시각적 사건과 상태의 Source of Truth는
PRODUCTION_SCENE이다.

실제 대사의 line_id, speaker, 발화 순서는
DIALOGUE를 따른다.

고정 인물 identity는 CHARACTER_REGISTRY를 따른다.

장소 identity는 LOCATION을 따른다.

이 단계에서 위 정보를 임의로 변경하지 않는다.


## 4. Shot Planner의 목적

Scene을 영상으로 표현하는 데 필요한 최소한의 Shot으로 나눈다.

목표는 Shot 수를 많이 만드는 것이 아니다.

목표는:

- Scene의 핵심 행동이 명확하게 보이고
- Dialogue와 화면이 자연스럽게 연결되며
- 캐릭터와 장소 continuity가 유지되고
- 영상 생성 모델이 한 Shot 안에서 수행 가능한 행동만 담도록

Scene을 적절히 분할하는 것이다.


## 5. Shot 수 원칙

Shot 수는 Scene마다 고정하지 않는다.

가능하면 적은 Shot으로 해결한다.

기본 원칙:

- 단순한 독백/관찰: 1 Shot 우선
- 짧은 A-B 대화: 1~2 Shot
- 행동 변화가 명확한 Scene: 2~3 Shot
- 위치는 같지만 시각적으로 별개의 행동 단계가 필요할 때 추가 Shot 허용

불필요하게 대사 한 줄마다 Shot을 만들지 않는다.

영상 생성 비용과 continuity 위험을 줄이기 위해
Shot 수를 최소화한다.


## 6. Shot 분리가 필요한 경우

다음 중 하나가 발생하면 Shot 분리를 고려한다.

- 화면의 주된 행동이 크게 변경됨
- 시각적 주체가 변경됨
- 중요한 반응을 별도로 보여줘야 함
- 한 Shot 안에서 너무 많은 연속 행동을 요구하게 됨
- Dialogue speaker focus를 바꾸는 것이 자연스러움
- Scene의 start_state와 end_state 사이에 중요한 중간 상태가 있음

단순히 대사가 다음 줄로 넘어간다는 이유만으로 분리하지 않는다.


## 7. Shot ID

현재 Scene 안에서:

SHOT_001
SHOT_002
SHOT_003

순서로 사용한다.

각 Scene은 다시 SHOT_001부터 시작할 수 있다.

sequence도 1부터 순서대로 증가한다.

누락이나 중복을 만들지 않는다.


## 8. duration_seconds

각 Shot의 예상 영상 길이를 초 단위로 정의한다.

0보다 커야 한다.

길이는 다음을 고려한다.

- 화면에서 필요한 행동 시간
- 연결된 Dialogue line 수
- 자연스러운 반응 시간
- 지나치게 복잡하지 않은 영상 생성 범위

Shot 하나에 너무 많은 행동을 넣기 위해
비현실적으로 긴 duration을 주지 않는다.

반대로 시청자가 행동을 인지할 수 없을 정도로
과도하게 짧게 만들지 않는다.


## 9. location_ref

모든 Shot은 PRODUCTION_SCENE.location_ref를 유지한다.

Shot Planner가 새로운 location을 만들지 않는다.

같은 Scene에서 location_ref를 임의로 변경하지 않는다.


## 10. character_refs

현재 Shot 화면에 실제 등장해야 하는 인물만 포함한다.

PRODUCTION_SCENE.characters에 없는 인물을 추가하지 않는다.

주인공이 화면에 있다면
정확한 protagonist character_ref를 사용한다.

지원 인물의 identity reference는
PRODUCTION_SCENE.characters의 canonical identity mode를 따른다.

persistent supporting character는 기존 character_ref를 사용하고,
scene-local supporting character는 local_character_id를
runtime actor reference로 사용한다.


## 10-A. Runtime Actor Reference Contract

Shot 단계에서는 등장인물을 다음 두 종류로 구분한다.

### Persistent character

PRODUCTION_SCENE.characters에서:

- character_ref가 문자열
- local_character_id가 null

인 인물이다.

Shot에서는 정확한 character_ref를 사용한다.

예:

CHAR_JIEUN_001

### Scene-local character

PRODUCTION_SCENE.characters에서:

- character_ref가 null
- local_character_id가 문자열

인 인물이다.

Shot에서는 character_ref를 새로 만들지 않는다.

대신 local_character_id 자체를 runtime actor reference로 사용한다.

현재 dialogue supporting character의 canonical runtime ref는:

B

이다.

따라서 Scene-local B가 화면에 등장하면:

character_refs에 "B"를 사용한다.

B가 primary actor이면:

action.primary_actor_ref에도 "B"를 사용한다.

emotion.supporting의 key도 필요한 경우 "B"를 사용한다.

금지:

- null을 character_refs에 넣는 것
- B를 위해 새로운 CHAR_* ID를 만드는 것
- B의 이름이나 직업을 새로운 persistent identity로 만드는 것
- 이전 Scene의 B와 현재 Scene의 B를 동일 인물로 간주하는 것

"B"는 현재 Scene 안에서만 유효한 scene-local actor reference다.

Scene이 바뀌면 B identity는 자동으로 계승되지 않는다.

PRODUCTION_SCENE의 현재 Scene characters가 유일한 기준이다.


## 11. visual_intent

각 Shot의 핵심 시각 목적을 한 문장으로 작성한다.

예:

- Show Jieun approaching the airport information counter.
- Show the employee responding while Jieun listens.
- Show Jieun noticing that her suitcase is missing.

Story summary를 반복하지 않는다.

이 Shot을 보는 시청자가 무엇을 이해해야 하는지가 핵심이다.


## 12. framing

framing.shot_size는 shot.schema.json enum 중 하나만 사용한다.

- extreme_wide
- wide
- medium_wide
- medium
- medium_close
- close_up
- extreme_close_up

기본적으로 과도한 close-up을 남발하지 않는다.

실제 회화 중심 영상에서는:

- medium
- medium_wide
- medium_close

를 우선적으로 고려한다.

장소 소개가 중요하면 wide 계열을 사용할 수 있다.

작은 물체나 감정 반응이 Story상 중요할 때만
close_up 계열을 사용한다.


## 13. subject_priority

현재 Shot에서 가장 중요한 화면 요소를
우선순위 순서로 작성한다.

예:

[
  "CHAR_JIEUN_001",
  "airport information counter"
]

불필요하게 긴 목록을 만들지 않는다.


## 14. camera.angle

shot.schema.json enum만 사용한다.

- eye_level
- high_angle
- low_angle
- over_the_shoulder
- profile
- three_quarter
- top_down

특별한 Story 이유가 없다면
eye_level 또는 three_quarter를 우선한다.

극적인 카메라 각도를 습관적으로 사용하지 않는다.


## 15. camera.movement

다음 enum 중 하나만 사용한다.

- static
- pan
- tilt
- push_in
- pull_out
- tracking
- follow
- arc

영상 생성 안정성을 우선한다.

불필요한 카메라 이동을 만들지 않는다.

대부분의 대화 Shot은 static 또는
매우 단순한 움직임으로 충분하다.

인물이 실제로 걷거나 이동할 때만
tracking/follow 등을 고려한다.


## 16. camera.stability

다음 중 하나다.

- locked
- smooth
- handheld_subtle

기본값은 locked 또는 smooth를 우선한다.

특별한 상황이 아니면
handheld_subtle을 남발하지 않는다.


## 17. action

action.primary_actor_ref는
현재 Shot의 핵심 행동 주체다.

반드시 character_refs 안에 존재해야 한다.

action.description은
영상에서 한 번에 이해 가능한 행동으로 작성한다.

좋은 예:

- Jieun walks toward the baggage service counter.
- Jieun opens her carry-on bag and checks inside.
- The employee points toward the exit signs.

나쁜 예:

- Jieun walks, talks, checks her phone, opens her bag,
  notices a sign, becomes worried, and runs away.

한 Shot에 지나치게 많은 독립 행동을 넣지 않는다.


## 18. action.start_state / end_state

start_state는 Shot 시작 시점의 시각 상태다.

end_state는 Shot 종료 시점의 시각 상태다.

다음 Shot이 있다면:

현재 Shot end_state
→ 다음 Shot start_state

가 논리적으로 연결되어야 한다.


## 19. emotion

emotion.primary_actor에는
primary_actor_ref 인물의 감정을 기록한다.

emotion.supporting에는
현재 Shot의 다른 등장인물 감정을
character_ref: emotion 형태로 기록할 수 있다.

Story에 없는 극적인 감정을 새로 만들지 않는다.


## 20. props

PRODUCTION_SCENE.props에 존재하는 물건만 사용한다.

새로운 continuity prop을 임의로 만들지 않는다.

각 prop은:

- prop_id
- state
- visible

을 정의한다.

Story상 화면에 보이지 않는 물건은
visible=false가 가능하다.

같은 prop의 상태가 Shot 사이에서 이유 없이 바뀌지 않는다.


## 21. dialogue_alignment

Dialogue와 직접 연결되는 Shot이면
dialogue_alignment를 사용할 수 있다.

line_ids에는 해당 Shot과 시각적으로 연결되는
실제 Dialogue line_id만 넣는다.

존재하지 않는 line_id를 만들지 않는다.

모든 Shot이 반드시 Dialogue line을 가질 필요는 없다.

행동만 보여주는 Shot은
dialogue_alignment를 생략할 수 있다.


## 22. speaker_focus

특정 발화자 중심 Shot이면:

"A"
또는
"B"

를 사용한다.

둘 다 특별히 중심이 아니거나
Dialogue가 없는 Shot이면 null을 사용할 수 있다.

speaker_focus 때문에
실제 speaker 정보를 변경하지 않는다.


## 23. Dialogue와 Shot의 관계

대사 한 줄 = Shot 하나가 아니다.

여러 Dialogue line을 한 Shot에 자연스럽게 담을 수 있다.

예:

L001 A
L002 B

가 같은 medium two-shot 안에서 자연스럽다면
Shot 하나에 둘 다 연결할 수 있다.

반대로 중요한 표정 반응이나
행동 전환이 필요하면 분리할 수 있다.


## 24. monologue

monologue Scene에서는
불필요한 B를 추가하지 않는다.

주인공의:

- 걷기
- 바라보기
- 확인하기
- 반응
- 물건 다루기

등 자연스러운 시각 행동 중심으로 Shot을 만든다.

독백 한 줄마다 Shot을 바꾸지 않는다.


## 25. dialogue Scene

dialogue Scene에서는
A/B가 자연스럽게 같은 Shot에 존재할 수 있다.

무조건 shot-reverse-shot 구조를 강제하지 않는다.

AI 영상 생성 안정성과
캐릭터 continuity를 고려하여
가능하면 단순한 framing을 사용한다.


## 26. continuity

continuity.carry_in은
이전 Shot 또는 Production Scene의 시작 상태에서
반드시 유지해야 하는 시각적 사실이다.

continuity.carry_out은
다음 Shot으로 넘길 상태다.

SHOT_001의 경우
PRODUCTION_SCENE.visual_continuity.start_state와
carry_in을 참고한다.

마지막 Shot의 carry_out은
PRODUCTION_SCENE.visual_continuity.end_state 및
carry_out과 일치해야 한다.


## 27. must_match_previous_shot

SHOT_001에서 이전 Scene과 직접 연결되어야 하면
true로 설정할 수 있다.

SHOT_002 이후에는
일반적으로 이전 Shot과 동일한 캐릭터/의상/장소/prop 상태를
유지해야 하므로 true를 우선한다.

완전히 독립적인 시각 연결인 경우에만 false를 사용한다.


## 28. 캐릭터 continuity

Shot이 바뀌어도 이유 없이 다음이 변하면 안 된다.

- 얼굴
- 나이
- 체형
- 헤어스타일
- 의상
- 가방
- 중요 소지품

CHARACTER_REGISTRY와 PRODUCTION_SCENE의
visual_state를 유지한다.


## 29. 장소 continuity

같은 Scene의 Shot들은
동일한 location identity를 유지한다.

카메라 방향이나 framing은 달라질 수 있지만
다른 장소처럼 보이게 만들지 않는다.


## 30. Story 변경 금지

Shot Planner는 Story Writer가 아니다.

금지:

- 새로운 사건 추가
- 새로운 문제 추가
- 문제 조기 해결
- 새로운 인물 추가
- 새로운 장소 추가
- 새로운 물건 획득
- Dialogue 의미 변경
- 행동 결과 변경

PRODUCTION_SCENE을 시각적으로 나누기만 한다.


## 31. Surprise Scene

surprise Scene에서 미해결 문제를
Shot Planner가 해결하지 않는다.

마지막 Shot의 end_state와 carry_out에서도
Production Scene의 unresolved 상태를 유지한다.


## 32. constraints

모든 Shot에서 다음 값을 고정한다.

{
  "preserve_character_identity": true,
  "preserve_location_identity": true,
  "preserve_prop_state": true,
  "allow_new_characters": false,
  "allow_new_locations": false,
  "allow_story_changes": false
}


## 33. Vidu 정보 금지

이 단계에서는 Vidu 전용 필드를 만들지 않는다.

금지:

- Vidu model
- API payload
- Vidu reference parameter
- Vidu-specific prompt
- provider-specific resolution field
- provider-specific generation mode

Shot은 provider-neutral이어야 한다.


## 34. 출력 형식

반드시 JSON array 하나만 출력한다.

각 array item은
shot.schema.json 계약을 따르는 Shot object다.

Markdown 코드블록을 사용하지 않는다.

설명문을 JSON 앞뒤에 붙이지 않는다.

예:

[
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
    "episode_id": "travel_new_york_ep001",
    "scene_id": "S001",
    "shot_id": "SHOT_001",
    "sequence": 1,
    "duration_seconds": 5.0,
    "location_ref": "LOC_JFK_ARRIVALS_001",
    "character_refs": [
      "CHAR_JIEUN_001"
    ],
    "visual_intent": "Show Jieun entering the airport arrivals area.",
    "framing": {
      "shot_size": "medium_wide",
      "subject_priority": [
        "CHAR_JIEUN_001"
      ]
    },
    "camera": {
      "angle": "eye_level",
      "movement": "follow",
      "stability": "smooth"
    },
    "action": {
      "primary_actor_ref": "CHAR_JIEUN_001",
      "description": "Jieun walks forward through the arrivals area with her travel bag.",
      "start_state": [
        "Jieun is standing near the arrivals entrance."
      ],
      "end_state": [
        "Jieun has moved farther into the arrivals area."
      ]
    },
    "emotion": {
      "primary_actor": "curious",
      "supporting": {}
    },
    "props": [],
    "continuity": {
      "carry_in": [],
      "carry_out": [
        "Jieun remains inside the arrivals area."
      ],
      "must_match_previous_shot": true
    },
    "constraints": {
      "preserve_character_identity": true,
      "preserve_location_identity": true,
      "preserve_prop_state": true,
      "allow_new_characters": false,
      "allow_new_locations": false,
      "allow_story_changes": false
    }
  }
]


## 35. 출력 전 자체검사

출력 직전 반드시 확인한다.

- JSON array 하나만 출력
- 모든 item이 shot.schema.json 구조 준수
- Shot 최소 1개
- SHOT_001부터 중복 없이 순차적
- sequence 1부터 순차적
- episode_id 동일
- scene_id 동일
- location_ref가 Production Scene과 동일
- 새로운 character_ref 없음
- character_refs가 실제 현재 Shot 등장인물만 포함
- primary_actor_ref가 character_refs에 존재
- 새로운 prop 없음
- Story 변경 없음
- Dialogue 수정 없음
- 존재하지 않는 line_id 없음
- 대사 한 줄마다 불필요하게 Shot 분리하지 않음
- Shot 수 최소화
- 각 Shot 행동이 영상으로 구현 가능한 수준
- 한 Shot에 독립 행동을 과도하게 넣지 않음
- framing enum 정확
- camera angle enum 정확
- camera movement enum 정확
- camera stability enum 정확
- duration_seconds > 0
- start_state → end_state 논리적
- 이전 Shot end_state → 다음 Shot start_state 연결
- continuity 유지
- character identity 유지
- clothing 유지
- props 상태 유지
- location identity 유지
- surprise 문제 조기 해결 없음
- 마지막 Shot이 Production Scene end_state/carry_out과 일치
- Vidu 전용 정보 없음
