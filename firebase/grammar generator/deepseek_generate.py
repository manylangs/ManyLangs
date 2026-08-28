#!/usr/bin/env python3
"""
deepseek_generate.py — grammar 파이프라인용 DeepSeek 자동화 (텍스트 출력 버전).

conversation 파이프라인과 동일한 구조를 그대로 따른다:
GENERATOR/TRANSLATOR에게 JSON을 직접 쓰게 하지 않는다 (DeepSeek이 17블록짜리
중첩 JSON을 매번 정확히 만드는 데 반복적으로 실패하기 때문). 대신 모델에게는
"LEVEL: / CHAPTER_ID: / TITLE: 헤더 + EXP 1~5 / EX CORE 1~4 / EX VAR 1~4 /
EX EXT 1~4" 같은 평범한 텍스트만 쓰게 하고, text_parser.py가 이를 표준
스키마로 변환한다.

결과물은 두 단계로 나뉜다:
  1) {batch_id}-draft.{tag}.json  — 방금 생성됨, 아직 검수 안 됨
  2) {batch_id}-compact.{tag}.json — promote_draft.py로 검수 통과 후 승격,
     merge.py가 실제로 읽는 파일

이 스크립트는 1)까지만 만든다. 2)는 사람이 검수한 뒤 promote_draft.py로
별도 실행한다.

목표언어(target language)는 하드코딩하지 않는다. 새 목표언어를 추가하고
싶으면 prompts/GENERATOR_{LANG}.md 파일 하나만 새로 작성하면 되고 (해당
언어의 챕터 목록은 그 파일 안에 이미 잠겨 있어야 한다 — GENERATOR_EN.md의
155개 챕터, GENERATOR_KR.md의 210개 챕터처럼), 이 스크립트는 --target-lang
인자로 그 파일을 찾아서 호출한다. 번역 언어 7종은 languages.py의
TRANSLATE_LANGS 하나로만 관리된다.

MODE 1 — target
  prompts/GENERATOR_{TARGET_LANG}.md를 시스템 프롬프트로 호출해
  {batch_id}-draft.target.json을 저장한다. GENERATOR 파일 자체가 챕터
  목록을 잠그고 있으므로, 별도 레지스트리 파일은 필요 없다 (voca와 다른 점).

MODE 2 — translate
  {batch_id}-compact.target.json(승격된 것만!)을 읽어
  languages.translate_langs_for("target 자신 언어")로 번역 대상을 동적으로
  계산한 뒤, 각 언어의 prompts/TRANSLATOR_{LANG}.md를 병렬로 호출해
  {batch_id}-draft.{lang}.json을 저장한다.

  주의: translate 모드는 compact.target.json(승격본)만 읽는다.
  draft.target.json만 있고 아직 승격 안 됐다면 오류를 내고 멈춘다.

Usage:
  export DEEPSEEK_API_KEY="..."

  python3 deepseek_generate.py target \
      --target-lang en --batches 1-155 \
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
from text_parser import parse_grammar_text

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
    """파일명 규칙: {batch}-draft.{tag}.json (tag는 'target' 또는 언어약어)."""
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
    """'1-155' / '1,2,5-9' -> 정렬된 정수 리스트."""
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
        f"이 문서(GENERATOR)에 잠겨 있는 챕터 목록에서 BATCH_ID에 해당하는 챕터 1개를 "
        f"추출하고, GRAMMAR_SPEC 선언 및 내부 STEP 1~4(교정·QA)를 모두 수행한 뒤, "
        f"최종 결과만 다음 텍스트 형식으로 출력하라 (JSON, 코드펜스, 설명 금지):\n\n"
        f"LEVEL: <a1~c2>\n"
        f"CHAPTER_ID: <잠긴 목록의 ChapterID>\n"
        f"TITLE: <chapter_title>\n\n"
        f"EXP 1\n<문장>\n\nEXP 2\n<문장>\n\nEXP 3\n<문장>\n\nEXP 4\n<문장>\n\nEXP 5\n<문장>\n\n"
        f"EX CORE 1\n<문장>\n\nEX CORE 2\n<문장>\n\nEX CORE 3\n<문장>\n\nEX CORE 4\n<문장>\n\n"
        f"EX VAR 1\n<문장>\n\nEX VAR 2\n<문장>\n\nEX VAR 3\n<문장>\n\nEX VAR 4\n<문장>\n\n"
        f"EX EXT 1\n<문장>\n\nEX EXT 2\n<문장>\n\nEX EXT 3\n<문장>\n\nEX EXT 4\n<문장>\n"
    )

    print(f"\n[target] batch={batch_id_str} target_lang={target_lang} -- DeepSeek 호출 중...")
    raw = call_deepseek(generator_prompt, user_input, model, api_key)

    try:
        parsed = parse_grammar_text(raw, require_level_chapter=True)
    except ValueError as e:
        print(f"  [파싱 실패] {e}")
        print("  --- raw response (첫 500자) ---")
        print(raw[:500])
        return False

    parsed["id"] = batch_id_str
    parsed["lang"] = "target"
    parsed["target_lang"] = target_lang

    out_path = save_draft(data_root, batch_id_str, "target", parsed)
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
    level = target_compact.get("level", "")
    chapter_id = target_compact.get("chapter_id", "")

    lines = [
        f"BATCH_ID: {batch_id_str}",
        f"LEVEL: {level}",
        f"CHAPTER_ID: {chapter_id}",
        f"TITLE (target): {title_target}",
        "",
        "target EXP (grammar_explanation, 5개):",
    ]
    for i, sentence in enumerate(target_compact.get("explanations", []), start=1):
        lines.append(f"EXP {i}: {sentence}")

    lines.append("")
    lines.append("target EX CORE (grammar_example / core_patterns, 4개):")
    for i, sentence in enumerate(target_compact.get("core_patterns", []), start=1):
        lines.append(f"EX CORE {i}: {sentence}")

    lines.append("")
    lines.append("target EX VAR (grammar_example / variations, 4개):")
    for i, sentence in enumerate(target_compact.get("variations", []), start=1):
        lines.append(f"EX VAR {i}: {sentence}")

    lines.append("")
    lines.append("target EX EXT (grammar_example / extended_usage, 4개):")
    for i, sentence in enumerate(target_compact.get("extended_usage", []), start=1):
        lines.append(f"EX EXT {i}: {sentence}")

    lines.append("")
    lines.append(
        f"위 target을 기준으로 {lang}로 번역하라. 이 문서(TRANSLATOR)에 정의된 텍스트 "
        f"형식(TITLE: 헤더 + EXP 1~5 / EX CORE 1~4 / EX VAR 1~4 / EX EXT 1~4 블록, "
        f"각 블록 1문장)으로만 출력하라. 블록 개수·순서·의미는 target과 정확히 1:1로 "
        f"대응해야 한다. JSON, 코드펜스, 설명은 출력하지 않는다."
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
        parsed = parse_grammar_text(raw, require_level_chapter=False)
    except ValueError as e:
        print(f"  [파싱 실패] {e}")
        print("  --- raw response (첫 500자) ---")
        print(raw[:500])
        return False

    parsed["id"] = batch_id_str
    parsed["lang"] = lang

    out_path = save_draft(data_root, batch_id_str, lang, parsed)
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
                  f"(구버전 파일이면 --assume-target-lang en 처럼 지정하세요)")
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
    parser = argparse.ArgumentParser(description="DeepSeek generation for the grammar pipeline (text-output version).")
    sub = parser.add_subparsers(dest="mode", required=True)

    p_target = sub.add_parser("target", help="목표언어 챕터 배치 생성 (draft.json 저장).")
    p_target.add_argument("--target-lang", required=True,
                           help="목표언어 코드 (en/kr 등). "
                                "{prompts-dir}/GENERATOR_{LANG}.md가 있어야 함 (LANG은 대문자).")
    p_target.add_argument("--batch", help="배치 ID 1개 (예: 27)")
    p_target.add_argument("--batches", help="예: '1-155' 또는 '1,2,5-9'")
    p_target.add_argument("--prompts-dir", default="./prompts")
    p_target.add_argument("--data-root", default="./data")
    p_target.add_argument("--model", default="deepseek-chat")

    p_translate = sub.add_parser("translate", help="번역 언어 생성 (draft.json 저장, 승격된 target만 사용).")
    p_translate.add_argument("--lang", required=True,
                              help="languages.py TRANSLATE_LANGS 중 하나, 또는 'all'")
    p_translate.add_argument("--batch", help="배치 ID 1개")
    p_translate.add_argument("--batches", help="예: '1-155' 또는 '1,2,5-9'")
    p_translate.add_argument("--prompts-dir", default="./prompts")
    p_translate.add_argument("--data-root", default="./data")
    p_translate.add_argument("--model", default="deepseek-chat")
    p_translate.add_argument("--workers", type=int, default=4)
    p_translate.add_argument("--assume-target-lang", default=None,
                              help="target.compact.json에 target_lang 필드가 없는 "
                                   "구버전 배치를 위한 보정용 (예: en)")

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
