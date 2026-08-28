딥시크 자동화 명령어 - grammar

## 평가 자동화 (환경변수 + 기본 세팅)

```bash
export DEEPSEEK_API_KEY="sk-076b937d70b34d61abc743eb8e0c4223"

PROJ=~/Desktop/ManyLangs/web/firebase/"grammar generator"
cd "$PROJ"
```

`cd "$PROJ"`는 "이 프로젝트 폴더로 이동해라"라는 뜻입니다. `~/.zshrc`에 `PROJ` 변수를
등록해두면 매번 긴 경로를 직접 안 쳐도 됩니다.

---

## 폴더 구조 (생성 라인 기준)

```
grammar generator/
├── languages.py
├── text_parser.py
├── promote_draft.py
├── deepseek_generate.py
├── merge.py
├── review.py
├── checker.py
│
├── prompts/
│   ├── GENERATOR_{EN,KR}.md            (2개, target 생성기)
│   ├── TRANSLATOR_{EN,ES,FR,PT,KR,JP,ZH}.md   (7개, 고정)
│
├── 검수/
│   ├── grammar_en_검수프롬프트_v2.md
│   └── grammar_kr_검수프롬프트_v2.md
│
└── data/
    └── {batch}/                          (EN target: 001~155 / KR target: 001~210)
        ├── {batch}-draft.target.json
        ├── {batch}-compact.target.json
        ├── {batch}-draft.{lang}.json      (×7, 자기 자신 제외)
        ├── {batch}-compact.{lang}.json    (×7)
        └── grammar_{batch}.runtime.json   (합본, checker.py가 이 이름을 찾음)
```

conversation과 다른 점: target 언어마다 챕터 목록이 다르므로 (EN=155개, KR=210개)
GENERATOR 파일은 언어별로 완전히 별개 문서입니다 — 언어를 추가할 때마다
`GENERATOR_{LANG}.md`를 새로 통째로 설계해야 합니다 (챕터표 자체가 그 언어 안에
잠겨 있음). TRANSLATOR 7종은 conversation처럼 target이 무엇이든 재사용됩니다.

---

## 파일별 역할 + 로직

### languages.py
역할: 7개 번역 언어(en/es/fr/pt/kr/jp/zh) 목록의 단일 소스 (conversation과 달리
ru 없음). 로직: `TRANSLATE_LANGS` 리스트 하나 정의. `translate_langs_for(target_lang)`
함수가 "전체 7개 − 이번 target 언어 자신"을 계산해서 반환. merge.py /
deepseek_generate.py가 전부 이 함수를 통해 번역 언어 목록을 얻는다 — 하드코딩된
곳이 없다. **주의**: checker.py / review.py는 예전부터 있던 파일이라 언어 목록이
자체적으로 하드코딩돼 있음 (languages.py를 안 봄) — 언어를 추가하면 이 두 파일도
따로 고쳐야 함.

### prompts/GENERATOR_{EN,KR}.md (2개)
역할: 그 언어의 문법 챕터 원문(target)을 처음부터 창작하는 매뉴얼. 로직: BATCH_ID를
받으면 문서 내장 챕터표(잠긴 목록, EN=155개/KR=210개)에서 해당 챕터를 확정하고,
GRAMMAR_SPEC(POINT/DEFINITION/FORM/CORE_RULE/CONSTRAINTS/COMMON_ERRORS/
REGISTER_NOTE/CONTRAST 8필드)을 내부 선언한 뒤, 그 사양에 맞춰 17블록
(grammar_explanation 5개 + grammar_example 12개[core_patterns 4/variations 4/
extended_usage 4])을 작성한다. 출력은 JSON이 아니라 `LEVEL:`/`CHAPTER_ID:`/
`TITLE:` 헤더 + `EXP 1~5` / `EX CORE 1~4` / `EX VAR 1~4` / `EX EXT 1~4` 텍스트
블록 (파싱 안정성 때문에 JSON 강제 안 씀, conversation의 SET 방식과 동일한 이유).
숫자·날짜·시각은 전부 말로 풀어써야 하는 TTS 안전 규칙이 포함돼 있다.

### prompts/TRANSLATOR_{EN,ES,FR,PT,KR,JP,ZH}.md (7개, 고정 7종)
역할: target 원문 17블록을 받아 그 언어 하나로만 1:1 번역. target이 EN이든 KR이든
그대로 재사용된다. 로직: deepseek_generate.py가 승격된 target의 17블록을 텍스트로
넘기면, 같은 TITLE:+EXP/EX 텍스트 형식으로 번역만 출력. 언어별 지역표준
(es-ES/fr-FR/pt-PT 등), 성별 문법 일치, zh 전각부호, jp 어체 일관성, TTS 숫자
풀어쓰기 규칙이 각 파일 안에 포함돼 있다. target=자기 언어인 경우엔 애초에
호출 안 됨 (merge.py의 `--mirror`가 대신 처리).

### deepseek_generate.py
역할: GENERATOR/TRANSLATOR를 실제 DeepSeek API로 호출하는 자동화 스크립트.
target/translate 두 모드. 로직:
- **target 모드**: `GENERATOR_{LANG}.md`를 시스템 프롬프트로, BATCH_ID를 유저
  메시지로 호출 → 응답을 text_parser.py로 파싱 → `{batch}-draft.target.json` 저장.
- **translate 모드**: 반드시 승격된(compact.target.json) target만 읽음 (검수 안
  된 draft 기준으로 번역해버리는 사고 방지). `languages.translate_langs_for()`로
  번역할 언어를 동적 계산, ThreadPoolExecutor로 병렬 호출 →
  `{batch}-draft.{lang}.json` 저장.

### text_parser.py
역할: GENERATOR/TRANSLATOR가 낸 평문 텍스트를 표준 JSON 구조로 변환. 로직: 정규식
으로 `LEVEL:`/`CHAPTER_ID:`/`TITLE:` 헤더 추출, `EXP 1~5` / `EX CORE 1~4` /
`EX VAR 1~4` / `EX EXT 1~4` 블록을 찾아 각 라벨 바로 다음 텍스트를 문장으로 뽑음.
그룹별 개수(5/4/4/4, 합계 17)가 안 맞으면 즉시 실패 처리 (파싱 실패 → 재시도 대상).

### promote_draft.py
역할: 검수 통과한 draft만 compact로 승격. draft/compact는 "단계"를 뜻하며 파일명
맨 앞에 옴 (`{batch}-draft.{tag}.json` → `{batch}-compact.{tag}.json`). 로직:
단일 파일 또는 `--root --all`로 폴더 전체 훑어서 승격. `--apply-review`로
`(group, index): "수정문장"` 형태의 REPLACEMENTS 딕셔너리를 승격 전에 반영 가능.
이미 승격된 건 자동 스킵 (`--force` 없이는).

### merge.py
역할: target 1개 + 번역 7개(compact 상태)를 하나의 `grammar_{batch}.runtime.json`
으로 합침 — checker.py/review.py가 언어 간 교차검증을 하려면 이 합본이 필요.
로직: `target`/`{lang}` 서브커맨드로 한 언어씩 순차적으로 `--base`에 누적.
`--mirror`는 target=자기 언어일 때 API 호출 없이 target 텍스트를 그대로 복사.

### checker.py / review.py / 검수/
역할: 생성 라인이 아니라 기존 검수용 스크립트 (원래 이 저장소에 있던 것, 변경
없음). checker.py는 17블록·8언어 키 구조 검증, review.py는 검수 프롬프트가 낸
`ALL_REPLACEMENTS` 딕셔너리를 실제 runtime.json에 적용.

---

## 전체 파이프라인 명령어 (1~6단계, EN 기준 예시 — KR은 en/155를 kr/210으로 치환)

```bash
cd "$PROJ"
export DEEPSEEK_API_KEY="sk-076b937d70b34d61abc743eb8e0c4223"
```

### 1) 원본(target) 생성
```bash
python3 deepseek_generate.py target --target-lang en --batches 1-155 \
  --prompts-dir ./prompts --data-root ./data
```
실패 배치만 재시도 (로그에서 [파싱 실패] 뜬 배치 번호만 골라서):
```bash
python3 deepseek_generate.py target --target-lang en --batches 5,9,29 \
  --prompts-dir ./prompts --data-root ./data
```
→ 성공할 때까지 반복

### 2) 원본 승격
```bash
python3 promote_draft.py --root ./data --all
```

### 3) 번역 7종 생성 (승격된 target만 대상)
```bash
python3 deepseek_generate.py translate --batches 1-155 --lang all \
  --prompts-dir ./prompts --data-root ./data
```
실패 배치만 재시도:
```bash
python3 deepseek_generate.py translate --batches 12,40 --lang all \
  --prompts-dir ./prompts --data-root ./data
```
→ 성공할 때까지 반복

### 4) 번역 승격
```bash
python3 promote_draft.py --root ./data --all
```

### 5) 전체 점검 (compact 7개 다 채워졌는지 — target=en이므로 en은 mirror 대상, compact 파일 자체는 안 생김)
```bash
for d in data/*/; do
  batch=$(basename "$d")
  n=$(ls "$d" 2>/dev/null | grep -c '^[0-9]*-compact\.')
  if [ "$n" -lt 6 ]; then
    echo "[문제] en/$batch : compact ${n}개"
  fi
done
```
→ 문제 배치 나오면 1)로 돌아가서 반복. 아무것도 안 나오면 다음 단계.

### 6) 합본 생성 (merge.py로 8개 언어 컬럼을 하나의 runtime.json으로)
```bash
for d in data/*/; do
  batch=$(basename "$d")
  python3 merge.py target "$d/${batch}-compact.target.json" --out "$d/grammar_${batch}.runtime.json"
  python3 merge.py en --mirror --base "$d/grammar_${batch}.runtime.json" --out "$d/grammar_${batch}.runtime.json"
  for other in es fr pt kr jp zh; do
    f="$d/${batch}-compact.${other}.json"
    if [ -f "$f" ]; then
      python3 merge.py $other "$f" --base "$d/grammar_${batch}.runtime.json" --out "$d/grammar_${batch}.runtime.json"
    fi
  done
done
```

### 7) 검수
```bash
python3 checker.py
```

---

## 하위 언어 전부 (EN, KR 다 묶어서)

```bash
cd "$PROJ"
export DEEPSEEK_API_KEY="sk-076b937d70b34d61abc743eb8e0c4223"

declare -A BATCH_RANGE=( ["en"]="1-155" ["kr"]="1-210" )

for lang in en kr; do
  echo "===== $lang ====="
  python3 deepseek_generate.py target --target-lang $lang --batches "${BATCH_RANGE[$lang]}" \
    --prompts-dir ./prompts --data-root ./data
  python3 promote_draft.py --root ./data --all
  python3 deepseek_generate.py translate --batches "${BATCH_RANGE[$lang]}" --lang all \
    --prompts-dir ./prompts --data-root ./data
  python3 promote_draft.py --root ./data --all
done
```

> **주의**: EN과 KR은 배치 ID 범위가 서로 겹칩니다 (둘 다 001부터 시작). 두 target을
> 같은 `./data` 폴더에서 같이 돌리면 파일이 섞입니다. 실제로는 `--data-root ./data_en`,
> `--data-root ./data_kr`처럼 target별로 폴더를 분리해서 쓰는 걸 권장합니다
> (README_PIPELINE.md 예시는 이 점을 반영해 갱신 예정).

```bash
# 점검 (data_en / data_kr로 분리했다고 가정)
for lang in en kr; do
  echo "=== $lang ==="
  for d in data_$lang/*/; do
    batch=$(basename "$d")
    n=$(ls "$d" 2>/dev/null | grep -c '^[0-9]*-compact\.')
    [ "$n" -lt 6 ] && echo "  [문제] $lang/$batch : ${n}개"
  done
done
```

```bash
# 합본 (모든 언어, 모든 배치)
for lang in en kr; do
  for d in data_$lang/*/; do
    batch=$(basename "$d")
    python3 merge.py target "$d/${batch}-compact.target.json" --out "$d/grammar_${batch}.runtime.json"
    python3 merge.py $lang --mirror --base "$d/grammar_${batch}.runtime.json" --out "$d/grammar_${batch}.runtime.json"
    for other in en es fr pt kr jp zh; do
      [ "$other" = "$lang" ] && continue
      f="$d/${batch}-compact.${other}.json"
      [ -f "$f" ] && python3 merge.py $other "$f" --base "$d/grammar_${batch}.runtime.json" --out "$d/grammar_${batch}.runtime.json"
    done
  done
done
```

지금은 아직 배치 생성이 한 번도 안 돌아간 상태이므로, 1)부터 순서대로 진행하시면
됩니다. `GENERATOR_EN.md`/`GENERATOR_KR.md`는 이번에 원본 매뉴얼에서 파생된 첫
버전이라, 처음 몇 배치는 결과를 보고 프롬프트를 다듬는 반복이 필요할 수 있습니다.
