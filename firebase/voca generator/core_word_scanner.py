#!/usr/bin/env python3
"""
core_word_scanner.py (v3 — target-only, core-only)

Scope narrowed per final design decision: the 7 translated languages
(es/fr/pt/kr/jp/zh + whichever isn't the mirror) are allowed to use
whatever expression is most natural, even if it isn't core or a listed
meaning_zone entry -- that's now treated as normal cross-language
variation, not a defect (documented in the viewer/UI, not per-example).

What's STILL worth checking automatically: the target language itself
(and its mirror column, since mirror = exact copy of target). Target
generation is supposed to be core-only by design (en/kr_voca_manual_A
Section 3.4 + FLAG escape valve) -- if target itself drifts off its own
core, that's not "natural translation variation", it's a real generation-
stage defect (the situation/core pairing was wrong to begin with, as seen
in batches 093/122/123/141 earlier). meaning_zone is NOT an acceptable
substitute here, unlike the old v2 scanner's "core OR meaning_zone" rule
for the 7 translated languages -- for target, only core counts.

Usage:
  python3 core_word_scanner.py \
      --root "/Users/junghasuk/Desktop/ManyLangs/web/firebase/voca generator/data" \
      --target-lang en \
      --batches 1-144 \
      --use-deepseek

  --target-lang tells the scanner which language column is "target" and
  which is its mirror (en target -> mirror "en"; kr target -> mirror "kr").
  Both target and the mirror column are checked (they should always be
  identical anyway, so this also catches mirror-sync bugs for free).

Output:
  - Terminal report grouped by batch -> block -> example index
  - target_core_report.json (machine-readable)
"""

import argparse
import json
import os
import re
import sys
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path


def detect_mirror_lang(data):
    """Every batch JSON already labels the target column explicitly
    ('target' key in word/examples). The mirror language is whichever
    other column's core/meaning_zone/examples match target's, so this can
    be detected directly from the data -- no --target-lang argument
    needed, and the script works unmodified for any target language.

    Uses majority-vote matching across all blocks (not strict 100%
    equality) so that a genuine mirror-sync bug in one block doesn't
    prevent detecting which language IS supposed to be the mirror --
    that kind of bug is exactly one of the things this scanner should
    still be able to flag."""
    blocks = data.get("blocks", [])
    if not blocks:
        return None

    candidate_langs = set()
    for block in blocks:
        candidate_langs.update(k for k in block.get("word", {}).keys() if k != "target")

    best_lang, best_score = None, -1
    for lang in candidate_langs:
        matches, total = 0, 0
        for block in blocks:
            word = block.get("word", {})
            target_entry = word.get("target", {})
            lang_entry = word.get(lang, {})
            if target_entry.get("core"):
                total += 1
                if lang_entry.get("core") == target_entry.get("core"):
                    matches += 1
        if total > 0 and matches / total > best_score:
            best_score = matches / total
            best_lang = lang

    # require a strong majority (>=50%) to accept a language as "the mirror"
    if best_lang is not None and best_score >= 0.5:
        return best_lang
    return None


# ---------------------------------------------------------------------------
# Batch discovery
# ---------------------------------------------------------------------------

def parse_batch_spec(spec, available_ids):
    if not spec:
        return set(available_ids)
    wanted_nums = set()
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            a, b = part.split("-", 1)
            wanted_nums.update(range(int(a), int(b) + 1))
        else:
            wanted_nums.add(int(part))
    result = set()
    for bid in available_ids:
        try:
            if int(bid) in wanted_nums:
                result.add(bid)
        except ValueError:
            continue
    return result


def resolve_batch_file(batch_dir):
    """Try {batch_id}.runtime.json (current pipeline) first, then legacy
    data.json."""
    runtime_path = batch_dir / f"{batch_dir.name}.runtime.json"
    if runtime_path.exists():
        return runtime_path
    legacy_path = batch_dir / "data.json"
    if legacy_path.exists():
        return legacy_path
    return None


def discover_batches(root):
    root = Path(root)
    if not root.exists():
        print(f"[오류] root 경로가 없습니다: {root}", file=sys.stderr)
        sys.exit(1)
    found = {}
    for child in sorted(root.iterdir()):
        if not child.is_dir():
            continue
        data_path = resolve_batch_file(child)
        if data_path is not None:
            found[child.name] = data_path
    return found


def get_block_id(block, fallback_idx):
    return block.get("id") or block.get("block_id") or f"block_{fallback_idx:03d}"


# ---------------------------------------------------------------------------
# Local heuristic matching (core-only, no meaning_zone leniency)
# ---------------------------------------------------------------------------

CJK_LANGS_HINT = {"kr", "ko", "jp", "ja", "zh", "cn"}
KO_STRIP_SUFFIXES = ["습니다", "합니다", "입니다", "습니까", "합니까", "다", "요", "은", "는"]
JA_STRIP_SUFFIXES = ["ます", "ません", "でした", "です", "する", "した", "る", "た"]


def normalize_text(s):
    return unicodedata.normalize("NFKC", s or "")


def strip_common_suffix(word, suffixes):
    for suf in sorted(suffixes, key=len, reverse=True):
        if word.endswith(suf) and len(word) > len(suf):
            return word[: -len(suf)]
    return word


def is_probably_cjk_or_ko(lang_key, sample_text):
    if lang_key.lower() in CJK_LANGS_HINT:
        return True
    for ch in sample_text[:20]:
        cp = ord(ch)
        if (0xAC00 <= cp <= 0xD7A3) or (0x4E00 <= cp <= 0x9FFF) or (0x3040 <= cp <= 0x30FF):
            return True
    return False


def latin_clean(token):
    return re.sub(r"[^\w]", "", token, flags=re.UNICODE).lower()


def latin_stems_match(word, token, min_prefix=4):
    cw = latin_clean(word)
    tw = latin_clean(token)
    if not cw or not tw:
        return False
    if cw == tw:
        return True
    p = min(min_prefix, len(cw), len(tw))
    if p < 3:
        return cw == tw
    return cw[:p] == tw[:p]


def ko_candidate_stems(word):
    """Includes the 1-char-stem relaxation (verified against real data:
    믿다/풀다/늦다/남다/참다-type single-syllable stems were previously
    missed by the >=2 char guard)."""
    stems = set()
    w = strip_common_suffix(word, KO_STRIP_SUFFIXES)
    if len(w) >= 1:
        stems.add(w)
    if word.endswith("하다"):
        base = word[: -len("하다")]
        if base:
            stems.add(base + "해")
            stems.add(base + "하")
    return stems


def core_found_in_example(core, example_text, lang_key):
    """core-only check -- no meaning_zone fallback. Used only for
    target/mirror, where core-only is the actual design rule."""
    core = normalize_text(core).strip()
    text = normalize_text(example_text).strip()
    if not core or not text:
        return False

    core_lower = core.lower()
    text_lower = text.lower()

    if core_lower in text_lower:
        return True

    if is_probably_cjk_or_ko(lang_key, core):
        for stem in ko_candidate_stems(core_lower):
            if stem in text_lower:
                return True
        stem_ja = strip_common_suffix(core_lower, JA_STRIP_SUFFIXES)
        if len(stem_ja) >= 2 and stem_ja in text_lower:
            return True
        return False
    else:
        core_words = core_lower.split()
        text_tokens = re.findall(r"[\w']+", text_lower, flags=re.UNICODE)
        for w in core_words:
            if not any(latin_stems_match(w, tw) for tw in text_tokens):
                return False
        return True


# ---------------------------------------------------------------------------
# DeepSeek verification (only for heuristic misses)
# ---------------------------------------------------------------------------

DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"


def deepseek_verify(core, example_text, lang_key, model, api_key, timeout=30):
    import requests

    prompt = (
        f"Language code: {lang_key}\n"
        f'Word/expression (base form): "{core}"\n'
        f'Sentence: "{example_text}"\n\n'
        "Does the sentence contain this word/expression, in any inflected, "
        "conjugated, or grammatically adapted form (including particles/"
        "honorific endings)? Answer with exactly one word: YES or NO."
    )
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 5,
        "temperature": 0,
    }
    try:
        resp = requests.post(DEEPSEEK_URL, headers=headers, json=payload, timeout=timeout)
        resp.raise_for_status()
        data = resp.json()
        answer = data["choices"][0]["message"]["content"].strip().upper()
        return answer.startswith("YES")
    except Exception as e:
        print(f"  [경고] DeepSeek 검증 실패 ({lang_key}, core='{core}'): {e}", file=sys.stderr)
        return False


# ---------------------------------------------------------------------------
# Main scan -- target + mirror ONLY
# ---------------------------------------------------------------------------

def scan_file(batch_id, data_path):
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    mirror_lang = detect_mirror_lang(data)
    blocks = data.get("blocks", [])
    misses = []

    check_langs = {"target"}
    if mirror_lang:
        check_langs.add(mirror_lang)

    for idx, block in enumerate(blocks, start=1):
        block_id = get_block_id(block, idx)
        word = block.get("word", {})
        examples = block.get("examples", [])

        for ex_idx, example in enumerate(examples, start=1):
            if not isinstance(example, dict):
                continue
            for lang in check_langs:
                entry = word.get(lang, {})
                core = entry.get("core", "")
                if not core:
                    continue
                example_text = example.get(lang)
                if example_text is None:
                    continue
                if not core_found_in_example(core, example_text, lang):
                    misses.append({
                        "batch_id": batch_id,
                        "block_id": block_id,
                        "example_index": ex_idx,
                        "lang": lang,
                        "core": core,
                        "example_text": example_text,
                    })
    return misses, mirror_lang


def main():
    parser = argparse.ArgumentParser(
        description="Scan target (+ auto-detected mirror) examples for core-only "
                    "compliance. The mirror language is detected directly from each "
                    "batch's data (whichever column matches target's core/meaning_zone) "
                    "-- no --target-lang argument needed, works for any target language. "
                    "The 7 translated languages are no longer checked -- natural variation "
                    "there is expected and documented in the viewer, not flagged per-example."
    )
    parser.add_argument("--root", required=True)
    parser.add_argument("--batches", default=None)
    parser.add_argument("--use-deepseek", action="store_true")
    parser.add_argument("--model", default="deepseek-chat")
    parser.add_argument("--workers", type=int, default=5)
    parser.add_argument("--out-json", default="target_core_report.json")
    args = parser.parse_args()

    available = discover_batches(args.root)
    if not available:
        print(f"[오류] {args.root} 아래에서 배치 파일을 찾지 못했습니다.", file=sys.stderr)
        sys.exit(1)

    target_ids = parse_batch_spec(args.batches, available.keys())
    if not target_ids:
        print("[오류] --batches 조건에 맞는 배치가 없습니다.", file=sys.stderr)
        sys.exit(1)

    print(f"[스캔 시작] {len(target_ids)}개 배치")
    print("[기준] target + 자동감지된 미러 언어의 core만 확인 -- 나머지 7개 학습언어는 검사 대상 아님")

    all_misses = []
    mirror_by_batch = {}
    no_mirror_batches = []
    for batch_id in sorted(target_ids, key=lambda x: (len(x), x)):
        data_path = available[batch_id]
        try:
            misses, mirror_lang = scan_file(batch_id, data_path)
        except Exception as e:
            print(f"  [경고] {data_path} 파싱 실패: {e}", file=sys.stderr)
            continue
        mirror_by_batch[batch_id] = mirror_lang
        if mirror_lang is None:
            no_mirror_batches.append(batch_id)
        if misses:
            all_misses.extend(misses)

    detected = set(v for v in mirror_by_batch.values() if v)
    print(f"[미러 언어 자동감지] {sorted(detected)} (배치마다 개별 감지됨)")
    if no_mirror_batches:
        print(f"[경고] 미러 언어를 못 찾은 배치 {len(no_mirror_batches)}개 (target만 검사됨): "
              f"{no_mirror_batches[:10]}{'...' if len(no_mirror_batches) > 10 else ''}")

    print(f"[1차 휴리스틱 결과] {len(all_misses)}건 후보 발견")

    if args.use_deepseek and all_misses:
        api_key = os.environ.get("DEEPSEEK_API_KEY")
        if not api_key:
            print("[오류] DEEPSEEK_API_KEY 환경변수가 없습니다.", file=sys.stderr)
            sys.exit(1)
        print(f"[2차 DeepSeek 검증] {len(all_misses)}건 검증 중 (workers={args.workers}) ...")

        confirmed = []
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            future_to_item = {
                pool.submit(deepseek_verify, m["core"], m["example_text"], m["lang"], args.model, api_key): m
                for m in all_misses
            }
            done_count = 0
            for future in as_completed(future_to_item):
                m = future_to_item[future]
                found = future.result()
                done_count += 1
                if not found:
                    confirmed.append(m)
                if done_count % 20 == 0 or done_count == len(all_misses):
                    print(f"  ... {done_count}/{len(all_misses)} 검증 완료 (확정 {len(confirmed)}건)")
        all_misses = confirmed
        print(f"[2차 검증 후 확정] {len(all_misses)}건")

    if not all_misses:
        print("\n누락 없음 — target/미러 예문이 전부 core를 포함하고 있습니다.")
    else:
        print("\n===== target/미러 core 누락 리포트 (진짜 설계 결함 후보) =====")
        by_batch = {}
        for m in all_misses:
            by_batch.setdefault(m["batch_id"], []).append(m)
        for batch_id in sorted(by_batch.keys(), key=lambda x: (len(x), x)):
            items = by_batch[batch_id]
            print(f"\n[배치 {batch_id}] {len(items)}건")
            for m in items:
                print(f"  - {m['block_id']} / example_{m['example_index']} / lang={m['lang']} / core=\"{m['core']}\"")
                print(f"      현재 예문: {m['example_text']}")

    with open(args.out_json, "w", encoding="utf-8") as f:
        json.dump(all_misses, f, ensure_ascii=False, indent=2)
    print(f"\n[저장] {args.out_json}")
    if all_misses:
        print("[참고] 이 항목들은 '자연스러운 번역 변형'이 아니라, target 생성 단계에서")
        print("       상황(situation)과 core가 애초에 안 맞았을 가능성이 높습니다.")
        print("       해당 block의 상황을 재검토하는 걸 권장합니다 (예문 하나만 교체 X).")


if __name__ == "__main__":
    main()