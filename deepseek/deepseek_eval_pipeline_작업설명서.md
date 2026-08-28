# ManyLangs deepseek 평가/재검수 프롬프트 다국어 확장 — 작업 설명 및 사용설명서

대상 경로: `/Users/junghasuk/Desktop/ManyLangs/web/deepseek`
작업일: 2026-08-28

---

## 1. 작업 배경

기존 grammar/idiom/voca/conversation 4개 시리즈의 DeepSeek 평가(채점)·재검수 프롬프트는
**kr/en 2개 언어 target판만** 존재했고, 파일명도 `{series}_{lang}_평가프롬프트_v1.md`처럼
버전 넘버가 붙어 있었다. 그런데:

- 번역 파이프라인에 **ru(러시아어)**가 새 언어로 추가되면서, 재검수 단계도 kr/en뿐 아니라
  ru를 포함한 전체 언어를 지원해야 하는 상황이 됨
- pt 컬럼의 지역 표준이 **pt-PT(유럽 포르투갈어) → pt-BR(브라질 포르투갈어)**로 확정됨
- es/fr/pt/zh/jp도 이제 각 시리즈에서 target(원문 생성 기준 언어)이 될 수 있어야 함
- 각 시리즈의 `*_eval_pipeline.py`가 새 파일명 규칙을 자동으로 찾도록 수정 필요

이번 작업은 위 4가지를 5개 시리즈(grammar/idiom/voca/real/conversation) 전체에 반영했다.

---

## 2. 무엇이 바뀌었나 (핵심 요약)

| 항목 | 이전 | 이후 |
|---|---|---|
| 평가 프롬프트 파일명 | `grammar_kr_평가프롬프트_v1.md` 등 (버전 넘버 포함, kr/en만) | `EVAL_{LANG}.md` (버전 넘버 없음, 8개 언어) |
| 재검수 프롬프트 파일명 | `grammar_kr_재검수프롬프트_v1.0.md` 등 | `REVIEW_{LANG}.md` |
| 지원 target 언어 | kr, en (2개) | kr, en, es, fr, pt, zh, jp, ru (8개) — real은 언어 무관 단일판 |
| pt 지역 표준 | 혼재 (일부 pt-PT, 일부 pt-BR) | **전 시리즈 pt-BR로 통일** |
| `--target-lang` 선택지 | `["kr", "en"]` | `["kr","en","es","fr","pt","zh","jp","ru"]` |
| `--prompt-file` 기본값 | `{series}_{target-lang}_평가프롬프트_v버전.md` | `EVAL_{TARGET-LANG 대문자}.md` |

---

## 3. 시리즈별 상세

### 3-1. grammar (문법)
- `EVAL_KR/EN/ES/FR/PT/ZH/JP/RU.md` + `REVIEW_KR/EN/ES/FR/PT/ZH/JP/RU.md` (총 16개) 신규 작성
- 10개 평가 영역 구조·가중치는 기존과 동일하게 유지
- ru 추가로 "6개 비-미러 언어 대조 검증" → **7개 언어 대조**로 전 target판에서 갱신
- 언어별 규칙 신규 작성: ru 어체 일관성(ты/Вы), 성별·인칭 일치(과거시제 동사 어미 -л/-ла/-ло), 표기(키릴/격변화)
- pt는 pt-BR 표준으로 통일 (기존 "es-ES/fr-FR/pt-PT 본토 표준" → pt만 pt-BR로 교체)

### 3-2. idiom (관용구)
- 동일하게 16개 파일 신규 작성
- **탈이디엄화(de-idiomatization) 검증 지점 수가 언어 확장에 따라 자동 재계산됨**:
  5개 이디엄 × 6개 언어 × 6필드 = 180개 → **5 × 7개 언어 × 6필드 = 210개 지점**
- kr/en은 기존 pivot 구조(en 경유 번역) 설명을 유지, 새 target(es/fr/pt/zh/jp/ru)은
  "번역 경로와 무관하게 최종 결과물 품질만 채점" 방식으로 일반화 서술
  (해당 언어들의 실제 GENERATOR/TRANSLATOR 파일이 아직 없어 임의로 단정하지 않음)

### 3-3. voca (어휘)
- 동일하게 16개 파일 신규 작성
- 언어유형론(LANG_GROUP) 신규 정의:
  - es: 로망스 pro-drop (주어 생략 가능)
  - fr: 로망스, 주어 필수
  - pt-BR: 혼합형, 주어 명시 경향
  - zh: 고립어, topic-drop
  - jp: 교착어 SOV, kr과 동일 어군 특성
  - ru: 격변화 기반, 비교적 자유 어순
- 도메인 ④(문법·표기 정확성)에 "Rule {LANG}-01" 형태로 주어 생략/필수 규칙을 통합 배치
  (기존 kr/en판은 이 규칙이 서로 다른 도메인에 흩어져 있었는데 구조를 정리함)
- 재검수 프롬프트에 남아있던 GPT 대화 복붙 잔여물("네. **KR-target 재검수...**")과
  깨진 코드펜스를 정리

### 3-4. real (사진 기반 묘사문)
- **target/미러 개념이 없는 유일한 시리즈** — 언어별 파일 분리 없이 `EVAL_ALL.md` /
  `REVIEW_ALL.md` 2개 파일로 통일
- 8번째 언어로 ru 추가 (en/es/fr/pt/jp/zh/kr/ru, 8개 언어 전부 직접 번역)
- **pt 표준을 pt-PT 고정 → pt-BR 고정으로 전환** — 이전엔 브라질식 표현이 "오염"으로
  간주됐는데, 지금은 반대로 유럽식(enclisis, está a + 부정사 등)이 위반 대상
- 업스트림 QA 단계 프롬프트인 `real_검수프롬프트_v1.1.md`는 평가/재검수와 다른 단계라
  손대지 않고 그대로 유지

### 3-5. conversation (회화)
- 이 시리즈만 실제 프로덕션 `prompts/` 폴더에 8개 언어 EVAL/REVIEW가 **이미 완성되어
  있었음** — 해당 파일을 그대로 복사해왔고, 신규 작성하지 않음
- 작업 중 발견한 버그 수정: `TRANSLATOR_PT.md`가 v2.0에서 이미 pt-BR로 전환됐는데,
  `EVAL_PT.md` / `REVIEW_PT.md` / `REVIEW_PROMPT.md`에는 "TRANSLATOR_PT.md는 아직
  pt-PT"라는 낡은 전제가 남아 있어 지금 상태에 맞게 수정함
  (이 3개 파일은 실제 프로덕션 prompts 폴더에도 별도로 반영 완료됨 — 2번 항목 참고)

---

## 4. 사용설명서

### 4-1. 공통 실행 패턴 (grammar / idiom / voca / conversation)

```bash
export DEEPSEEK_API_KEY=sk-xxxx

python deepseek_eval_pipeline.py \
    --root "/Users/junghasuk/Desktop/ManyLangs/web/firebase/grammar generator/data" \
    --target-lang kr \
    --prompt-dir "/Users/junghasuk/Desktop/ManyLangs/web/deepseek/grammar"
```

- `--target-lang` : `kr | en | es | fr | pt | zh | jp | ru` 중 하나 (필수) — 이 root 폴더
  전체가 어느 언어를 target(원문)으로 하는지 지정
- `--prompt-dir` : `EVAL_{LANG}.md` / `REVIEW_{LANG}.md`가 있는 폴더. 기본값은 스크립트와
  같은 폴더(`.`)이므로, 각 시리즈 폴더 안에서 그냥 실행하면 별도 지정 없이도 동작함
- `--prompt-file` : 평가 프롬프트 파일명을 직접 지정하고 싶을 때만 사용. 생략하면
  `EVAL_{target-lang 대문자}.md`가 자동으로 선택됨 (예: `--target-lang ru` → `EVAL_RU.md`)
- `--batch` : 특정 batch만 (예: `--batch 001,010-015`)
- `--dry-run` : API 호출 없이 스캔 결과만 확인
- `--pass-threshold` (기본 80), `--review-threshold` (기본 85)

새 언어(es/fr/pt/zh/jp/ru)로 채점하려면 `--target-lang` 값만 바꾸면 되고, 프롬프트
파일은 자동으로 `EVAL_ES.md` / `EVAL_FR.md` 등으로 전환된다.

**idiom, voca, conversation도 명령어 형태는 동일** (각 폴더의 `deepseek_eval_pipeline.py`
또는 `conversation_eval_pipeline.py` 실행).

### 4-2. real (언어 무관 단일판)

`--target-lang`이 필요 없다.

```bash
python real_eval_pipeline.py \
    --root "/Users/junghasuk/Desktop/ManyLangs/web/firebase/real generator/data" \
    --prompt-dir "/Users/junghasuk/Desktop/ManyLangs/web/deepseek/real"
```

기본 프롬프트 파일은 `EVAL_ALL.md`로 자동 설정된다.

### 4-3. 채점 후 재검수 흐름 (모든 시리즈 공통)

1. 위 명령어로 배치 전체를 채점하면, 터미널 마지막에 `final_score < review-threshold`인
   배치들이 "재검수 요청 블록"으로 출력된다.
2. 이 블록을 그대로 복사해서 해당 언어의 `REVIEW_{LANG}.md`(real은 `REVIEW_ALL.md`)를
   시스템 프롬프트로 쓰는 새 대화(Claude/GPT 등)에 붙여넣는다.
3. 결과로 나온 Python dict 리터럴(`ALL_REPLACEMENTS`)을 각 시리즈의 `*_review.py`
   (grammar_review.py, idiom_review.py, voca_review.py, real_review.py,
   review_conversation.py 등, 파이프라인 밖의 별도 스크립트)에 붙여넣어 실제 파일에 반영한다.
4. 같은 배치를 `--batch` 옵션으로 다시 채점해 PASS 여부를 재확인한다.

---

## 5. 주의사항 / 손대지 않은 것

- **`pipeline_semantic_axis_gate.py` (voca)**: kr/en 전용 의미충돌 단어 사전 코드로,
  실제 언어 데이터가 필요해 임의로 es/fr/pt/zh/jp/ru 단어를 채워 넣지 않았다. 새 언어는
  이 보조 하드게이트 없이도 `EVAL_*.md`의 ②-1~②-3(의미축·감정색채·문장교체 테스트)이
  LLM 판단으로 동일하게 커버한다. 실제 문제 사례가 쌓이면 이 사전에 추가하는 방식으로
  기존과 동일하게 확장하면 된다.
- **`real_검수프롬프트_v1.1.md`**: eval_pipeline이 쓰는 평가/재검수 프롬프트가 아니라
  그 이전 단계(GPT/Claude 교차검수, QA)의 프롬프트라 이번 작업 범위 밖.
- **알려진 기존 버그(미수정)**: `real` 시리즈의 `EXPECTED_WEIGHT_SUM = 105`
  (20+15+10+10+10+5+10+5+10+10)인데, `EVAL_ALL.md` 자체 확인 문구는 "weight 합이
  100인가"로 되어 있다. 이번 언어 확장 작업과 무관한 기존 불일치라 손대지 않았다 —
  필요하면 다음에 별도로 정리 가능.
- **GENERATOR/TRANSLATOR 파일**: 이번 작업은 평가·재검수 단계만 다뤘다. es/fr/pt/zh/jp를
  grammar/idiom/voca의 target으로 실제 생성하려면 `GENERATOR_{LANG}.md` /
  `TRANSLATOR_{LANG}.md` 원문 생성 파이프라인 자체가 별도로 필요하다 (conversation
  시리즈에는 이미 있음).

---

## 6. 검증 완료 항목

- 5개 시리즈의 `*_eval_pipeline.py` / `real_eval_pipeline.py` 전부 `ast.parse` 구문 검사 통과
- 각 스크립트 `--dry-run` 스모크 테스트 통과 (임의 target-lang 값으로 실행 확인)
- macOS 압축 과정에서 생긴 유니코드 파일명(NFD) 깨짐 현상을 NFC로 정규화 완료
- 최종 파일 개수 검증: grammar/idiom/voca/conversation 각 16개(EVAL 8 + REVIEW 8) +
  real 2개 = **총 66개**
