#!/usr/bin/env python3
"""
deepseek_generate.py — voca 파이프라인용 DeepSeek 자동화.

conversation/grammar 파이프라인과 동일한 파일명·폴더 컨벤션으로 재구성한
버전이다 (원래 voca 스크립트는 이미 target→translate 2모드 구조였지만,
prompts 폴더 레이아웃과 언어 목록 관리가 conversation과 달랐다). 바뀐 점:

- 프롬프트 파일: `{prompts_dir}/{lang}/{lang}_voca_manual_A_target_generation_v3.md`
  → `{prompts_dir}/GENERATOR_{LANG}.md` (평평한 단일 폴더, conversation과 동일)
- 프롬프트 파일: `{prompts_dir}/translation_prompt_common_{lang}_v3.md`
  → `{prompts_dir}/TRANSLATOR_{LANG}.md`
- 언어 목록: languages.py 하나로 관리 (기존에는 이 파일과 merge.py에
  각각 하드코딩돼 있었음)
- 저장 파일명: `{batch}-{tag}.compact.json` (직접 저장) →
  `{batch}-draft.{tag}.json`로 먼저 저장한 뒤, 사람이 검수하고
  promote_draft.py로 `{batch}-compact.{tag}.json`으로 승격 (conversation과
  동일한 draft→검수→승격 게이트 추가). Manual A 자체의 STAGE1_STATUS
  자체 검증은 여전히 유효하지만, 그건 "모델 스스로의 셀프체크"이고
  이 draft/promote 단계는 "사람의 최종 검수 게이트"로 별도 기능이다.

MODE 1 — target
  GENERATOR_{TARGET_LANG}.md(구 Manual A)를 호출해 LEVEL+BATCH_ID 1개를
  생성한다. TARGET_BLOCK JSON + STAGE1_STATUS + FLAG 트레일러(Manual A
  5장)를 파싱하고, 모든 예문에서 리터럴 "FLAG: <reason>"을 스캔해 즉시
  출력한 뒤:
      {data_root}/{batch_id}/{batch_id}-draft.target.json
  으로 저장한다. STAGE1_STATUS: FAIL 응답은 저장하지 않는다.

MODE 2 — translate
  7개 언어별 TRANSLATOR_{LANG}.md(구 translation_prompt_common)를 호출해
  그 배치의 승격된 {batch_id}-compact.target.json을 원천으로 번역한다
  (core/meaning_zone/example situations per block). 단일
  TRANSLATION_BLOCK JSON 객체를 파싱하고, FLAG를 스캔한 뒤:
      {data_root}/{batch_id}/{batch_id}-draft.{lang}.json
  으로 저장한다. --lang all로 7개 언어를 동시에 실행할 수 있다.

Usage:
  export DEEPSEEK_API_KEY="..."

  # target generation (EN-target pipeline, level A1, batches 1-24)
  python3 deepseek_generate.py target \
      --target-lang en --level A1 --batches 1-24 \
      --prompts-dir ./prompts --data-root ./data

  # (검수 후) promote_draft.py로 target을 compact.json으로 승격 -- 별도 실행

  # translation for one batch, all 7 languages
  python3 deepseek_generate.py translate \
      --batch 001 --lang all \
      --prompts-dir ./prompts --data-root ./data

  # translation for a batch range, single language
  python3 deepseek_generate.py translate \
      --batches 1-24 --lang es \
      --prompts-dir ./prompts --data-root ./data
"""

import argparse
import json
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from languages import TRANSLATE_LANGS, translate_langs_for

DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

GENERATOR_FILENAME = "GENERATOR_{LANG}.md"
TRANSLATOR_FILENAME = "TRANSLATOR_{LANG}.md"

TRANSLATION_PROMPT_FILENAME = {
    lang: TRANSLATOR_FILENAME.format(LANG=lang.upper())
    for lang in TRANSLATE_LANGS
}

ALL_TRANSLATE_LANGS = list(TRANSLATE_LANGS)

LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]


# ---------------------------------------------------------------------------
# Registry parsing (target-language-agnostic — works on any manual whose
# Section 3.7 follows the "IDX.ConceptID:word / IDX.ConceptID:word / ..."
# format, one level block per "**=== LEVEL (001~120) ===**" header)
# ---------------------------------------------------------------------------

def parse_registry(manual_text):
    """Extract the full 720-word registry (Section 3.7) as
    {LEVEL: [(idx, concept_id, word), ...]} with exactly 120 entries per
    level. Raises ValueError if the manual doesn't match the expected
    structure -- this is deliberately strict so a malformed/edited manual
    fails loudly instead of silently extracting a wrong batch."""
    section_match = re.search(r"## 3\.7.*?(?=## 3\.8)", manual_text, re.DOTALL)
    if not section_match:
        raise ValueError("Section 3.7 (registry) ... Section 3.8 marker not found in manual")
    section = section_match.group(0)

    registry = {}
    for i, lvl in enumerate(LEVELS):
        next_lvl = LEVELS[i + 1] if i + 1 < len(LEVELS) else None
        if next_lvl:
            block_match = re.search(
                rf"\*\*=== {lvl} \(001~120\) ===\*\*\n\n(.*?)(?=\*\*=== {next_lvl})",
                section, re.DOTALL)
        else:
            block_match = re.search(
                rf"\*\*=== {lvl} \(001~120\) ===\*\*\n\n(.*)",
                section, re.DOTALL)
        if not block_match:
            raise ValueError(f"level block not found in registry: {lvl}")

        raw = block_match.group(1)
        # entries wrap across physical lines for readability; joining with a
        # single space reconstructs multi-word target_words correctly since
        # the original wrap points are themselves spaces (e.g. "go up",
        # "identify cause")
        joined = " ".join(line.strip() for line in raw.splitlines())
        entries_raw = [e.strip() for e in joined.split(" / ") if e.strip()]

        entries = []
        for e in entries_raw:
            m = re.match(r"^(\d{3})\.([A-Za-z0-9_]+):(.+)$", e)
            if not m:
                raise ValueError(f"[{lvl}] failed to parse registry entry: {e!r}")
            idx, concept_id, word = m.groups()
            entries.append((idx, concept_id, word.strip()))

        if len(entries) != 120:
            raise ValueError(f"[{lvl}] expected 120 entries, got {len(entries)}")

        registry[lvl] = entries

    return registry


def get_batch_words(registry, level, local_batch):
    """local_batch is 1-24. Returns the 5 (idx, concept_id, word) tuples
    for that batch, per the manual's own formula (Section 3):
    start_index = (batch-1)*5 + 1."""
    if level not in registry:
        raise ValueError(f"unknown level: {level}")
    if not (1 <= local_batch <= 24):
        raise ValueError(f"local_batch out of range (1-24): {local_batch}")
    start = (local_batch - 1) * 5
    return registry[level][start:start + 5]


def strip_registry_for_prompt(manual_text):
    """Remove the raw Section 3.7 word list from the text sent to the API
    (it can be ~45% of the file's size) and replace it with a short note.
    The 5 words for this specific batch are given explicitly in the user
    message instead (build_target_user_input), so the model never needs
    the other 715 words to do STEP 1/2 correctly."""
    section_match = re.search(r"## 3\.7.*?(?=## 3\.8)", manual_text, re.DOTALL)
    if not section_match:
        # unexpected shape -- fail safe by sending the manual unmodified
        # rather than silently guessing where to cut
        return manual_text
    placeholder = (
        "## 3.7 Locked Registry - IDX | ConceptID | target_word (per level)\n\n"
        "[Registry data omitted from this prompt to save tokens. The 5 items "
        "for this specific batch have already been extracted per the Section 3 "
        "batch calculation and are provided explicitly in the user message below "
        "as 'IDX.ConceptID:target_word'. Treat them as sourced verbatim from the "
        "locked registry -- do not alter, reorder, or substitute them.]\n\n"
    )
    return manual_text[:section_match.start()] + placeholder + manual_text[section_match.end():]


def level_and_local_batch(global_batch_id: int):
    """001~144 -> (LEVEL, local batch 1-24), matching review.py's mapping
    comment (001-024=a1, 025-048=a2, ... 121-144=c2)."""
    idx = global_batch_id - 1
    level = LEVELS[idx // 24]
    local = (idx % 24) + 1
    return level, local


def parse_batch_spec(spec):
    """'1-144' / '1,2,5-9' -> sorted list of ints."""
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
# DeepSeek call
# ---------------------------------------------------------------------------

def call_deepseek(prompt_text, user_input, model, api_key, timeout=120):
    import requests

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": prompt_text},
            {"role": "user", "content": user_input},
        ],
        "temperature": 0.4,
        "max_tokens": 4000,
    }
    resp = requests.post(DEEPSEEK_URL, headers=headers, json=payload, timeout=timeout)
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"]


# ---------------------------------------------------------------------------
# Response parsing (robust to prose wrapped around the JSON block)
# ---------------------------------------------------------------------------

def extract_first_json_object(text):
    """Find the first balanced {...} in text and parse it. Returns
    (obj, start_index, end_index) or raises ValueError."""
    start = text.find("{")
    if start == -1:
        raise ValueError("no '{' found in response")
    depth = 0
    in_string = False
    escape = False
    for i in range(start, len(text)):
        ch = text[i]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                return json.loads(text[start:end]), start, end
    raise ValueError("unbalanced braces in response")


def parse_target_response(raw_text):
    """Manual A Section 5 format:
        {TARGET_BLOCK JSON}
        STAGE1_STATUS: PASS
        FLAG: {content} or NONE
    Returns (block_json, status, batch_flag_text)."""
    block, start, end = extract_first_json_object(raw_text)
    tail = raw_text[end:]

    status_match = re.search(r"STAGE1_STATUS:\s*(PASS|FAIL[^\n]*)", tail)
    status = status_match.group(1).strip() if status_match else "UNKNOWN"

    flag_match = re.search(r"^FLAG:\s*(.+)$", tail, flags=re.MULTILINE)
    batch_flag = flag_match.group(1).strip() if flag_match else "NONE"

    return block, status, batch_flag


def scan_example_flags(block_json, batch_id, lang_keys):
    """Walk every block's examples and report any literal 'FLAG: ...'
    value. lang_keys = which keys inside each example dict to check
    (e.g. ['target','en'] for a target-mode block, or ['es'] for a
    single-language translation block). Returns list of flag dicts and
    also prints them immediately."""
    found = []
    for block in block_json.get("blocks", []):
        block_id = block.get("id", "?")
        for idx, example in enumerate(block.get("examples", []), start=1):
            if not isinstance(example, dict):
                continue
            for lang in lang_keys:
                val = example.get(lang)
                if isinstance(val, str) and val.startswith("FLAG:"):
                    reason = val[len("FLAG:"):].strip()
                    item = {
                        "batch_id": batch_id,
                        "block_id": block_id,
                        "example_index": idx,
                        "lang": lang,
                        "reason": reason,
                    }
                    found.append(item)
                    print(f"[FLAG] batch={batch_id} block={block_id} "
                          f"example={idx} lang={lang}: {reason}")
    return found


# ---------------------------------------------------------------------------
# File I/O
# ---------------------------------------------------------------------------

def load_prompt(prompts_dir, filename):
    path = Path(prompts_dir) / filename
    if not path.exists():
        raise FileNotFoundError(f"prompt file not found: {path}")
    return path.read_text(encoding="utf-8")


def load_target_manual(prompts_dir, lang):
    """Target generator prompts live flat in prompts_dir, conversation-style:
        {prompts_dir}/GENERATOR_{LANG}.md
    A new target language only ever needs a new GENERATOR_{LANG}.md file
    here -- no script change required."""
    filename = GENERATOR_FILENAME.format(LANG=lang.upper())
    path = Path(prompts_dir) / filename
    if not path.exists():
        raise FileNotFoundError(
            f"target generator prompt not found: {path}\n"
            f"  expected layout: {{prompts_dir}}/GENERATOR_{{LANG}}.md"
        )
    return path.read_text(encoding="utf-8")


def save_draft(data_root, batch_id_str, tag, obj):
    """파일명 규칙: {batch}-draft.{tag}.json (tag는 'target' 또는 언어약어).
    conversation/grammar 파이프라인과 동일하게, 검수 전 단계는 항상
    draft.로 시작한다."""
    out_dir = Path(data_root) / batch_id_str
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{batch_id_str}-draft.{tag}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")
    return out_path


def load_target_compact(data_root, batch_id_str):
    """translate 모드는 반드시 승격된(compact.target.json) target만 읽는다."""
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
            f"target compact not found for batch {batch_id_str}: {path} "
            f"(run `target` mode for this batch first, then promote_draft.py)"
        )
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# MODE 1: target
# ---------------------------------------------------------------------------

def build_target_user_input(level, local_batch, batch_words):
    """batch_words: list of (idx, concept_id, word) tuples, already sliced
    from the registry for this exact batch."""
    lines = [
        f"LEVEL: {level}, BATCH_ID: {local_batch:03d}",
        "",
        "The following 5 items are this batch, already extracted from the "
        "locked registry per the Section 3 batch calculation. Use them "
        "verbatim for STEP 1 -- no registry list is included in this "
        "prompt, so do not attempt to re-derive or look these up elsewhere:",
    ]
    for idx, concept_id, word in batch_words:
        lines.append(f"  {idx}.{concept_id}:{word}")
    return "\n".join(lines)


def preview_batch_words(batch_id_str, level, local_batch, batch_words):
    print(f"\n[target] batch={batch_id_str} (LEVEL={level}, local={local_batch:03d}) "
          f"-- extracted 5 words:")
    for idx, concept_id, word in batch_words:
        print(f"    {idx}.{concept_id}:{word}")


def run_target_batch(global_batch_id, target_lang, registry, prompt_template,
                      data_root, model, api_key, confirm=False):
    batch_id_str = f"{global_batch_id:03d}"
    level, local_batch = level_and_local_batch(global_batch_id)

    batch_words = get_batch_words(registry, level, local_batch)
    preview_batch_words(batch_id_str, level, local_batch, batch_words)

    if confirm:
        answer = input("  진행할까요? [Enter=예, s=건너뛰기]: ").strip().lower()
        if answer == "s":
            print("  -- 건너뜀 --")
            return False

    user_input = build_target_user_input(level, local_batch, batch_words)

    print(f"  -- calling DeepSeek (target_lang={target_lang})...")

    raw = call_deepseek(prompt_template, user_input, model, api_key)

    try:
        block, status, batch_flag = parse_target_response(raw)
    except ValueError as e:
        print(f"  [오류] 응답 파싱 실패: {e}")
        print("  --- raw response (first 500 chars) ---")
        print(raw[:500])
        return False

    if status != "PASS":
        print(f"  [실패] STAGE1_STATUS={status} -- 저장하지 않음")
        return False

    if batch_flag and batch_flag != "NONE":
        print(f"  [배치 FLAG] {batch_flag}")

    mirror_key = target_lang  # e.g. 'en' or 'kr' -- the mirror column name
    scan_example_flags(block, batch_id_str, ["target", mirror_key])

    out_path = save_draft(data_root, batch_id_str, "target", block)
    print(f"  [저장] {out_path}  (검수 후 promote_draft.py로 승격 필요)")
    return True


def run_target(args, api_key):
    global_batches = parse_batch_spec(args.batches) if args.batches else \
        [int(args.batch)] if args.batch else []
    if not global_batches:
        print("[오류] --batches 또는 --batch 를 지정하세요.", file=sys.stderr)
        sys.exit(1)

    raw_manual = load_target_manual(args.prompts_dir, args.target_lang)
    registry = parse_registry(raw_manual)
    prompt_template = strip_registry_for_prompt(raw_manual)

    print(f"[준비 완료] target_lang={args.target_lang}, 레지스트리 720단어 파싱됨, "
          f"프롬프트 크기 {len(raw_manual)} -> {len(prompt_template)} bytes "
          f"(레지스트리 원문 제외, 배치당 5단어만 별도 전달)")

    ok, fail = 0, 0
    for gb in global_batches:
        if gb < 1 or gb > 144:
            print(f"[경고] batch {gb} 범위(1-144) 밖 -- 스킵")
            continue
        try:
            success = run_target_batch(
                gb, args.target_lang, registry, prompt_template,
                args.data_root, args.model, api_key, confirm=args.confirm,
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
    """Assemble the 'Input Received' content each translation prompt expects
    (Section 3): batch id, target language name, and per block: block id,
    core+meaning_zone (as glosses), and the 3 example sentences as context.
    POS/DOMAIN/POLYSEMY_FLAG/CULTURAL_FLAG are not available (not persisted
    in the target compact file -- see script docstring)."""
    meta = target_compact.get("meta", {})
    level = meta.get("level", "")
    title_target = target_compact.get("title", {}).get("target", "")

    lines = [
        f"BATCH_ID: {batch_id_str}",
        f"LEVEL: {level}",
        f"TITLE (target): {title_target}",
        "",
        "Blocks:",
    ]
    for block in target_compact.get("blocks", []):
        word_target = block.get("word", {}).get("target", {})
        core = word_target.get("core", "")
        meaning_zone = word_target.get("meaning_zone", [])
        examples = block.get("examples", [])
        ex_texts = [e.get("target", "") for e in examples]

        lines.append(f"- id: {block.get('id')}")
        lines.append(f"  target core: {core}")
        lines.append(f"  target meaning_zone: {meaning_zone}")
        lines.append(f"  target examples (declarative/negative/question): {ex_texts}")

    lines.append("")
    lines.append(f"Produce the {lang} TRANSLATION_BLOCK per Section 7 of this prompt.")
    return "\n".join(lines)


def run_translate_one(global_batch_id, lang, prompts_dir, data_root, model, api_key):
    batch_id_str = f"{global_batch_id:03d}"

    try:
        target_compact = load_target_compact(data_root, batch_id_str)
    except FileNotFoundError as e:
        print(f"  [오류] {e}")
        return False

    prompt_filename = TRANSLATION_PROMPT_FILENAME[lang]
    prompt_text = load_prompt(prompts_dir, prompt_filename)

    user_input = build_translation_user_input(target_compact, lang, batch_id_str)

    print(f"\n[translate] batch={batch_id_str} lang={lang} -- calling DeepSeek...")

    raw = call_deepseek(prompt_text, user_input, model, api_key)

    try:
        block, _start, _end = extract_first_json_object(raw)
    except ValueError as e:
        print(f"  [오류] 응답 파싱 실패: {e}")
        print("  --- raw response (first 500 chars) ---")
        print(raw[:500])
        return False

    scan_example_flags(block, batch_id_str, [lang])

    out_path = save_draft(data_root, batch_id_str, lang, block)
    print(f"  [저장] {out_path}  (검수 후 promote_draft.py로 승격 필요)")
    return True


def run_translate(args, api_key):
    global_batches = parse_batch_spec(args.batches) if args.batches else \
        [int(args.batch)] if args.batch else []
    if not global_batches:
        print("[오류] --batches 또는 --batch 를 지정하세요.", file=sys.stderr)
        sys.exit(1)

    langs = ALL_TRANSLATE_LANGS if args.lang == "all" else [args.lang]
    for lang in langs:
        if lang not in TRANSLATION_PROMPT_FILENAME:
            print(f"[오류] 알 수 없는 언어: {lang}", file=sys.stderr)
            sys.exit(1)

    tasks = [(gb, lang) for gb in global_batches for lang in langs]

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
    parser = argparse.ArgumentParser(description="DeepSeek generation for the voca v3 pipeline.")
    sub = parser.add_subparsers(dest="mode", required=True)

    p_target = sub.add_parser("target", help="Generate target-language TARGET_BLOCK batches.")
    p_target.add_argument("--target-lang", required=True,
                           help="2-letter target language code, e.g. en / kr / es -- "
                                "prompt must exist at {prompts-dir}/GENERATOR_{LANG}.md")
    p_target.add_argument("--batch", help="single global batch id (1-144)")
    p_target.add_argument("--batches", help="e.g. '1-144' or '1,2,5-9'")
    p_target.add_argument("--prompts-dir", default="./prompts",
                           help="folder containing GENERATOR_{LANG}.md / TRANSLATOR_{LANG}.md, "
                                "flat (conversation-style), e.g. './prompts'")
    p_target.add_argument("--data-root", default="./data")
    p_target.add_argument("--model", default="deepseek-chat")
    p_target.add_argument("--confirm", action="store_true",
                           help="pause and show the extracted 5-word batch before each API call")

    p_translate = sub.add_parser("translate", help="Generate one or all 7 language TRANSLATION_BLOCKs.")
    p_translate.add_argument("--lang", required=True,
                              help="one of en/es/fr/pt/kr/jp/zh, or 'all'")
    p_translate.add_argument("--batch", help="single global batch id (1-144)")
    p_translate.add_argument("--batches", help="e.g. '1-144' or '1,2,5-9'")
    p_translate.add_argument("--prompts-dir", default="./prompts")
    p_translate.add_argument("--data-root", default="./data")
    p_translate.add_argument("--model", default="deepseek-chat")
    p_translate.add_argument("--workers", type=int, default=4)

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
