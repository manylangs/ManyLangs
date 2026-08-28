#!/usr/bin/env python3
"""
deepseek_generate.py — conversation 파이프라인용 DeepSeek 자동화 (텍스트 출력 버전).

v2 변경점: GENERATOR/TRANSLATOR에게 JSON을 직접 쓰게 하지 않는다.
DeepSeek이 중첩 JSON(따옴표 이스케이프, 키 이름, 중첩 구조)을 매번
정확히 만드는 데 반복적으로 실패했기 때문이다 (관찰된 실패: sets 키가
"001"/"set1"/"set_1"로 제각각, 값이 리스트/딕셔너리로 제각각, 문장 안
따옴표 이스케이프 누락으로 JSON 자체가 깨짐 등). 대신 모델에게는
"LEVEL: / TITLE: / SET 001 / A: 문장" 같은 평범한 텍스트만 쓰게 하고,
text_parser.py가 이를 표준 스키마로 변환한다.

결과물은 이제 두 단계로 나뉜다:
  1) {batch_id}-draft.{tag}.json  — 방금 생성됨, 아직 검수 안 됨
  2) {batch_id}-{tag}.compact.json — promote_draft.py로 검수 통과 후 승격,
     merge.py가 실제로 읽는 파일

이 스크립트는 1)까지만 만든다. 2)는 EVAL_PROMPT.md/REVIEW_PROMPT.md로
검수한 뒤 promote_draft.py로 별도 실행한다.

목표언어(target language)는 하드코딩하지 않는다. 새 목표언어를
추가하고 싶으면 prompts/GENERATOR_{LANG}.md 파일 하나만 새로 작성하면
되고, 이 스크립트는 --target-lang 인자로 그 파일을 찾아서 호출한다.
번역 언어 8종은 languages.py의 TRANSLATE_LANGS 하나로만 관리된다.

MODE 1 — target
  prompts/GENERATOR_{TARGET_LANG}.md를 시스템 프롬프트로 호출해
  {batch_id}-draft.target.json을 저장한다.

MODE 2 — translate
  {batch_id}-target.compact.json(승격된 것만!)의 target_lang을 읽어
  languages.translate_langs_for(target_lang)로 번역 대상을 동적으로
  계산한 뒤, 각 언어의 prompts/TRANSLATOR_{LANG}.md를 병렬로 호출해
  {batch_id}-draft.{lang}.json을 저장한다.

  주의: translate 모드는 compact.target.json(승격본)만 읽는다.
  draft.target.json만 있고 아직 승격 안 됐다면 오류를 내고 멈춘다 —
  검수 안 된 target을 기준으로 8개 언어를 번역해버리는 사고를 막기 위함.

Usage:
  export DEEPSEEK_API_KEY="..."

  python3 deepseek_generate.py target \
      --target-lang es --batches 1-60 \
      --prompts-dir ./prompts --data-root ./data

  # (검수 후) promote_draft.py로 target을 compact.json으로 승격 -- 별도 실행

  python3 deepseek_generate.py translate \
      --batch 001 --lang all \
      --prompts-dir ./prompts --data-root ./data
"""

import argparse
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from languages import TRANSLATE_LANGS, translate_langs_for
from text_parser import parse_conversation_text

DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

GENERATOR_FILENAME = "GENERATOR_{LANG}.md"
TRANSLATOR_FILENAME = "TRANSLATOR_{LANG}.md"


# ---------------------------------------------------------------------------
# DeepSeek 호출
# ---------------------------------------------------------------------------

def call_deepseek(system_prompt, user_input, model, api_key, timeout=120):
    import requests

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_input},
        ],
        "temperature": 0.4,
        "max_tokens": 8000,
    }
    resp = requests.post(DEEPSEEK_URL, headers=headers, json=payload, timeout=timeout)
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"]


# ---------------------------------------------------------------------------
# 파일 I/O
# ---------------------------------------------------------------------------

def load_prompt(prompts_dir, filename):
    path = Path(prompts_dir) / filename
    if not path.exists():
        raise FileNotFoundError(f"프롬프트 파일 없음: {path}")
    return path.read_text(encoding="utf-8")


def save_draft(data_root, batch_id_str, tag, obj):
    """파일명 규칙: {batch}-draft.{tag}.json (tag는 'target' 또는 언어약어).
    '단계(draft/compact)'가 항상 맨 앞에 오므로, 검수기가 *-compact.*.json
    글롭 하나로 승격된 파일 전체를 스캔할 수 있다."""
    import json
    out_dir = Path(data_root) / batch_id_str
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{batch_id_str}-draft.{tag}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")
    return out_path


def load_target_compact(data_root, batch_id_str):
    """translate 모드는 반드시 승격된(compact.target.json) target만 읽는다."""
    import json
    path = Path(data_root) / batch_id_str / f"{batch_id_str}-compact.target.json"
    if not path.exists():
        draft_path = Path(data_root) / batch_id_str / f"{batch_id_str}-draft.target.json"
        if draft_path.exists():
            raise FileNotFoundError(
                f"batch {batch_id_str}: compact.target.json 없음, draft.target.json만 있음. "
                f"먼저 검수 후 promote_draft.py로 승격하세요: "
                f"python3 promote_draft.py {draft_path}"
            )
        raise FileNotFoundError(
            f"batch {batch_id_str}: compact.target.json 없음 (target 모드를 먼저 실행하세요): {path}"
        )
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def parse_batch_spec(spec):
    """'1-60' / '1,2,5-9' -> 정렬된 정수 리스트."""
    if not spec:
        return []
    out = set()
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            a, b = part.split("-", 1)
            out.update(range(int(a), int(b) + 1))
        else:
            out.add(int(part))
    return sorted(out)


# ---------------------------------------------------------------------------
# MODE 1: target
# ---------------------------------------------------------------------------

def run_target_batch(global_batch_id, target_lang, generator_prompt, data_root, model, api_key):
    batch_id_str = f"{global_batch_id:03d}"
    user_input = (
        f"BATCH_ID: {batch_id_str}\n\n"
        f"이 문서(GENERATOR)의 12장/14장에 정의된 텍스트 형식(LEVEL:/CHAPTER_ID:/"
        f"TITLE: 헤더 + 'SET 001'~'SET 010' 블록, 각 블록 안에 화자 라벨과 함께 "
        f"6줄)으로만 출력하라. JSON, 코드펜스, 설명은 출력하지 않는다."
    )

    print(f"\n[target] batch={batch_id_str} target_lang={target_lang} -- DeepSeek 호출 중...")
    raw = call_deepseek(generator_prompt, user_input, model, api_key)

    try:
        block = parse_conversation_text(raw, require_level_chapter=True)
    except ValueError as e:
        print(f"  [파싱 실패] {e}")
        print("  --- raw response (첫 500자) ---")
        print(raw[:500])
        return False

    block["id"] = batch_id_str
    block["lang"] = "target"
    block["target_lang"] = target_lang

    out_path = save_draft(data_root, batch_id_str, "target", block)
    print(f"  [저장] {out_path}  (검수 후 promote_draft.py로 승격 필요)")
    return True


def run_target(args, api_key):
    global_batches = parse_batch_spec(args.batches) if args.batches else \
        [int(args.batch)] if args.batch else []
    if not global_batches:
        print("[오류] --batches 또는 --batch 를 지정하세요.", file=sys.stderr)
        sys.exit(1)

    filename = GENERATOR_FILENAME.format(LANG=args.target_lang.upper())
    generator_prompt = load_prompt(args.prompts_dir, filename)
    print(f"[준비 완료] target_lang={args.target_lang} -- {filename} 로드됨 "
          f"({len(generator_prompt)} bytes)")

    ok, fail = 0, 0
    for gb in global_batches:
        try:
            success = run_target_batch(
                gb, args.target_lang, generator_prompt, args.data_root, args.model, api_key,
            )
        except Exception as e:
            print(f"  [예외] batch={gb:03d}: {e}")
            success = False
        ok += success
        fail += not success

    print(f"\n[target 완료] 성공 {ok}건, 실패 {fail}건")


# ---------------------------------------------------------------------------
# MODE 2: translate
# ---------------------------------------------------------------------------

def build_translation_user_input(target_compact, lang, batch_id_str):
    title_target = target_compact.get("title", "")
    sets = target_compact.get("sets", {})

    lines = [f"BATCH_ID: {batch_id_str}", f"TITLE (target): {title_target}", "", "target sets:"]
    for set_id in sorted(sets.keys()):
        lines.append(f"SET {set_id}")
        for i, sentence in enumerate(sets[set_id]):
            speaker = "A" if i % 2 == 0 else "B"
            lines.append(f"{speaker}: {sentence}")
        lines.append("")

    lines.append(
        f"위 target을 기준으로 {lang}로 번역하라. 이 문서(TRANSLATOR)에 정의된 "
        f"텍스트 형식(TITLE: 헤더 + 'SET 001'~'SET 010' 블록, 각 블록 안에 "
        f"화자 라벨과 함께 6줄)으로만 출력하라. JSON, 코드펜스, 설명은 출력하지 않는다."
    )
    return "\n".join(lines)


def run_translate_one(global_batch_id, lang, prompts_dir, data_root, model, api_key):
    batch_id_str = f"{global_batch_id:03d}"

    try:
        target_compact = load_target_compact(data_root, batch_id_str)
    except FileNotFoundError as e:
        print(f"  [오류] {e}")
        return False

    filename = TRANSLATOR_FILENAME.format(LANG=lang.upper())
    prompt_text = load_prompt(prompts_dir, filename)
    user_input = build_translation_user_input(target_compact, lang, batch_id_str)

    print(f"\n[translate] batch={batch_id_str} lang={lang} -- DeepSeek 호출 중...")
    raw = call_deepseek(prompt_text, user_input, model, api_key)

    try:
        block = parse_conversation_text(raw, require_level_chapter=False)
    except ValueError as e:
        print(f"  [파싱 실패] {e}")
        print("  --- raw response (첫 500자) ---")
        print(raw[:500])
        return False

    block["id"] = batch_id_str
    block["lang"] = lang

    out_path = save_draft(data_root, batch_id_str, lang, block)
    print(f"  [저장] {out_path}  (검수 후 promote_draft.py로 승격 필요)")
    return True


def run_translate(args, api_key):
    global_batches = parse_batch_spec(args.batches) if args.batches else \
        [int(args.batch)] if args.batch else []
    if not global_batches:
        print("[오류] --batches 또는 --batch 를 지정하세요.", file=sys.stderr)
        sys.exit(1)

    tasks = []
    for gb in global_batches:
        batch_id_str = f"{gb:03d}"
        try:
            target_compact = load_target_compact(args.data_root, batch_id_str)
        except FileNotFoundError as e:
            print(f"[오류] {e}")
            continue

        target_lang = target_compact.get("target_lang") or args.assume_target_lang
        if not target_lang:
            print(f"[오류] batch={batch_id_str}: target_lang 정보 없음 "
                  f"(구버전 파일이면 --assume-target-lang kr 처럼 지정하세요)")
            continue

        available = translate_langs_for(target_lang)
        if args.lang == "all":
            langs = available
        else:
            if args.lang not in TRANSLATE_LANGS:
                print(f"[오류] 알 수 없는 언어: {args.lang}", file=sys.stderr)
                sys.exit(1)
            if args.lang == target_lang:
                print(f"[건너뜀] batch={batch_id_str}: lang={args.lang}은 target 자신 "
                      f"-- merge.py --mirror로 처리, DeepSeek 호출 불필요")
                continue
            langs = [args.lang]

        for lang in langs:
            tasks.append((gb, lang))

    ok, fail = 0, 0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {
            pool.submit(run_translate_one, gb, lang, args.prompts_dir, args.data_root,
                        args.model, api_key): (gb, lang)
            for gb, lang in tasks
        }
        for future in as_completed(futures):
            gb, lang = futures[future]
            try:
                success = future.result()
            except Exception as e:
                print(f"  [예외] batch={gb:03d} lang={lang}: {e}")
                success = False
            ok += success
            fail += not success

    print(f"\n[translate 완료] 성공 {ok}건, 실패 {fail}건")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="DeepSeek generation for the conversation pipeline (text-output version).")
    sub = parser.add_subparsers(dest="mode", required=True)

    p_target = sub.add_parser("target", help="목표언어 TARGET_BLOCK 배치 생성 (draft.json 저장).")
    p_target.add_argument("--target-lang", required=True,
                           help="목표언어 코드 (kr/en/de 등). "
                                "{prompts-dir}/GENERATOR_{LANG}.md가 있어야 함 (LANG은 대문자).")
    p_target.add_argument("--batch", help="배치 ID 1개 (1-60)")
    p_target.add_argument("--batches", help="예: '1-60' 또는 '1,2,5-9'")
    p_target.add_argument("--prompts-dir", default="./prompts")
    p_target.add_argument("--data-root", default="./data")
    p_target.add_argument("--model", default="deepseek-chat")

    p_translate = sub.add_parser("translate", help="번역 언어 생성 (draft.json 저장, 승격된 target만 사용).")
    p_translate.add_argument("--lang", required=True,
                              help="languages.py TRANSLATE_LANGS 중 하나, 또는 'all'")
    p_translate.add_argument("--batch", help="배치 ID 1개 (1-60)")
    p_translate.add_argument("--batches", help="예: '1-60' 또는 '1,2,5-9'")
    p_translate.add_argument("--prompts-dir", default="./prompts")
    p_translate.add_argument("--data-root", default="./data")
    p_translate.add_argument("--model", default="deepseek-chat")
    p_translate.add_argument("--workers", type=int, default=4)
    p_translate.add_argument("--assume-target-lang", default=None,
                              help="target.compact.json에 target_lang 필드가 없는 "
                                   "구버전 배치를 위한 보정용 (예: kr)")

    args = parser.parse_args()

    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        print("[오류] DEEPSEEK_API_KEY 환경변수가 없습니다.", file=sys.stderr)
        sys.exit(1)

    if args.mode == "target":
        run_target(args, api_key)
    elif args.mode == "translate":
        run_translate(args, api_key)


if __name__ == "__main__":
    main()
