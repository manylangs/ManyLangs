# grammar 파이프라인 (conversation과 동일 구조로 재구성)

## 무엇이 바뀌었나

기존 grammar_generator.zip에는 검수 도구(checker.py, review.py, 검수/ 프롬프트)만
있었고, 실제 원문 생성 매뉴얼(en_grammar_v3_2.txt, kr_grammar_v6.md)은 8개 언어
컬럼을 한 번의 JSON 호출로 전부 만드는 구식 구조였습니다. 이번에 conversation
파이프라인과 동일하게 다음처럼 분리했습니다.

```
GENERATOR_{TARGET}.md   → target 언어 17블록만 생성 (텍스트, JSON 아님)
        ↓ 사람 검수
promote_draft.py         → draft → compact 승격
        ↓
TRANSLATOR_{LANG}.md × 7 → 승격된 target을 각 언어로 API 번역 (병렬)
        ↓ 사람 검수
promote_draft.py         → draft → compact 승격
        ↓
merge.py                 → compact들을 17블록 runtime JSON으로 병합
        ↓
checker.py / review.py   → 최종 검수 (기존 도구 그대로)
```

## 파일 구성

- `languages.py` — 번역 언어 목록 단일 소스 (en/es/fr/pt/kr/jp/zh, 7개, ru 없음)
- `text_parser.py` — GENERATOR/TRANSLATOR의 평문 출력(EXP 1~5 / EX CORE 1~4 /
  EX VAR 1~4 / EX EXT 1~4)을 JSON으로 파싱
- `deepseek_generate.py` — target/translate 2모드 DeepSeek 호출
- `promote_draft.py` — draft.json → compact.json 승격 (검수 게이트)
- `merge.py` — compact들을 checker.py가 기대하는 17블록 runtime 스키마로 병합
- `prompts/GENERATOR_EN.md`, `prompts/GENERATOR_KR.md` — target 생성기.
  en_grammar_v3_2.txt(155챕터) / kr_grammar_v6.md(210챕터)에서 GRAMMAR_SPEC
  선언·잠긴 챕터 목록·작문 규칙·QA 로직은 그대로 가져오고, 출력만 target 단일
  컬럼 텍스트로 바꿨습니다.
- `prompts/TRANSLATOR_{EN,ES,FR,PT,KR,JP,ZH}.md` — 번역기 7종. target이 어떤
  언어든 그대로 재사용됩니다 (target=en일 때는 TRANSLATOR_EN.md 대신
  merge.py --mirror 사용). 지역 표준·성별 일치·TTS 숫자 풀어쓰기·중국어 전각부호
  등 기존 검수 프롬프트에 있던 규칙을 생성 단계로 앞당겨 반영했습니다.
- `checker.py`, `review.py`, `검수/` — 기존 검수 도구, 변경 없음.

## 사용 예시

```bash
export DEEPSEEK_API_KEY="..."

# 1) target 생성 (EN, 배치 1~155)
python3 deepseek_generate.py target --target-lang en --batches 1-155 \
    --prompts-dir ./prompts --data-root ./data

# 2) 사람이 draft.target.json 검수 후 승격
python3 promote_draft.py data/001/001-draft.target.json

# 3) 7개 언어 번역 (병렬)
python3 deepseek_generate.py translate --batch 001 --lang all \
    --prompts-dir ./prompts --data-root ./data

# 4) 각 번역 검수 후 승격
python3 promote_draft.py data/001/001-draft.es.json
# ... (kr/fr/pt/jp/zh 동일, en은 target=en이면 스킵)

# 5) merge — target부터 시작해서 각 언어를 base에 누적
python3 merge.py target data/001/001-compact.target.json --out data/001/base.json
python3 merge.py es data/001/001-compact.es.json --base data/001/base.json --out data/001/base.json
# ... 나머지 언어도 동일하게 누적
python3 merge.py en --mirror --base data/001/base.json --out data/001/base.json   # target=en이면

# 6) 최종 파일명으로 복사 (checker.py가 이 이름을 찾음)
cp data/001/base.json data/001/grammar_001.runtime.json

# 7) 검수
python3 checker.py
```

## 알아둘 점

- `GENERATOR_EN.md`/`GENERATOR_KR.md`는 원본 매뉴얼의 도메인 규칙(챕터 목록,
  GRAMMAR_SPEC, QA 채점)을 그대로 옮겼지만, 실제 DeepSeek 호출로 몇 배치 테스트를
  아직 해보지 않았습니다. voca의 Manual A처럼 여러 배치 생성 후 결과를 보고
  다듬는 반복이 필요할 수 있습니다.
- `TRANSLATOR_*.md` 7종은 이번에 새로 작성한 파일입니다 (기존 검수 프롬프트의
  언어별 규칙을 생성 단계로 옮긴 것). conversation의 TRANSLATOR 파일들처럼
  batch를 여러 개 돌려보면서 다듬는 걸 권장합니다.
- `merge.py`가 만드는 파일명은 `{id}-target.json` 식 중간 산출물이며, 최종
  `grammar_{id}.runtime.json`으로는 마지막에 복사/이름변경이 필요합니다 (checker.py
  가 정확히 이 이름을 찾습니다).
- text_parser.py / merge.py / checker.py 스키마 정합성은 합성 데이터로
  end-to-end 테스트를 마쳤습니다 (checker.py 오류 0건 확인).
