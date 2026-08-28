딥시크 자동화 명령어 - voca

## 평가 자동화 (환경변수 + 기본 세팅)

```bash
export DEEPSEEK_API_KEY="sk-076b937d70b34d61abc743eb8e0c4223"

PROJ=~/Desktop/ManyLangs/web/firebase/"voca generator"
cd "$PROJ"
```

`cd "$PROJ"`는 "이 프로젝트 폴더로 이동해라"라는 뜻입니다. `~/.zshrc`에 `PROJ`
변수를 등록해두면 매번 긴 경로를 직접 안 쳐도 됩니다.

---

## 폴더 구조 (생성 라인 기준)

```
voca generator/
├── languages.py
├── deepseek_generate.py
├── promote_draft.py
├── merge.py
├── review.py
├── voca_checker.py
│
├── prompts/
│   ├── GENERATOR_{EN,KR}.md            (2개, target 생성기 — 구 Manual A)
│   └── TRANSLATOR_{EN,ES,FR,PT,KR,JP,ZH}.md   (7개, 고정 — 구 translation_prompt_common)
│
├── 문서/                                (원본 자료 보관, 건드리지 않음)
│   ├── 번역프롬프트/                     (TRANSLATOR_*.md의 원본, 참고용)
│   └── 생성&검수&단어목록/
│       ├── en/, kr/                     (CEFR 단어 목록 rtf 6개씩 + 검수프롬프트 v4)
│       └── deepseek_generate.py          (구버전, 이제 안 씀 — 새 버전이 루트에 있음)
│
├── batch_convert.py / run_merge.sh / negation_scope_rescan.py /
│   check_titles.py / scan_all_mz.py / core_word_scanner.py   (기존 유틸, 변경 없음)
│
└── data/
    └── {batch}/                          (EN target: 001~144 / KR target: 001~144)
        ├── {batch}-draft.target.json
        ├── {batch}-compact.target.json
        ├── {batch}-draft.{lang}.json      (×7, 자기 자신 제외)
        ├── {batch}-compact.{lang}.json    (×7)
        └── {batch}-target.json            (merge.py 누적 산출물, 최종 runtime)
```

conversation/grammar와 다른 점: voca는 챕터가 아니라 "720단어 레지스트리"를
`LEVEL(A1~C2) × 배치(24개) × 5단어`로 잘라 쓴다. `GENERATOR_{LANG}.md` 안에
그 언어의 720단어 전체가 잠긴 표로 들어있고, `deepseek_generate.py`가 BATCH_ID
하나당 5단어씩 자동으로 뽑아서 넘긴다 (LEVEL은 배치 번호로 자동 계산됨:
001~024=A1, 025~048=A2 … 121~144=C2).

---

## 파일별 역할 + 로직

### languages.py
역할: 7개 번역 언어(en/es/fr/pt/kr/jp/zh) 목록의 단일 소스. 로직: `TRANSLATE_LANGS`
리스트 하나 정의. `translate_langs_for(target_lang)` 함수가 "전체 7개 − 이번
target 언어 자신"을 계산해서 반환. merge.py / deepseek_generate.py가 전부 이
함수를 통해 번역 언어 목록을 얻는다 — 하드코딩된 곳이 없다. **주의**:
voca_checker.py / review.py는 예전부터 있던 파일이라 언어 목록이 자체적으로
하드코딩돼 있을 수 있음 — 언어를 추가하면 이 파일들도 확인 필요.

### prompts/GENERATOR_{EN,KR}.md (2개, 구 Manual A)
역할: 그 언어의 단어 원문(target)을 처음부터 창작하는 매뉴얼. 로직: LEVEL+BATCH_ID
를 받으면, 문서 내장 720단어 잠긴 레지스트리(3.7장)에서 해당 배치의 5단어(IDX·
ConceptID·word)를 정확히 추출하고, POS/도메인/다의어 여부를 선언(WORD_SPEC)한
뒤, 각 단어마다 **CORE + MEANING_ZONE**(핵심 의미 + 의미 영역)과 예문 3개
(평서/부정/의문)를 target 언어로만 작성한다. 출력은 `TARGET_BLOCK` JSON +
`STAGE1_STATUS: PASS/FAIL` + `FLAG: ...` 트레일러 (5장). 이 JSON은 target과
en/kr(미러 컬럼) 두 언어만 담은 부분 JSON이며, 나머지 6개 언어는 여기서 만들지
않는다. 예문 안에서 core를 자연스럽게 못 쓰면 `"FLAG: <사유>"`라는 문자열을
그대로 값으로 남겨서 사람이 검토하도록 한다.

### prompts/TRANSLATOR_{EN,ES,FR,PT,KR,JP,ZH}.md (7개, 고정 7종, 구 translation_prompt_common)
역할: target 5단어 블록(core/meaning_zone/example 3개씩)을 받아 그 언어 하나로만
번역. target이 EN이든 KR이든 그대로 재사용된다. 로직: deepseek_generate.py가
승격된 target compact를 텍스트로 정리해서 넘기면, 단일 `TRANSLATION_BLOCK` JSON
객체로 그 언어의 core/meaning_zone/예문 3개를 출력. FLAG 트레일러도 동일하게
지원. target=자기 언어인 경우엔 애초에 호출 안 됨 (merge.py의 `--mirror`가 대신
처리).

### deepseek_generate.py
역할: GENERATOR/TRANSLATOR를 실제 DeepSeek API로 호출하는 자동화 스크립트.
target/translate 두 모드. 로직:
- **target 모드**: `GENERATOR_{LANG}.md`에서 720단어 레지스트리를 파싱해두고
  (레지스트리 원문은 토큰 절약을 위해 실제 API 호출 시 프롬프트에서 잘라내고,
  해당 배치의 5단어만 유저 메시지에 명시적으로 전달), BATCH_ID → 5단어 추출 →
  API 호출 → `extract_first_json_object`로 응답 파싱 → `STAGE1_STATUS`가 PASS일
  때만 → `{batch}-draft.target.json` 저장. 모든 예문에서 `FLAG:` 문자열을 스캔해
  즉시 터미널에 출력.
- **translate 모드**: 반드시 승격된(compact.target.json) target만 읽음 (검수 안
  된 draft 기준으로 번역해버리는 사고 방지). `languages.TRANSLATE_LANGS` 전체
  또는 `--lang` 지정 언어로 `TRANSLATOR_{LANG}.md` 호출, ThreadPoolExecutor로
  병렬 처리 → `{batch}-draft.{lang}.json` 저장.

### promote_draft.py
역할: 검수 통과한 draft만 compact로 승격. draft/compact는 "단계"를 뜻하며 파일명
맨 앞에 옴 (`{batch}-draft.{tag}.json` → `{batch}-compact.{tag}.json`). 로직:
단일 파일 또는 `--root --all`로 폴더 전체 훑어서 승격. `--apply-review`로
`(block_id, "word"|"example", index): 값` 형태의 REPLACEMENTS 딕셔너리를 승격
전에 반영 가능. 이미 승격된 건 자동 스킵 (`--force` 없이는).

### merge.py
역할: target 1개 + 번역 7개(compact 상태)를 하나의 5블록 runtime JSON으로 합침
— voca_checker.py/review.py가 언어 간 교차검증을 하려면 이 합본이 필요. 로직:
`target`/`{lang}` 서브커맨드로 한 언어씩 순차적으로 `--base`에 누적. `--mirror`는
target=자기 언어일 때 API 호출 없이 target 텍스트를 그대로 복사. 병합 자체는
번역 내용의 의미·품질을 검사하지 않는다 (블록 5개·id·순서·예문 3개·언어 키
존재 여부만 확인) — 의미 검수는 voca_checker.py/review.py의 몫.

### voca_checker.py / review.py
역할: 생성 라인이 아니라 기존 검수용 스크립트 (원래 이 저장소에 있던 것, 변경
없음). voca_checker.py는 5블록·examples 3개 등 구조 검증, review.py는 검수
프롬프트가 낸 `ALL_REPLACEMENTS` 딕셔너리를 실제 runtime.json에 적용.

### batch_convert.py / run_merge.sh / negation_scope_rescan.py / check_titles.py / scan_all_mz.py / core_word_scanner.py
역할: 생성 라인과 무관한 기존 보조 유틸리티 (부정문 범위 재검사, 제목 검사,
meaning_zone 스캔, core 단어 스캐너 등). 이번 재구성에서 손대지 않음.

---

## 전체 파이프라인 명령어 (1~6단계, EN 기준 예시 — KR은 en/data_en을 kr/data_kr로 치환)

```bash
cd "$PROJ"
export DEEPSEEK_API_KEY="sk-076b937d70b34d61abc743eb8e0c4223"
```

### 1) 원본(target) 생성
```bash
python3 deepseek_generate.py target --target-lang en --level A1 --batches 1-24 \
  --prompts-dir ./prompts --data-root ./data_en
```
레벨별로 배치 범위가 다릅니다: A1=1-24, A2=25-48, B1=49-72, B2=73-96, C1=97-120,
C2=121-144 (전체를 한 번에 돌리려면 `--batches 1-144`).

실패 배치만 재시도 (로그에서 STAGE1_STATUS: FAIL 뜬 배치 번호만 골라서):
```bash
python3 deepseek_generate.py target --target-lang en --batches 5,9,29 \
  --prompts-dir ./prompts --data-root ./data_en
```
→ 성공할 때까지 반복

### 2) 원본 승격
```bash
python3 promote_draft.py --root ./data_en --all
```

### 3) 번역 7종 생성 (승격된 target만 대상)
```bash
python3 deepseek_generate.py translate --batches 1-144 --lang all \
  --prompts-dir ./prompts --data-root ./data_en
```
실패 배치만 재시도:
```bash
python3 deepseek_generate.py translate --batches 12,40 --lang all \
  --prompts-dir ./prompts --data-root ./data_en
```
→ 성공할 때까지 반복

### 4) 번역 승격
```bash
python3 promote_draft.py --root ./data_en --all
```

### 5) 전체 점검 (compact 6개 다 채워졌는지 — target=en이므로 en 자체 compact는 안 생김)
```bash
for d in data_en/*/; do
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
for d in data_en/*/; do
  batch=$(basename "$d")
  python3 merge.py target "$d/${batch}-compact.target.json" --out "$d/${batch}-target.json"
  python3 merge.py en --mirror --base "$d/${batch}-target.json" --out "$d/${batch}-target.json"
  for other in es fr pt kr jp zh; do
    f="$d/${batch}-compact.${other}.json"
    if [ -f "$f" ]; then
      python3 merge.py $other "$f" --base "$d/${batch}-target.json" --out "$d/${batch}-target.json"
    fi
  done
done
```

### 7) 검수
```bash
python3 voca_checker.py
```

---

## 하위 언어 전부 (EN, KR 다 묶어서)

```bash
cd "$PROJ"
export DEEPSEEK_API_KEY="sk-076b937d70b34d61abc743eb8e0c4223"

for lang in en kr; do
  echo "===== $lang ====="
  python3 deepseek_generate.py target --target-lang $lang --batches 1-144 \
    --prompts-dir ./prompts --data-root ./data_$lang
  python3 promote_draft.py --root ./data_$lang --all
  python3 deepseek_generate.py translate --batches 1-144 --lang all \
    --prompts-dir ./prompts --data-root ./data_$lang
  python3 promote_draft.py --root ./data_$lang --all
done

# 점검
for lang in en kr; do
  echo "=== $lang ==="
  for d in data_$lang/*/; do
    batch=$(basename "$d")
    n=$(ls "$d" 2>/dev/null | grep -c '^[0-9]*-compact\.')
    [ "$n" -lt 6 ] && echo "  [문제] $lang/$batch : ${n}개"
  done
done

# 합본 (모든 언어, 모든 배치)
for lang in en kr; do
  for d in data_$lang/*/; do
    batch=$(basename "$d")
    python3 merge.py target "$d/${batch}-compact.target.json" --out "$d/${batch}-target.json"
    python3 merge.py $lang --mirror --base "$d/${batch}-target.json" --out "$d/${batch}-target.json"
    for other in en es fr pt kr jp zh; do
      [ "$other" = "$lang" ] && continue
      f="$d/${batch}-compact.${other}.json"
      [ -f "$f" ] && python3 merge.py $other "$f" --base "$d/${batch}-target.json" --out "$d/${batch}-target.json"
    done
  done
done
```

지금은 아직 배치 생성이 한 번도 안 돌아간 상태이므로, 1)부터 순서대로 진행하시면
됩니다. `GENERATOR_EN.md`/`GENERATOR_KR.md`는 기존 Manual A 내용을 파일명만 바꾼
것이라 이미 검증된 프롬프트지만, 새 폴더 구조(`--prompts-dir ./prompts`)로 처음
돌리는 것이니 경로 관련 오류가 나면 `load_target_manual()`이 찾는 위치
(`{prompts_dir}/GENERATOR_{LANG}.md`)가 맞는지 먼저 확인하세요.
