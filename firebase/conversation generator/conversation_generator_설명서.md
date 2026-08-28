딥시크 자동화 명령어 - conversation

## 평가 자동화 (환경변수 + 기본 세팅)

```bash
export DEEPSEEK_API_KEY="sk-076b937d70b34d61abc743eb8e0c4223"

python3 "/Users/junghasuk/Desktop/ManyLangs/web/deepseek/conversation/conversation_eval_pipeline.py" \
  --root "/Users/junghasuk/Desktop/ManyLangs/web/firebase/conversation generator/data" \
  --target-lang kr \
  --prompt-dir "/Users/junghasuk/Desktop/ManyLangs/web/deepseek/conversation"
```

```bash
PROJ=~/Desktop/ManyLangs/web/firebase/"conversation generator"
cd "$PROJ"
```

`cd "$PROJ"`는 그냥 "이 프로젝트 폴더로 이동해라"라는 뜻입니다 (매번 저 긴 경로를
직접 안 쳐도 되게 만든 단축키). `~/.zshrc`에 `PROJ` 변수로 등록해두면 됩니다.

---

## 폴더 구조 (생성 라인 기준)

```
$PROJ/
├── languages.py
├── text_parser.py
├── promote_draft.py
├── deepseek_generate.py
├── merge.py
├── review.py
├── conversation_checker.py
│
├── prompts/
│   ├── GENERATOR_{KR,ES,FR,DE,IT,PT,RU,ZH,JP}.md   (9개)
│   ├── TRANSLATOR_{EN,ES,FR,PT,KR,JP,ZH,RU}.md     (8개, 고정)
│   ├── REVIEW_PROMPT.md
│   └── EVAL_PROMPT.md
│
├── data_es/  data_fr/  data_pt/  data_zh/  data_jp/  data_ru/   (완성 6개 책)
│   └── {batch}/
│       ├── {batch}-compact.target.json
│       ├── {batch}-compact.{lang}.json   (×7, 자기 자신 제외)
│       └── conversation_{batch}.runtime.json  (합본, es/fr/pt/zh/jp만 생성됨 — ru는 아직)
```

---

## 파일별 역할 + 로직

### languages.py
역할: 8개 번역 언어(en/es/fr/pt/kr/jp/zh/ru) 목록의 단일 소스. 로직:
`TRANSLATE_LANGS` 리스트 하나 정의. `translate_langs_for(target_lang)` 함수가
"전체 8개 − 이번 target 언어 자신"을 계산해서 반환. 다른 모든 스크립트가 이
함수를 통해 "번역할 언어 목록"을 얻는다 — 하드코딩된 곳이 없다.

### prompts/GENERATOR_{LANG}.md (9개)
역할: 그 언어의 원문(target)을 처음부터 창작하는 매뉴얼. 번역이 아니라 "그 언어
원어민이 실제로 쓸 법한 표현" 기준으로 생성. 로직: BATCH_ID(001~060)를 받으면,
문서 내장 챕터표(4장)에서 해당 챕터의 주제·레벨을 확정하고, 그 주제로 10세트×
6줄 회화를 생성. 출력은 JSON이 아니라 `LEVEL:`/`CHAPTER_ID:`/`TITLE:` 헤더 +
`SET 001`~`SET 010` 텍스트 블록(v2, 파싱 안정성 때문에 JSON 강제 포기). 성별
문법이 있는 언어(ES/FR/PT/IT/RU, 부분적으로 DE)는 5-1장에 "A=여성(홀수줄)/
B=남성(짝수줄)" 고정 규칙 포함.

### prompts/TRANSLATOR_{LANG}.md (8개, 고정 8종)
역할: target 원문을 받아 그 언어 하나로만 1:1 번역. 목표언어가 무엇이든
재사용된다. 로직: deepseek_generate.py가 승격된 target의 문장을 텍스트로 넘기면,
같은 `TITLE:`+`SET` 텍스트 형식으로 번역만 출력. target=자기 언어인 경우엔
애초에 호출 안 됨 (merge.py의 `--mirror`가 대신 처리).

### prompts/REVIEW_PROMPT.md / EVAL_PROMPT.md
역할: 생성 라인이 아니라 검수 라인. REVIEW는 수정안을 REPLACEMENTS 딕셔너리로
출력, EVAL은 문법/자연스러움을 점수표로만 출력(수정 안 함). 아직 이번 6개 책엔
미적용.

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
역할: GENERATOR/TRANSLATOR가 낸 평문 텍스트를 표준 JSON 구조로 변환. 로직:
정규식으로 `LEVEL:`/`CHAPTER_ID:`/`TITLE:` 헤더 추출, `SET 001`~`010` 블록을
찾아 각 블록 안의 `A:`/`B:` 라벨 줄만 순서대로 뽑음. 세트 10개·줄 6개 아니면
즉시 실패 처리 (파싱 실패 → 재시도 대상).

### promote_draft.py
역할: 검수 통과한 draft만 compact로 승격. draft/compact는 "단계"를 뜻하며 파일명
맨 앞에 옴 (`{batch}-draft.{tag}.json` → `{batch}-compact.{tag}.json`). 로직:
단일 파일 또는 `--root --all`로 폴더 전체 훑어서 승격. `--apply-review`로
REVIEW_PROMPT.md 수정안을 승격 전에 반영 가능. 이미 승격된 건 자동 스킵
(`--force` 없이는).

### merge.py
역할: target 1개 + 번역 7개(compact 상태)를 하나의 `conversation_{batch}.runtime.json`
으로 합침 — 성별 검수기 등이 언어 간 교차검증을 하려면 이 합본이 필요. 로직:
`target`/`{lang}` 서브커맨드로 한 언어씩 순차적으로 `--base`에 누적. `--mirror`는
target=자기 언어일 때 API 호출 없이 target 텍스트를 그대로 복사.

### review.py / conversation_checker.py
역할: 생성 라인이 아니라 기존 검수용 스크립트 (이번 6개 책 작업엔 아직 미사용).

---

## 전체 파이프라인 명령어 (1~6단계, es 기준 예시 — 다른 언어는 es/data_es를 해당 언어로 치환)

```bash
cd "$PROJ"
export DEEPSEEK_API_KEY="sk-076b937d70b34d61abc743eb8e0c4223"
```

### 1) 원본(target) 생성
```bash
python3 deepseek_generate.py target --target-lang es --batches 1-60 \
  --prompts-dir ./prompts --data-root ./data_es
```
실패 배치만 재시도 (로그에서 [검증 실패]/[파싱 실패] 뜬 배치 번호만 골라서):
```bash
python3 deepseek_generate.py target --target-lang es --batches 5,9,29 \
  --prompts-dir ./prompts --data-root ./data_es
```
→ 성공할 때까지 반복

### 2) 원본 승격
```bash
python3 promote_draft.py --root ./data_ru --all
```

### 3) 번역 8종 생성 (승격된 target만 대상)
```bash
python3 deepseek_generate.py translate --batches 1-60 --lang all \
  --prompts-dir ./prompts --data-root ./data_ru
```
실패 배치만 재시도:
```bash
python3 deepseek_generate.py translate --batches 12,40 --lang all \
  --prompts-dir ./prompts --data-root ./data_es
```
→ 성공할 때까지 반복

### 4) 번역 승격
```bash
python3 promote_draft.py --root ./data_ru --all
```

### 5) 전체 점검 (compact 8개 다 채워졌는지)
```bash
for d in data_es/*/; do
  batch=$(basename "$d")
  n=$(ls "$d" 2>/dev/null | grep -c '^[0-9]*-compact\.')
  if [ "$n" -lt 7 ]; then
    echo "[문제] es/$batch : compact ${n}개"
  fi
done
```
→ 문제 배치 나오면 1)로 돌아가서 반복. 아무것도 안 나오면 다음 단계.

### 6) 합본 생성 (merge.py로 8개 언어를 하나의 runtime.json으로)
```bash
for d in data_es/*/; do
  batch=$(basename "$d")
  python3 merge.py target "$d/${batch}-compact.target.json" --out "$d/conversation_${batch}.runtime.json"
  python3 merge.py es --mirror --base "$d/conversation_${batch}.runtime.json" --out "$d/conversation_${batch}.runtime.json"
  for other in en fr pt kr jp zh ru; do
    f="$d/${batch}-compact.${other}.json"
    if [ -f "$f" ]; then
      python3 merge.py $other "$f" --base "$d/conversation_${batch}.runtime.json" --out "$d/conversation_${batch}.runtime.json"
    fi
  done
done
```

---

## 하위 폴더 전부 es fr pt zh jp (1~6단계 다 묶어서)

```bash
cd "$PROJ"
export DEEPSEEK_API_KEY="sk-076b937d70b34d61abc743eb8e0c4223"

for lang in es fr pt zh jp; do
  echo "===== $lang ====="
  python3 deepseek_generate.py target --target-lang $lang --batches 1-60 \
    --prompts-dir ./prompts --data-root ./data_$lang
  python3 promote_draft.py --root ./data_$lang --all
  python3 deepseek_generate.py translate --batches 1-60 --lang all \
    --prompts-dir ./prompts --data-root ./data_$lang
  python3 promote_draft.py --root ./data_$lang --all
done

# 점검
for lang in es fr pt zh jp; do
  echo "=== $lang ==="
  for d in data_$lang/*/; do
    batch=$(basename "$d")
    n=$(ls "$d" 2>/dev/null | grep -c '^[0-9]*-compact\.')
    [ "$n" -lt 7 ] && echo "  [문제] $lang/$batch : ${n}개"
  done
done

# 합본 (모든 언어, 모든 배치)
for lang in es fr pt zh jp; do
  for d in data_$lang/*/; do
    batch=$(basename "$d")
    python3 merge.py target "$d/${batch}-compact.target.json" --out "$d/conversation_${batch}.runtime.json"
    python3 merge.py $lang --mirror --base "$d/conversation_${batch}.runtime.json" --out "$d/conversation_${batch}.runtime.json"
    for other in en es fr pt kr jp zh ru; do
      [ "$other" = "$lang" ] && continue
      f="$d/${batch}-compact.${other}.json"
      [ -f "$f" ] && python3 merge.py $other "$f" --base "$d/conversation_${batch}.runtime.json" --out "$d/conversation_${batch}.runtime.json"
    done
  done
done
```

지금은 이미 1~5단계까지 다 끝난 상태라, 6번(합본 생성)만 돌리시면 됩니다. 6번
명령어 실행하시고 결과 알려주세요 — 다 되면 성별 검수기가 읽을
`conversation_*.runtime.json` 300개가 완성됩니다.

> **아직 미완료**: `data_ru`(러시아어)는 target 생성·번역·승격까지는 됐지만
> 합본(6번 단계)이 아직 안 돌아간 상태입니다. es/fr/pt/zh/jp 5개 언어와 별도로
> `for d in data_ru/*/; do ... done` 형태로 한 번 더 돌려야 합니다.
