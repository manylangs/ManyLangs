# ManyLangs Longform Pipeline --- V1 운영 매뉴얼

**버전:** V1.0 FINAL (Cleanup 반영)\
**기준 시점:** 2026-08-28 00:09 KST\
**기준 프로젝트:**
`/Users/junghasuk/Desktop/ManyLangs/web/youtube/longform`\
**검증 기준 샘플:**
`tmp/v2_reality_test/travel_new_york_city/episode_001`

> 이 문서는 현재 업로드된 `longform(1).zip`의 실제 구조와, EP001에서
> 완료한 검증 결과를 기준으로 작성한 **1차 운영 기준서**다. 앞으로 실제
> 사용 중 문제가 생기면 이 V1을 기준점으로 두고 대화하면서 V2, V3로
> 갱신한다.

------------------------------------------------------------------------

## 1. V1 완료 선언

현재 EP001은 다음 흐름까지 실제 산출물과 검증이 완료됐다.

`Series/Continuity → Script → Dialogue → Learning → Production Scene → Shots → Visual Continuity → VIDU Ready → Manual VIDU Package`

검증된 EP001 수치:

-   Scene: **20**
-   Production Scene: **20**
-   Shot: **65**
-   Visual Continuity: **65**
-   VIDU Ready: **65**
-   Manual VIDU work item: **65**
-   Reference image 연결 Shot: **65/65**
-   Reference 없는 Shot: **0**
-   총 Shot duration: **439초 = 7분 19초**
-   `final_prompt`: **65/65 존재**
-   화면비: **65/65 = 16:9**
-   reference asset JSON 및 실제 이미지: **정상**
-   Manual package manifest 순서: **001/065 \~ 065/065**

**중요:** VIDU는 API 자동 호출이 아니라 **VIDU 웹에서 오프피크 월정액
수동 생성**을 기준으로 한다. 따라서 현재 파이프라인의 자동 설계 종착점은
`05_vidu_ready`, 사람용 작업 종착점은 `06_vidu_manual`이다.

------------------------------------------------------------------------

# 2. 최종 운영 흐름

## A. 시리즈 영구 상태

시리즈 단위로 계속 유지되는 기억이다.

-   `series_bible.json` --- 시리즈 전체 세계관/설정
-   `characters/` --- 지속 등장 캐릭터
-   `locations/` --- 등록된 장소
-   `reference_assets/` --- 캐릭터 등 기준 이미지 연결 정보
-   `continuity_state.json` --- 이전 에피소드에서 다음 에피소드로 넘기는
    이야기 상태
-   `learning_history.json` --- 이전에 사용한 학습 표현 누적 기록

EP001 종료 시 `carry_out`과 Learning History를 커밋하고, EP002 시작 전에
carry-in readiness를 확인한다.

## B. 에피소드 생성

1.  `01_script`
2.  `02_visual`
3.  `03_shots`
4.  `04_visual_continuity`
5.  `05_vidu_ready`
6.  `06_vidu_manual`
7.  VIDU 웹에서 수동 생성
8.  생성 MP4를 정해진 이름으로 저장
9.  후속 편집/TTS/자막/조립 단계로 전달

------------------------------------------------------------------------

# 3. 프로젝트 최상위 폴더 구조

``` text
longform/
├── adapters/
├── assets/
├── config/
├── engines/
├── logs/
├── prompts/
├── publishing/
├── schemas/
├── scripts/
├── series/
└── tmp/
```

현재 `adapters/`, `assets/`, `engines/`, `publishing/`은 업로드본 기준
실질 파일이 없거나 향후 확장용 구조다.

## `config/`

-   `languages.json` --- 언어 관련 공통 설정
-   `naming_rules.json` --- 파일/ID naming 규칙

## `prompts/`

DeepSeek가 각 단계에서 무엇을 생성해야 하는지 정의한다.

### 핵심 생성 프롬프트

-   `20_SERIES_BOOTSTRAP.md` --- 시리즈 bootstrap
-   `21_SERIES_BUILDER.md` --- 시리즈 구조/영구 상태 구축
-   `21_STORY_PLANNER.md` --- 스토리 계획
-   `22_STORY_TARGET.md` --- 스토리 목표
-   `31_MASTER_SCRIPT_PLANNER.md` --- Master Script 계획
-   `32_MASTER_SCRIPT_WRITER.md` --- Master Script 생성
-   `33_DIALOGUE_WRITER.md` --- 장면별 Dialogue 생성
-   `34_TRANSLATION_WRITER.md` --- 번역 생성
-   `35_LEARNING_WRITER.md` --- 학습 표현 생성
-   `36_DIALOGUE_SEMANTIC_VALIDATOR.md` --- Dialogue 의미/구조 검증
-   `37_MASTER_SCRIPT_REALITY_VALIDATOR.md` --- 현실성 검증
-   `37_VISUAL_PRODUCTION_PLANNER.md` --- Production Scene 설계
-   `38_EPISODE_FINAL_VALIDATOR.md` --- 에피소드 최종 검증
-   `38_PRODUCTION_SCENE_FINAL_VALIDATOR.md` --- Production Scene 전체
    검증
-   `39_SHOT_PLANNER.md` --- Scene을 실제 Shot으로 분해
-   `40_VISUAL_CONTINUITY_MANAGER.md` --- Shot 간 외형/위치/소품/연속성
    유지
-   `41_VIDU_PROMPT_COMPILER.md` --- 최종 VIDU-ready prompt 생성

### 다국어 품질 프롬프트

`EVAL_EN/ES/FR/JP/KR/PT/RU/ZH.md`\
각 언어 평가 규칙.

`REVIEW_EN/ES/FR/JP/KR/PT/RU/ZH.md`\
각 언어 리뷰 규칙.

`TRANSLATOR_EN/ES/FR/JP/KR/PT/RU/ZH.md`\
각 언어 번역 규칙.

------------------------------------------------------------------------

# 4. `schemas/` --- JSON 계약

각 단계에서 AI가 아무 JSON이나 만드는 것을 막는 구조 계약이다.

핵심 활성 schema:

-   `common.schema.json` --- 공통 구조
-   `content_request.schema.json` --- 사용자 콘텐츠 요청
-   `series_bootstrap.schema.json` --- bootstrap
-   `series_bible.schema.json` --- 시리즈 바이블
-   `character.schema.json` --- 캐릭터
-   `location.schema.json` --- 장소
-   `reference_asset.schema.json` --- 기준 이미지/asset
-   `continuity_state.schema.json` --- 연속성 기억
-   `learning_history.schema.json` --- 학습 표현 누적 기억
-   `episode.schema.json` --- 에피소드
-   `scene_plan.schema.json` --- Scene 계획
-   `scene.schema.json` --- Scene
-   `master_script.schema.json` --- Master Script
-   `master_script_reality_validation.schema.json` --- Master 현실성
    검증
-   `dialogue.schema.json` --- Dialogue
-   `dialogue_semantic_validation.schema.json` --- Dialogue 의미 검증
-   `learning.schema.json` --- Learning
-   `translation.schema.json` --- 번역
-   `episode_final_validation.schema.json` --- 에피소드 최종 Gate
-   `production_scene.schema.json` --- 영상 제작 Scene
-   `production_scene_final_validation.schema.json` --- Production Scene
    최종 Gate
-   `shot.schema.json` --- Shot
-   `visual_continuity.schema.json` --- Shot 간 visual continuity
-   `vidu_ready.schema.json` --- VIDU 투입 직전 JSON

**운영 원칙:** 활성 schema는 임의 삭제 금지.

------------------------------------------------------------------------

# 5. `scripts/` --- 실행 코드

## 현재 핵심

### `longform_pipeline_v2.py`

현재 V1의 **주 파이프라인**. 가장 중요하다.

현재 연결된 주요 함수:

-   `generate_learning()`
-   `generate_shots()`
-   `generate_visual_continuity()`
-   `generate_production_scene_final_validation()`
-   `generate_vidu_ready()`
-   reference asset resolve/validation
-   각종 schema validation
-   main pipeline

현재 V1 기준 **삭제 금지**.

### `finalize_episode.py`

에피소드 종료 시 continuity 등 persistent state를 다음 에피소드가 사용할
수 있게 finalize하는 역할.

### `build_vidu_manual_package.py`

`05_vidu_ready`를 사람이 VIDU 웹에서 수동 생성하기 쉬운 `06_vidu_manual`
작업 패키지로 변환하는 V1 정식 운영 스크립트다. EP002 이후에도 계속
사용하므로 삭제하지 않는다.

EP001 검증: **65 Shot / 439초 / reference image 65/65 / manifest
001\~065**.

### `assemble_video_lf.py`

생성된 영상/후속 결과를 longform 영상으로 조립하는 후단용 스크립트.

### `voice_pool_b.py`

음성/TTS voice pool 관련 스크립트.

### `outro_cta.png`

영상 후단 CTA 이미지 asset.

## 확인 필요/구버전 가능성이 높은 파일

-   `longform_pipeline.py`
-   `longform_pipeline_v1_backup.py`

V2가 현재 canonical이므로 위 파일은 **즉시 삭제보다는 V1 아카이브 후
제거 후보**로 둔다.

------------------------------------------------------------------------

# 6. 시리즈 구조

현재 테스트/검증 시리즈:

``` text
tmp/v2_reality_test/travel_new_york_city/
├── series_bible.json
├── continuity_state.json
├── learning_history.json
├── characters/
│   └── CHAR_JIEUN_001.json
├── locations/
│   ├── LOC_AIRPORT_TRANSIT_001.json
│   ├── LOC_JFK_AIRPORT_001.json
│   ├── LOC_MANHATTAN_EVENING_STREET_001.json
│   └── LOC_MANHATTAN_HOTEL_001.json
├── reference_assets/
│   ├── ASSET_CHAR_JIEUN_PRIMARY_000001.json
│   └── files/
│       └── jieun_primary.png
└── episode_001/
```

### `series_bible.json`

시리즈 전체 canonical 정보.

### `continuity_state.json`

현재 에피소드 상태와 다음 에피소드로 넘길 story memory.

### `learning_history.json`

중복 학습 표현 방지를 위한 누적 memory. EP001에서 **87 unique
expressions**가 기록됨.

### `characters/CHAR_JIEUN_001.json`

지은의 persistent character 정의.

### `reference_assets/ASSET_CHAR_JIEUN_PRIMARY_000001.json`

`CHAR_JIEUN_001`과 실제 `jieun_primary.png`를 연결한다.

### `reference_assets/files/jieun_primary.png`

VIDU 웹에 직접 업로드할 실제 주인공 기준 이미지.

------------------------------------------------------------------------

# 7. `episode_001/` 상세 구조

``` text
episode_001/
├── episode.json
├── episode_finalize_commit.json
├── learning_history_commit.json
├── continuity_repair_commit.json
├── 01_script/
├── 02_visual/
├── 03_shots/
├── 04_visual_continuity/
├── 05_vidu_ready/
└── 06_vidu_manual/
```

## `episode.json`

EP001 자체 canonical metadata/설정.

## `episode_finalize_commit.json`

에피소드 finalize가 수행됐다는 receipt.

## `learning_history_commit.json`

Learning 결과가 `learning_history.json`에 반영됐다는 receipt.

## `continuity_repair_commit.json`

EP001에서 carry_out → protagonist known_information 누락을 보정했던
기록. **V1 테스트 이력 보존용**이다.

------------------------------------------------------------------------

# 8. `01_script/`

``` text
01_script/
├── content_request.json
├── series_bootstrap.json
├── scene_plan.json
├── master_script.json
├── master_script_reality_validation.json
├── dialogues/
│   └── S001.json ... S020.json
├── dialogue_semantic_validations/
│   └── S001.json ... S020.json
├── learning/
│   └── S001.json ... S020.json
└── episode_final_validation.json
```

### 역할

-   `content_request.json` --- 최초 생성 요청을 구조화
-   `series_bootstrap.json` --- 이번 생성에 필요한 bootstrap 결과
-   `scene_plan.json` --- 20 Scene의 계획
-   `master_script.json` --- 에피소드 전체 스크립트
-   `master_script_reality_validation.json` --- 현실성 Gate 결과
-   `dialogues/Sxxx.json` --- Scene별 실제 대화
-   `dialogue_semantic_validations/Sxxx.json` --- 대화 의미 검증
-   `learning/Sxxx.json` --- Scene별 학습 포인트
-   `episode_final_validation.json` --- script-side episode final gate

------------------------------------------------------------------------

# 9. `02_visual/`

``` text
02_visual/
├── production_scenes/
│   └── S001.json ... S020.json
└── production_scene_final_validation.json
```

### `production_scenes/Sxxx.json`

Master Script를 영상 제작 가능한 Scene 정의로 변환한다.

캐릭터, 장소, 소품, 행동, 환경, visual continuity 기초 정보 등이
들어간다.

### `production_scene_final_validation.json`

20개 Production Scene 전체가 story/script와 맞는지 확인한 최종 Gate.

------------------------------------------------------------------------

# 10. `03_shots/`

``` text
03_shots/
├── S001/
│   ├── SHOT_001.json
│   ├── SHOT_002.json
│   └── SHOT_003.json
├── ...
└── S020/
```

EP001 총 **65개**.

각 Shot JSON은:

-   scene/shot ID
-   sequence
-   duration
-   location
-   등장 actor
-   action start/end state
-   camera
-   dialogue alignment
-   prop
-   continuity carry-in
-   canonical constraints

등을 정의한다.

**이 폴더부터 영상 생성 단위가 Scene이 아니라 Shot이다.**

------------------------------------------------------------------------

# 11. `04_visual_continuity/`

`03_shots`와 **정확히 1:1, 65개**다.

각 파일은 해당 Shot의:

-   캐릭터 appearance
-   hair
-   clothing
-   carried items
-   body state
-   emotion
-   location state
-   prop state
-   previous/next Shot 연결
-   identity/story/timeline lock

을 고정한다.

목적은 VIDU에서 Shot마다 지은의 얼굴, 옷, 가방, 장소, 위치 등이 제멋대로
바뀌는 것을 최대한 억제하는 것이다.

------------------------------------------------------------------------

# 12. `05_vidu_ready/`

`03_shots`, `04_visual_continuity`와 **정확히 1:1, 65개**.

예:

``` text
05_vidu_ready/S001/SHOT_001.json
```

핵심 필드:

-   `generation.duration_seconds`
-   `generation.aspect_ratio`
-   `generation.resolution`
-   `actors`
-   `reference_asset_ids`
-   `location`
-   `props`
-   `prompt.final_prompt`
-   `negative_constraints`
-   `continuity`

**V1에서 AI/JSON 설계의 최종 산출물.**

API 제출 payload가 아니다. VIDU 웹 수동 생성의 source-of-truth다.

------------------------------------------------------------------------

# 13. `06_vidu_manual/`

사람이 VIDU 웹에서 작업하기 쉽게 만든 최종 작업 패키지.

``` text
06_vidu_manual/
├── _references/
│   └── jieun_primary.png
├── S001/
│   └── SHOT_001.txt ...
├── ...
├── S020/
│   └── SHOT_003.txt
├── manifest.json
└── CHECKLIST.txt
```

총 파일 기준:

-   Shot 작업 TXT: **65**
-   reference image: **1**
-   manifest: **1**
-   checklist: **1**
-   합계: **68 files**

### 각 `SHOT_xxx.txt`

VIDU 수동 입력에 필요한 것만 제공:

-   작업 순서
-   Scene
-   Shot
-   duration
-   aspect ratio
-   resolution
-   reference image
-   `final_prompt`
-   negative/do-not-change notes
-   출력 MP4 파일명

### `manifest.json`

65 Shot의 machine-readable 작업 목록.

### `CHECKLIST.txt`

사람이 생성 완료 여부를 체크하기 위한 65 Shot 목록.

### `_references/jieun_primary.png`

VIDU 웹에 직접 올리는 reference image 사본.

------------------------------------------------------------------------

# 14. VIDU 수동 작업 절차

각 Shot마다:

1.  `06_vidu_manual/CHECKLIST.txt`에서 다음 미완료 Shot 확인.
2.  해당 `Sxxx/SHOT_xxx.txt` 열기.
3.  `_references/jieun_primary.png`를 reference image로 사용.
4.  `PROMPT`를 VIDU에 입력.
5.  `NEGATIVE / DO-NOT-CHANGE NOTES`를 확인하여 생성 결과 검수.
6.  duration을 해당 TXT 값에 맞춘다.
7.  16:9 / 1080p 기준 사용.
8.  결과를 `Sxxx_SHOT_xxx.mp4`로 저장.
9.  CHECKLIST 완료 표시.
10. 얼굴/의상/소품/장소/행동/카메라가 심하게 틀리면 재생성.
11. 애매한 Shot은 임의로 구조를 바꾸지 말고 대화에서 해당
    `SHOT_xxx.txt`와 결과를 함께 검토.

**운영 원칙:** 생성 중 문제가 생겼을 때 전체 pipeline을 다시 설계하지
않는다. 해당 Shot과 바로 이전/다음 Shot의 `03_shots`,
`04_visual_continuity`, `05_vidu_ready`를 기준으로 국소 수정한다.

------------------------------------------------------------------------

# 15. EP001 → EP002 기억 전달

EP001에서 확인된 persistent memory:

-   `continuity_state.json`
-   `learning_history.json`
-   protagonist `CHAR_JIEUN_001`
-   protagonist reference asset
-   EP001 finalize receipt
-   EP001 learning commit receipt

EP001 carry_out은 protagonist known information에 반영되었고, EP002
carry-in readiness 검증에서 **errors: 0 / READY**를 통과했다.

따라서 EP002는 EP001의 스토리 기억과 87개 Learning expression history를
이어받아 시작하는 구조다.

------------------------------------------------------------------------

# 16. Cleanup 완료 후 현재 상태

2026-08-28 00:09 KST 기준으로 V1 개발 과정의 불필요한 과거
백업/디버그/테스트 파일을 정리했다.

삭제 완료: `scripts/`·`prompts/`·`schemas/`의 과거 `bak/before` 파일,
`schemas/_backup_before_registry/`, `logs/v2_debug/`, `tmp/v2_test/`,
`episode_001/_debug/`, `episode_001/_finalize_backup/`, `.DS_Store`,
캐릭터 임시 백업, Downloads의 `final_fix_confirmed.txt`와
`cleanup_longform_v1_safe.sh`.

Cleanup 후 검증 상태:

``` text
Production Scenes: 20
Shots: 65
Visual Continuity: 65
VIDU Ready: 65
VIDU Manual TXT: 65

PASS: longform_pipeline_v2.py
PASS: finalize_episode.py
PASS: build_vidu_manual_package.py
```

------------------------------------------------------------------------

# 17. 의도적으로 보존하는 history backup

``` text
tmp/v2_reality_test/travel_new_york_city/_history_backup/
├── continuity_state.before_ep001_repair_20260827_145004.json
└── learning_history.before_ep001_20260827_144029.json
```

이는 불필요한 개발 백업이 아니라 EP001 persistent-state 확정 과정의 복구
지점이다. V1에서는 보존한다.

------------------------------------------------------------------------

# 18. 현재 정식 실행 스크립트

``` text
scripts/
├── longform_pipeline_v2.py
├── finalize_episode.py
├── build_vidu_manual_package.py
├── assemble_video_lf.py
└── voice_pool_b.py
```

핵심 역할은 `longform_pipeline_v2.py`가 DeepSeek 기반 전체 설계/JSON
생성, `finalize_episode.py`가 에피소드 종료 후 persistent state
finalize, `build_vidu_manual_package.py`가
`05_vidu_ready → 06_vidu_manual` 변환이다.

------------------------------------------------------------------------

# 19. VIDU Manual Package 생성

``` bash
cd /Users/junghasuk/Desktop/ManyLangs/web/youtube/longform

python3 scripts/build_vidu_manual_package.py \
  --series-dir tmp/v2_reality_test/travel_new_york_city \
  --episode-number 1
```

EP001 검증 결과는 **65 Shot, 439초(7.32분)**이다. VIDU는 API 자동 호출이
아니라 **웹 수동 작업 / 오프피크 월정액 무제한 운영**을 기준으로 한다.

------------------------------------------------------------------------

# 20. 현재 삭제 정책

Cleanup은 완료됐다. **이제 추가적인 일괄 삭제는 하지 않는다.**

특히 `scripts/` 핵심 실행 파일, 활성 `prompts/`, 활성 `schemas/`,
`series_bible.json`, `continuity_state.json`, `learning_history.json`,
`characters/`, `locations/`, `reference_assets/`, EP001의
`01_script`부터 `06_vidu_manual`까지의 생산 산출물, commit receipt,
`_history_backup/`은 삭제하지 않는다.

------------------------------------------------------------------------

# 21. V1 핵심 재검증 명령

``` bash
cd /Users/junghasuk/Desktop/ManyLangs/web/youtube/longform

python3 -m py_compile scripts/longform_pipeline_v2.py &&
python3 -m py_compile scripts/finalize_episode.py &&
python3 -m py_compile scripts/build_vidu_manual_package.py &&
echo "PASS: V1 CORE SCRIPTS"
```

남은 backup-like 파일 확인:

``` bash
find . \
  \( -name '*.bak*' -o -name '*backup*' -o -name '*before_*' \) \
  -print
```

V1 기준 정상 상태는 `_history_backup`과 그 내부 persistent-state 복구
파일만 나타나는 것이다.

------------------------------------------------------------------------

# 22. V1 사용 중 문제 발생 시 대화에 가져올 자료

## Script 문제

해당:

``` text
01_script/master_script.json
01_script/dialogues/Sxxx.json
01_script/learning/Sxxx.json
```

## Shot 구성이 이상함

``` text
02_visual/production_scenes/Sxxx.json
03_shots/Sxxx/SHOT_xxx.json
```

## 얼굴/옷/소품/위치 continuity 문제

``` text
03_shots/Sxxx/SHOT_xxx.json
04_visual_continuity/Sxxx/SHOT_xxx.json
05_vidu_ready/Sxxx/SHOT_xxx.json
```

그리고 가능하면 바로 이전 Shot과 다음 Shot도 같이 본다.

## VIDU prompt 문제

가장 먼저:

``` text
06_vidu_manual/Sxxx/SHOT_xxx.txt
```

필요하면 원본:

``` text
05_vidu_ready/Sxxx/SHOT_xxx.json
```

## EP002에서 EP001 기억이 사라짐

``` text
series_bible.json
continuity_state.json
learning_history.json
episode_001/episode_finalize_commit.json
episode_001/learning_history_commit.json
```

------------------------------------------------------------------------

# 23. V1 핵심 운영 원칙

1.  **`longform_pipeline_v2.py`가 현재 canonical pipeline이다.**
2.  AI 출력의 ID/구조적 사실은 가능한 한 시스템 코드에서 canonical
    lock한다.
3.  모든 단계는 schema를 통과해야 다음 단계로 간다.
4.  Scene은 20개, 실제 영상 생성 단위는 Shot이다.
5.  EP001은 65 Shot이며 Shot/Visual/VIDU-ready가 1:1이어야 한다.
6.  Persistent protagonist는 reference asset을 계속 유지한다.
7.  Episode 종료 후 continuity와 learning history를 다음 편에 넘긴다.
8.  VIDU API 자동화는 현재 범위가 아니다.
9.  VIDU 웹 수동 생성은 `06_vidu_manual`을 기준으로 한다.
10. 생성 중 특정 Shot이 실패하면 전체 설계를 뜯지 않고 **해당 Shot
    중심으로 국소 수정**한다.
11. V1 안정화 후에만 백업과 debug를 정리한다.
12. 구조 변경 전에는 항상 V1 snapshot 또는 Git commit을 만든다.

------------------------------------------------------------------------

# 24. 현재 V1 기준 최종 판단

**설계/JSON 측:** 완료\
**EP001 persistent memory:** 완료\
**EP002 carry-in readiness:** 완료\
**Shot backend:** 65/65 완료\
**VIDU-ready:** 65/65 완료\
**수동 VIDU package:** 65/65 완료\
**VIDU manual package builder 정식 편입:** 완료\
**불필요 backup/debug/test cleanup:** 완료\
**V1 핵심 스크립트 compile:** 완료\
**실제 VIDU 영상 생성:** 이제 시작할 단계

따라서 이 문서를 **ManyLangs Longform Pipeline V1.0 FINAL 기준선**으로
사용한다.
