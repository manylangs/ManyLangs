# ManyLangs 성별 검수기 — 사용설명서

최종 업데이트: 2026-08-28 (v4.1: real 시리즈 파싱 버그 수정 + 경로 검증 추가)

---

## 1. 개요

DeepSeek API를 이용해 ManyLangs 콘텐츠(conversation/grammar/idiom/voca/real)의
문법적 성별(gender) 오류를 자동 검수하고, 확정된 수정안을 실제 파일에 반영하는 도구.
쇼츠 파이프라인(SRT 기반, y모드)과 5종 최종 합본 JSON(n모드)을 **하나의 검수기**로
전부 다룬다 — 콘텐츠 종류나 파이프라인 단계에 따라 다른 도구를 쓸 필요가 없다.

**핵심 설계 원칙**
- 실행 시작 시 입력 데이터가 어느 단계인지(분리형/쇼츠 vs 최종 합본) 한 번만 물어봐서 분기
- 그 다음은 폴더 이름이나 파일명 규칙에 의존하지 않고, 파일명 패턴/경로/실제 JSON
  구조를 보고 자동 판별
- LLM 판정은 실행마다 결과가 달라질 수 있어(비결정성), 여러 번 반복 실행 후 다수결로
  합의된 것만 자동 반영 대상으로 삼음
- 최종 반영 전에는 항상 사람이 한 번 더 확인하는 단계를 둠 (dry-run 기본값,
  대화창 검토 등)

---

## 2. 구성 파일

| 파일 | 역할 |
|---|---|
| `gender_audit.py` | 메인 스크립트. 단계 분기, 경로 검증, 파일 탐색, 파싱, 판정 실행, 리포트 생성 |
| `gender_audit_llm.py` | DeepSeek API 호출 로직 + 판정 프롬프트 |
| `gender_fix.py` | 확정된 수정안을 실제 SRT/JSON 파일에 반영 |

---

## 3. 설치 (최초 1회)

```bash
pip install requests --break-system-packages   # 이미 설치돼 있을 수 있음
export DEEPSEEK_API_KEY="sk-..."
```

---

## 4. 실행 시작 시 물어보는 것 — 경로 + 입력 단계 분기

### 4.1 경로 (v4.1: 존재 여부 자동 검증 신규)

경로를 입력하면 먼저 **실제로 존재하는 폴더인지 검증**한다. 존재하지 않으면
(예: 절대경로 대신 폴더명만 입력했거나 오타가 있는 경우) 바로 아래처럼
오류를 보여주고 다시 물어본다 — 예전에는 이 경우 조용히 "0개 그룹 발견"으로
넘어가서 원인 파악이 어려웠다.

```
[오류] 경로가 존재하는 폴더가 아닙니다: a1_знакомство
       (상대경로를 입력했다면 현재 작업 디렉토리 기준으로 해석됩니다.
        현재 작업 디렉토리: /Users/junghasuk/Desktop/ManyLangs/web/firebase/genderchecker)
       절대경로(/로 시작)를 입력했는지 다시 확인하세요.
검사할 폴더의 절대경로를 다시 입력하세요:
```

**항상 `/`로 시작하는 절대경로를 입력할 것.** `cd`로 대상 폴더까지 이동한 뒤
폴더명만 입력하면(상대경로) genderchecker 실행 위치 기준으로 해석되어 엉뚱한
곳을 찾게 된다. `--path`로 비대화형 지정 시 존재하지 않는 경로면 재입력 없이
바로 종료됨(exit code 1) — 스크립트/자동화에서 조용히 넘어가지 않도록.

### 4.2 입력 단계 분기 — y/n

경로 다음으로 아래 질문을 한 번 물어봄 (`--mode y` / `--mode n`으로
비대화형 지정도 가능):

```
전체 JSON 합성 전입니까? [y/n]:
```

| 답 | 의미 | 내부 동작 |
|---|---|---|
| `y` | **쇼츠 파이프라인 출력물** 등 아직 언어별로 파일이 쪼개져 있거나 SRT인 **분리형** 데이터 | 기존 로직 그대로: `target.json`/`en.json`/`es.json`... 형제파일 그룹핑 + SRT 그룹핑 |
| `n` | merge.py 등을 거쳐 **파일 하나에 8~9개 언어가 이미 합쳐진 최종본**(5종 시리즈 합본 JSON) | 상위 언어 폴더(`en`, `kr`, ...)에서 target을 확정하고, 파일 내부의 언어맵을 바로 세그먼트로 변환 |

`n` 모드는 conversation뿐 아니라 grammar/idiom/voca/real 전부 동일한 방식으로
처리됨 (내부적으로 `build_segments_core()`라는 공통 로직을 공유).

---

## 5. 지원하는 파일 형식 (자동 인식)

### 5.1 y모드 — SRT (검증됨 ✅ — 실전 완주, 쇼츠 파이프라인 산출물)
자막 파일. `{prefix}.{lang}.srt` (점 구분) 패턴을 자동 탐지.
`.all.srt`는 언어 코드가 아니므로 자동 제외.

예: `a1_인사.es.srt`, `a1_인사.target.srt`

화자는 큐 번호 홀짝으로 결정 (1·3·5=A=여성, 2·4·6=B=남성).

**2026-08-27 기준 실전 검증 완료**: 발견 → 3회 반복 판정 → 합의 집계 →
사람 검토 → `gender_fix.py` 반영 → 결과 확인까지 전체 파이프라인 완주.
`en`/`kr` target 두 책, 4개 세트, 6개 파일 8곳 수정 완료.

**주의**: 쇼츠 폴더(`youtube/conversation/{lang}/{topic}/` 등)를 y모드로
돌렸는데 "JSON 그룹 0개 / SRT 그룹 0개 발견"이 뜨면, 대부분 코드 문제가
아니라 **경로 문제**다 (4.1절의 경로 검증이 이제 이 상황을 바로 잡아줌).
그래도 절대경로가 맞는데 0개가 뜬다면, 그 폴더의 SRT 파일명이
`{prefix}.{lang}.srt` 패턴과 실제로 다른지 `ls`로 직접 확인할 것.

### 5.2 y모드 — JSON 통합형 단일파일 (검증됨 ✅, conversation만)
파일 하나에 모든 언어가 `blocks[].lines[].sentences = {lang: text, ...}` 형태로
들어있는 방식. 폴더/파일명 상관없이 구조만 보고 자동 인식.

### 5.3 y모드 — JSON 분리형 (코드는 있으나 실전 미검증 ⚠️)
언어별로 파일이 나뉜 방식. 두 가지 파일명 패턴을 모두 지원:
```
{id}-{lang}.json / {id}-{lang}.draft.json / {id}-{lang}.compact.json
```
`target.json`과 각 언어 파일의 텍스트 유사도로 소스언어를 자동 판별.
**아직 실제 API 호출까지 끝까지 테스트한 적 없음.**

### 5.4 n모드 — 최종 합본 JSON (실전 프로덕션 폴더에서 discovery 검증 완료 ✅, 5종 전부)
경로 예시:
```
{base}/conversation/en/a1/001/data/conversation_001.runtime.json   → target=en
{base}/conversation/kr/a1/001/data/conversation_001.runtime.json   → target=kr
{base}/grammar/en/...                                              → 동일 방식
{base}/idiom/en/...
{base}/voca/en/...
{base}/real/en/...
```
상위 폴더의 2자리 언어 폴더(`en`, `kr`, `es`, ...)가 target을 확정하고,
각 JSON 내부의 언어맵에서 바로 세그먼트를 뽑아낸다.

**안전장치**: 경로에서 얻은 target을 무조건 믿지 않고, 그 JSON 내부에 실제로
해당 언어 키가 있는지 검증한다(`contains_target_lang`). 없으면 그 파일은
API로 보내지 않고 `SOURCE_LANG_MISSING`이라는 구조 오류로 분리해서 실행
끝에 별도 목록으로 출력한다. 그 외 `NO_BLOCKS`(blocks 없음),
`UNKNOWN_CONTENT_TYPE`(콘텐츠타입 판별 실패), `PARSE_ERROR`(JSON 파싱 실패)도
같은 방식으로 분리됨.

**중요 — real 시리즈는 JSON 내부에 target 언어 표기가 없다**: real의
`meta.targetLang`은 항상 `null`이고, 이건 정상이다. n모드는 real도 다른
4개 시리즈와 마찬가지로 **경로의 언어 폴더**(`real/en/...` → target=en)로
target을 결정하므로 `meta.targetLang`은 아예 보지 않는다. real은 JSON
내부 구조도 다르다 — 문장이 `sentences[].texts.{lang}`처럼 `texts`라는
래퍼로 한 번 더 감싸져 있음:
```json
"sentences": [
  {"texts": {"kr": "...", "en": "...", "es": "...", ...}},
  {"texts": {"kr": "...", "en": "...", "es": "...", ...}}
]
```
(2026-08-28 수정) 언어맵 추출 헬퍼(`extract_lang_texts`)가 이 `texts` 래퍼를
자동으로 풀어내도록 고쳐서, real도 conversation/grammar/idiom/voca와 동일한
방식으로 파싱된다. **수정 전에는 real만 파일 발견은 되는데(예: 240개) 세그먼트
파싱이 0개로 나오는 버그가 있었음 — 지금은 고쳐진 상태.**

**voca의 중첩 구조**(`word: {lang: {core, meaning_zone}}`)까지 포함해서
언어맵 추출이 되도록 만들어짐 — conversation의 `sentences`, idiom의
`explanation`/`examples`, real의 `sentences[].texts`, grammar의 `sentences`,
voca의 `word`/`examples` 전부 같은 헬퍼(`extract_lang_texts`)로 처리.

**현재까지 검증한 것**:
- discovery + target 판별: **실제 프로덕션 폴더**(conversation 120개 en/kr,
  grammar/idiom/voca/real 각 시리즈, 총 1,097개 JSON 파일, 21,685개 세그먼트)로
  `--dry-run` 실행 완료. 5종 전부 구조 오류 없이 target 판별 및 세그먼트
  변환 성공.
- real 파싱 버그: 실제 프로덕션 real 파일 구조로 재현 → 수정 → 재검증 완료.
- **아직 API 호출(`--full-report` 등 실제 LLM 판정)까지 끝낸 시리즈**:
  conversation(en/kr, 3회 검수 진행 중), 나머지는 진행 예정.

### 5.5 콘텐츠타입 자동판별 (구조 기반, 폴더명 무관)
| 판별 조건 | 콘텐츠타입 |
|---|---|
| `blocks[].lines[].speaker` 존재 | conversation |
| `blocks[].type` in (grammar_explanation, grammar_example) | grammar |
| `blocks[].expression` 존재 | idiom |
| `blocks[].word` 존재 | voca |
| `blocks[].type` == description/image | real |

grammar/idiom/voca/real은 화자 고정 캐릭터가 없는 narrator형으로 처리
(원문 성별 명시 여부에 따라 대조 또는 내적 일관성만 확인).

---

## 6. 성별표시 언어

핵심 5개(문법적 성 있음): `es, fr, pt, it, ru`
부분 해당: `de`
해당 없음(검사 대상 제외, 문맥 참고용으로만 사용): `en, kr, zh, jp`

파일에 실제로 존재하는 언어 컬럼과 위 목록의 교집합만 검사 대상이 됨
(하드코딩 아님 — 언어가 나중에 merge되어도 코드 수정 불필요. ru도 이 방식으로
8번째 언어로 추가됨).

---

## 7. 실행 방법

### 7.1 기본 실행 (이슈만 골라서 출력)
```bash
cd genderchecker
python3 gender_audit.py                                   # 대화형: 절대경로 + y/n 둘 다 입력받음
python3 gender_audit.py --path <절대경로> --mode y           # 쇼츠/분리형/SRT, 비대화형
python3 gender_audit.py --path <절대경로> --mode n           # 5종 최종 합본형, 비대화형
python3 gender_audit.py --path <절대경로> --mode n --dry-run  # API 호출 없이 구조만 확인 (무료)
```
`<절대경로>`는 반드시 `/`로 시작해야 함 (4.1절 참고 — 아니면 바로 오류로
잡아냄).

결과: `review_{timestamp}.json` (전체 판정 결과) +
`review_{timestamp}.fix_candidates.txt` (사람이 검토할 수정 후보,
low confidence·OLD=NEW·언어오염·빈값 자동 필터링됨)

**주의**: 이 모드는 LLM이 실행마다 다른 결과를 낼 수 있음(비결정성 확인됨).
중요한 폴더는 7.2의 반복+합의 모드를 권장.

### 7.2 전체판정 + 반복 합의 모드 (권장 ✅)
```bash
python3 gender_audit.py --path <절대경로> --mode n --full-report --repeat 3
```
- PASS/FIX 상관없이 성별표시 언어가 있는 모든 세그먼트에 대해 판정
- 3회 독립 실행 후 (파일,CUE,언어) 단위로 합의 집계
- 만장일치 FIX + 제안값도 완전히 일치 → 자동으로 최종 반영 후보에 포함
- 엇갈린 판정("불안정") → 사람이 반드시 직접 확인

결과 4종 생성:
```
full_report_{ts}_run1.txt / run2.txt / run3.txt   ← 각 회차 원본 (감사 추적용)
full_report_{ts}_consensus.txt                     ← PASS 만장일치는 생략,
                                                       FIX/불안정만 회차별 비교 (이걸 대화창에 붙여서 같이 검토)
full_report_{ts}_fix_candidates.txt                 ← 3회 다 FIX + 제안값 일치하는 것만 자동 포함
                                                       (바로 gender_fix.py에 넣어도 비교적 안전)
```

**중요**: `consensus.txt`의 "만장일치 FIX"도 반드시 안전한 건 아님 (예: 제안값이
원문과 동일해서 실질적 수정이 없는 경우가 실제로 있었음). 최종 반영 전
`final_fix_confirmed.txt` 같은 파일을 사람이 직접 만들어서 재확인하는 걸 권장.

### 7.3 배치 크기 조절
```bash
python3 gender_audit.py --path <절대경로> --mode n --batch-size 40   # 기본 25 (full-report는 15로 고정)
```

### 7.4 대규모 전체 실행 시 참고 (비용/시간 감안)
`--full-report`는 배치 크기가 15로 고정된다. 예를 들어 21,685개 세그먼트를
한 번에 돌리면 대략 1,446회 API 호출 × 3회 반복(`--repeat 3`) = 약 4,340회
호출이 발생한다. 처음부터 전체를 돌리기보다, 시리즈별/레벨별로 나눠서
소규모로 먼저 검증한 뒤 범위를 넓혀가는 걸 권장 (12절 참고).

---

## 8. gender_fix.py — 실제 반영

```bash
python3 gender_fix.py --input <fix txt 경로>            # 미리보기 (기본, 안전)
python3 gender_fix.py --input <fix txt 경로> --apply    # 실제 반영
```

- 기본은 dry-run. `--apply`를 붙여야 실제로 파일이 바뀜
- 반영 시 원본은 자동으로 `{파일명}.bak`으로 백업 (최초 1회만, 이미 있으면 덮어쓰지 않음)
- 지원 TYPE: `SRT`(검증됨), `JSON_COMBINED`(합성테스트만, 실전 미검증)
- **`JSON_FINAL_MERGED`(n모드 결과물)는 `gender_audit.py`의 `resolve_fix_locator`
  단계까지만 연결돼 있고, `gender_fix.py`에는 아직 이 TYPE을 실제로 파일에
  반영하는 로직이 없음 — n모드로 발견한 수정안을 실제 반영하려면
  `gender_fix.py`에 이 TYPE 처리를 먼저 추가해야 함**
- 같은 txt 파일 안에 SRT와 JSON 항목을 섞어서 넣어도 됨 (TYPE 필드로 구분)

### fix txt 포맷
```
FILE: /절대/경로/파일
TYPE: SRT 또는 JSON_COMBINED 또는 JSON_FINAL_MERGED
CUE: N                (SRT일 때)
SET_ID: xxx            (JSON_COMBINED / JSON_FINAL_MERGED일 때)
LINE: N                 (JSON_COMBINED / JSON_FINAL_MERGED일 때)
LANG: es
OLD: ...
NEW: ...
REASON: ...
CONFIDENCE: high
===
(다음 블록)
```
`#`으로 시작하는 줄은 주석으로 무시됨.

---

## 9. 검증된 판정 방법론

화자 고정: **1·3·5번 줄=A=여성, 2·4·6번 줄=B=남성**

판정 3분류:
- **본인 지칭**: 화자 자신 → own_gender와 일치해야 함
- **상대방 지칭**: 대화 상대 → interlocutor_gender와 일치해야 함
- **제3자 지칭**: A/B 외 인물 → 문맥상 확정 가능하면 그 성별과 일치, 불가능하면 판정 보류

절대 원칙: 성별 미표시=허용 / 표시됐는데 불일치=필수 수정.

특별 규칙:
- **룸메이트 등 성별 미명시 제3자 관계**: 기본적으로 화자와 동일 성별로 간주
- **가족 호칭**: 오빠/형=남성, 누나/언니=여성, 손위/손아래까지 문맥으로 확정.
  상대방의 가족(예: "너희 언니")도 그 가족 구성원 실제 성별 기준
- **언어 간 상호 일치**: 같은 세그먼트 안 es/fr/pt/ru 등이 서로 다른 성별을
  나타내면 하드 오류로 판정 (구조적 비교라 신뢰도 최고)
- **격식 일관성**: tu/vous, ты/Вы 등이 세트 안에서 섞이는지, 특정 언어만
  다른 격식 수준을 쓰는지도 확인 대상 (실제로 pt만 면접 상황에서 반말 쓴
  사례 발견 및 수정함)

---

## 10. 오늘까지 발견/수정한 안전장치·버그 총정리

### 10.1 fix_candidates 자동 필터 3종 (2026-08-27)
`gender_audit.py`의 `write_fix_candidates_txt()` 함수에 아래 3가지 자동 필터가
들어있음. 전부 실전에서 실제로 발생했던 문제를 막기 위해 추가됨.

1. **OLD == NEW** — LLM이 "문제없음"인데 실수로 FIX 표시하면서 제안값을
   원문 그대로 넣는 경우 → 자동 제외
2. **NEW가 비어있음** — "문제없음"이라 써놓고 suggested_fix를 안 채운 경우
   → 방치하면 SRT 텍스트가 빈 문자열로 덮어써질 뻔했음 → 자동 제외
3. **NEW에 다른 언어가 섞임** — 예: `"fr: 'ma colocataire', pt: '...'"`처럼
   여러 언어 제안이 한 필드에 뭉쳐 들어간 경우 (콜론 형태, 한국어 조사 결합
   형태 둘 다 탐지) → 자동 제외

이 필터를 통과한 항목만 "반영가능"으로 분류되고, 나머지는 "수동확인필요"로
분리되어 txt 맨 아래에 별도 표시됨.

### 10.2 n모드 구조 단계 안전장치 (2026-08-28)
`SOURCE_LANG_MISSING` — 경로의 target 언어가 JSON 내부에 실제로 없으면
그 파일 자체를 API 전송 대상에서 제외 (5.4절 참고).

### 10.3 경로 검증 (2026-08-28 신규)
절대경로가 아니거나 존재하지 않는 경로를 입력하면 조용히 "0개 발견"으로
넘어가지 않고 바로 명확한 오류 메시지를 띄우고 재입력을 받음 (4.1절).
쇼츠 폴더를 상대경로로 입력했다가 "JSON 그룹 0개 / SRT 그룹 0개"만 뜨고
원인을 알 수 없었던 문제가 이걸로 해결됨.

### 10.4 real 시리즈 파싱 버그 수정 (2026-08-28)
real은 JSON 내부 target 표기가 없고(`meta.targetLang: null`이 정상),
문장이 `sentences[].texts.{lang}`처럼 `texts` 래퍼로 한 번 더 감싸져 있는데,
기존 언어맵 추출 로직이 이 래퍼를 못 뚫어서 **파일은 정상 발견되는데
세그먼트가 항상 0개로 파싱되는 버그**가 있었음. `extract_lang_texts`
헬퍼가 `texts` 래퍼를 자동으로 감지해서 풀어내도록 일반화해서 수정 —
real만의 특수 분기를 추가한 게 아니라, 다른 콘텐츠타입에서 같은 래퍼
패턴이 나와도 동일하게 처리되도록 만듦. 실제 프로덕션 real 파일
구조로 재현 후 수정 및 재검증 완료.

---

## 11. 검증 상태 체크리스트

| 항목 | 상태 |
|---|---|
| SRT 형식 discovery/parsing (y모드) | ✅ 검증됨 |
| SRT 형식 3회반복+합의 판정 (y모드) | ✅ 검증됨 |
| SRT 형식 gender_fix.py 반영 (y모드) | ✅ 검증됨 (실제 프로덕션 파일 8곳 수정 완료) |
| 경로 검증(상대경로/존재하지 않는 경로 즉시 안내) | ✅ 신규 추가, 기본 동작만 확인 |
| JSON 통합형 단일파일 discovery/parsing (y모드, conversation) | ✅ 검증됨 |
| JSON 분리형(`-compact.` 등) discovery/parsing (y모드) | ⚠️ 코드만 있음, 미검증 |
| n모드 discovery + target판별 + 언어맵 추출 (conversation/grammar/idiom/voca/real) | ✅ 실제 프로덕션 폴더(1,097개 파일, 21,685개 세그먼트)에서 dry-run 검증 완료 |
| n모드 `SOURCE_LANG_MISSING` 등 구조오류 분리 | ✅ 실제 프로덕션 폴더에서 0건(오탐 없음) 확인 |
| n모드 real 콘텐츠타입 (`texts` 래퍼 언어맵) | ✅ 버그 재현 후 수정 완료, 실제 구조로 재검증 |
| conversation(en/kr) 실제 LLM 판정(API 호출, `--full-report --repeat 3`) | 🔄 진행 중 |
| grammar/idiom/voca/real 실제 LLM 판정(API 호출) | ⚠️ 미착수 |
| JSON_COMBINED gender_fix.py 반영 (y모드) | ⚠️ 합성테스트만, 실전 미검증 |
| JSON_FINAL_MERGED gender_fix.py 반영 (n모드) | ❌ 아직 미구현 — resolve_fix_locator까지만 연결됨 |
| 대규모(수만 줄) 처리 안정성 | ⚠️ discovery/parsing은 21,685개로 검증됨. API 판정까지 포함한 전체 파이프라인은 미검증 |

---

## 12. 다음 단계 (우선순위)

1. conversation(en/kr) 3회 검수 진행 중 — 완료되면 consensus.txt로 결과 검토
2. real 시리즈로 소규모(폴더 1~2개) `--mode n --full-report --repeat 3` 실행
   (파싱 버그는 고쳤지만 실제 LLM 판정은 아직 한 번도 안 돌려봄)
3. grammar/idiom/voca도 동일 절차로 검증 (아직 LLM 판정을 한 번도 안 돌려본
   콘텐츠타입들)
4. `gender_fix.py`에 `JSON_FINAL_MERGED` TYPE 반영 로직 추가 후 실전 1회 테스트
5. y모드 JSON 분리형(`data_es`/`data_fr` 등)도 `--dry-run`으로 구조 인식 확인
6. 위가 통과되면 배치 규모를 점진적으로 늘려 전체 규모(21,685개) 검증

---

## 13. 알려진 한계

- LLM 판정은 매 실행마다 달라질 수 있음 (같은 폴더를 여러 번 돌리면 결과가
  다를 수 있음) — 그래서 3회 반복+합의 구조가 필요함
- 합의 결과라도 100% 안전하지 않음 — 최종 반영 전 사람이 원문을 직접 대조하는
  단계는 생략 불가
- 정규식 기반 안전필터는 "발견되는 대로 추가"한 것이라, 아직 못 잡은 새로운
  오염 패턴이 있을 수 있음
- n모드의 target 판별은 경로의 언어 폴더명에 전적으로 의존함 — 폴더 구조가
  `{series}/{lang}/...` 규칙을 벗어나면(예: 언어 폴더가 없거나 다른 depth에
  있으면) target을 못 찾고 그 파일은 조용히 건너뛰어짐
- 경로 검증은 "존재하는 폴더인지"만 확인함 — 폴더는 존재하지만 그 안에
  기대한 구조의 파일이 없는 경우(예: 완전히 다른 프로젝트 폴더를 잘못
  지정)는 여전히 discovery 단계에서 0건으로만 나타남
