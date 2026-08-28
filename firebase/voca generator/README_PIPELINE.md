# voca 파이프라인 (conversation과 동일한 폴더/파일명 컨벤션으로 재구성)

## 무엇이 바뀌었나

voca는 원래도 target 생성(Manual A) → 7개 언어 API 번역(translation_prompt_common)
→ merge → review 구조였기 때문에 큰 골격은 그대로입니다. 이번에 바꾼 것은
conversation/grammar 파이프라인과 똑같은 컨벤션으로 맞춘 부분입니다.

| 항목 | 이전 | 지금 |
|---|---|---|
| target 생성 프롬프트 | `문서/생성&검수&단어목록/{lang}/{lang}_voca_manual_A_target_generation_v3.md` | `prompts/GENERATOR_{LANG}.md` |
| 번역 프롬프트 | `문서/번역프롬프트/translation_prompt_common_{lang}_v3.md` | `prompts/TRANSLATOR_{LANG}.md` |
| 언어 목록 관리 | merge.py와 deepseek_generate.py에 각각 하드코딩 | `languages.py` 하나로 통일 |
| 생성 직후 저장 파일명 | `{batch}-{tag}.compact.json` (검수 게이트 없이 바로 compact) | `{batch}-draft.{tag}.json` → 사람 검수 → `promote_draft.py`로 승격 |

Manual A 자체의 `STAGE1_STATUS` 셀프체크(모델이 스스로 자기 출력을 검증)는
그대로 유지됩니다. 이번에 추가한 draft→promote 단계는 그것과 별개로, 사람이
실제로 훑어보고 명시적으로 승격하기 전까지는 최종 merge에 들어가지 않도록
막는 안전장치입니다 (conversation/grammar와 동일).

## 파일 구성

```
voca/
  languages.py            # 번역 언어 목록 단일 소스 (en/es/fr/pt/kr/jp/zh)
  deepseek_generate.py     # target/translate 2모드 DeepSeek 호출 (draft 저장)
  promote_draft.py         # draft.json → compact.json 승격 (검수 게이트)
  merge.py                 # compact들을 5블록 runtime JSON으로 병합
  review.py                # 기존 ALL_REPLACEMENTS 기반 수정 적용 + 검수
  voca_checker.py          # 기존 구조 검증기
  batch_convert.py / run_merge.sh / negation_scope_rescan.py /
  check_titles.py / scan_all_mz.py / core_word_scanner.py   # 기존 유틸, 변경 없음
  prompts/
    GENERATOR_EN.md         # 구 en_voca_manual_A_target_generation_v3.md (내용 동일, 이름만 변경)
    GENERATOR_KR.md         # 구 kr_voca_manual_A_target_generation_v3.md
    TRANSLATOR_EN.md ~ TRANSLATOR_ZH.md (7개)   # 구 translation_prompt_common_*_v3.md
  word_lists/
    en/, kr/                # 기존 CEFR 단어 목록(rtf)과 검수 프롬프트, 참고용 원본 보관
  data/                     # 기존 144개 배치 폴더 스캐폴딩 (내용 비어있음, 그대로 유지)
```

## 사용 예시

```bash
export DEEPSEEK_API_KEY="..."

# 1) target 생성 (EN, 레벨 A1, 배치 1~24)
python3 deepseek_generate.py target --target-lang en --level A1 --batches 1-24 \
    --prompts-dir ./prompts --data-root ./data

# 2) 사람이 draft.target.json 검수 후 승격
python3 promote_draft.py data/001/001-draft.target.json

# 3) 7개 언어 번역 (병렬)
python3 deepseek_generate.py translate --batch 001 --lang all \
    --prompts-dir ./prompts --data-root ./data

# 4) 각 번역 검수 후 승격 (en은 target=en이면 스킵, mirror로 처리)
python3 promote_draft.py data/001/001-draft.es.json
# ... kr/fr/pt/jp/zh 동일

# 5) merge — target부터 시작해서 각 언어를 base에 누적
python3 merge.py target data/001/001-compact.target.json --out data/001/001-target.json
python3 merge.py es data/001/001-compact.es.json --base data/001/001-target.json --out data/001/001-target.json
# ... 나머지 언어도 동일하게 누적
python3 merge.py en --mirror --base data/001/001-target.json --out data/001/001-target.json   # target=en이면

# 6) 검수
python3 voca_checker.py
```

## 검증한 것

- 새 `deepseek_generate.py`가 `prompts/GENERATOR_{LANG}.md` / `TRANSLATOR_{LANG}.md`
  경로를 정확히 찾는지, draft.json으로 저장하는지 코드 경로 확인
- `promote_draft.py`로 draft → compact 승격 (합성 데이터로 실행, 성공)
- `merge.py`로 target + kr compact를 병합하고 나머지 5개 언어를 mirror로 채운
  뒤 8개 컬럼(target/en/es/fr/pt/kr/jp/zh)이 title/word/examples 전부에
  정확히 채워지는지 확인 (합성 데이터, 정상 동작 확인)

## 알아둘 점

- `prompts/GENERATOR_*.md`, `TRANSLATOR_*.md`의 실제 **내용은 원본과 동일**합니다
  (파일 위치·이름만 conversation 컨벤션에 맞춤). 프롬프트 자체의 문구를
  수정하지는 않았습니다.
- `word_lists/en`, `word_lists/kr`에는 기존 CEFR 단어 목록(rtf 6개씩)과
  검수 프롬프트(voca_{lang}_검수프롬프트_v4.md)를 그대로 보관했습니다 — 이번
  구조 변경과 무관한 참고 자료라 손대지 않았습니다.
- 실제 DeepSeek API 호출 테스트는 하지 않았습니다 (API 키 필요). 코드 경로와
  파일 스키마 정합성만 합성 데이터로 확인했습니다.
