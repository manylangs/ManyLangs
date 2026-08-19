#!/usr/bin/env python3
"""
deepseek_eval_pipeline.py (v3)

변경점 (v2 대비)
----------------
1. 채점 프롬프트 파일명을 v2로 갱신했다:
       voca_{target_lang}_평가프롬프트_v2.md
   (v2 프롬프트는 en/kr_voca_manual_A_target_generation_v3.md,
   translation_prompt_common_*_v3.md를 참조하도록 버전 표기가 갱신됐고,
   FLAG 리터럴 처리와 meaning_zone_orphan_flags의 비강제 게이트 완화가
   반영되어 있다.)

2. FLAG 리터럴 사전 검사를 추가했다. examples[]에 문자 그대로
   "FLAG: ..."가 남아있으면, 이는 v4 검수 단계가 누락됐다는 뜻이므로
   DeepSeek 채점 API를 호출하지 않고 그 자리에서 바로 FAIL 처리한다
   (비용 절감 + 채점 프롬프트의 blocking_issue 규칙과 일치).

변경점 (v1 대비, 기존 내용)
----------------
1. 채점 대상이 content/voca/{lang}/{level}/{chapter}/... 가 아니라
   voca_review.py와 동일한 원본 경로를 그대로 쓴다:
       {root}/{batch_id}/data.json   (batch_id = 001~144)
   즉 review와 eval이 같은 파일을 보고, 채점 후 review.py로 바로
   되먹임할 수 있다.

2. 이 root 폴더는 한 판(KR-target 또는 EN-target)만 담는다는 전제.
   --target-lang kr|en 을 한 번만 지정하면 전체 배치에 동일하게
   적용된다 (배치마다 다시 추론하지 않음).

3. 단순 PASS/FAIL·총점만 내지 않는다. score < 8.5인 도메인은
   "score_reasoning"이 채점 프롬프트 단계에서 필수로 채워지도록
   요구하고(v1.2 프롬프트), 파이프라인은 그걸 그대로 검수요청
   파일에 옮겨 담는다.

4. FAIL이거나 final_score < 85인 배치는 파일로 저장하지 않고, 전체 배치
   채점이 끝난 뒤 터미널 맨 마지막에 batch_id 순서대로:
     - 요약 한 줄(점수/PASS·FAIL)을 먼저 전체 배치에 대해 출력
     - 그 아래 재검수가 필요한 배치만 상세 블록(원본 data.json 전체 +
       총점/도메인별 점수/사유/blocking_issues/priority_fixes)을 출력
   이 상세 블록을 터미널에서 그대로 복사해서 재검수프롬프트
   (voca_kr_재검수프롬프트_v1.md / voca_en_재검수프롬프트_v1.md) 세션에
   붙여넣고 나온 ALL_REPLACEMENTS를 voca_review.py에 넣어 돌린 뒤,
   같은 배치만 다시 이 스크립트로 재채점하면 된다.

사용법
------
  export DEEPSEEK_API_KEY=sk-xxxx
  python deepseek_eval_pipeline.py \
      --root "/Users/junghasuk/Desktop/ManyLangs/web/firebase/voca generator/data" \
      --target-lang kr \
      --prompt-dir /path/to/prompts

  옵션:
    --root PATH           voca generator/data 경로 (기본: 아래 DEFAULT_ROOT)
    --target-lang kr|en   이 폴더 전체의 target 언어 (필수)
    --prompt-dir PATH     평가 프롬프트(.md)가 있는 폴더
    --batch 001,002,010-015  특정 batch_id만 (기본: 전체 001-144, 폴더 존재하는 것만)
    --dry-run             API 호출 없이 스캔 결과만 출력
    --model               DeepSeek 모델명 (기본: deepseek-chat)
    --pass-threshold       PASS 총점 기준 (기본: 80)
    --review-threshold     이 점수 미만이면 재검수 상세 블록 출력 (기본: 85)
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path
from pipeline_semantic_axis_gate import check_meaning_zone_semantic_axis

DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions"

DEFAULT_ROOT = Path(
    "/Users/junghasuk/Desktop/ManyLangs/web/firebase/voca generator/data"
)

REQUIRED_DOMAIN_COUNT = 9
WEIGHT_SUM_EXPECTED = 100
LOW_SCORE_DOMAIN_THRESHOLD = 8.5  # 이 미만이면 domain.score_reasoning 필수

FLAG_PATTERN = re.compile(r"^FLAG:\s*(.*)$")


# ---------------------------------------------------------------------------
# 1. 배치 스캔 — content/{lang}/{level}/{chapter} 구조 아님.
#    review.py와 동일하게 root/{batch_id}/data.json 을 그대로 본다.
# ---------------------------------------------------------------------------

def parse_batch_filter(spec: str):
    """'001,002,010-015' -> {'001','002','010','011',...,'015'} (없으면 None=전체)"""
    if not spec:
        return None
    ids = set()
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            a, b = part.split("-")
            for n in range(int(a), int(b) + 1):
                ids.add(str(n).zfill(3))
        else:
            ids.add(part.zfill(3))
    return ids


def scan_batches(root: Path, batch_filter):
    """root/001/data.json ... root/144/data.json 중 실제 존재하는 것만 (batch_id, path) 리스트로."""
    found = []
    if not root.is_dir():
        return found
    for batch_dir in sorted(root.iterdir()):
        if not batch_dir.is_dir():
            continue
        batch_id = batch_dir.name
        if not batch_id.isdigit():
            continue
        if batch_filter and batch_id not in batch_filter:
            continue
        data_file = batch_dir / "data.json"
        if data_file.is_file():
            found.append((batch_id, data_file))
    return found


# ---------------------------------------------------------------------------
# 1-1. FLAG 리터럴 사전 검사 — API 호출 전에 결정론적으로 걸러낸다.
# ---------------------------------------------------------------------------

def find_flag_placeholders(batch_json: dict, target_lang: str):
    """examples[] 안에 문자 그대로 'FLAG: ...'가 남아있는 위치를 전부 찾는다.
    (block_id, example_index, lang, reason) 튜플 리스트를 반환. 언어 키는
    target_lang을 포함해 JSON에 실제 존재하는 모든 언어 컬럼을 다 본다 --
    v4 검수 단계가 어느 언어에서든 FLAG를 놓쳤을 수 있으므로."""
    found = []
    for block in batch_json.get("blocks", []):
        block_id = block.get("id", "?")
        for idx, example in enumerate(block.get("examples", []), start=1):
            if not isinstance(example, dict):
                continue
            for lang, val in example.items():
                if not isinstance(val, str):
                    continue
                m = FLAG_PATTERN.match(val.strip())
                if m:
                    found.append((block_id, idx, lang, m.group(1).strip()))
    return found


# ---------------------------------------------------------------------------
# 2. DeepSeek 호출
# ---------------------------------------------------------------------------

def build_user_message(filepath: Path, target_lang: str, level: str, batch_id: str, batch_json: dict) -> str:
    return (
        f"실제 폴더 경로: {filepath.as_posix()}\n"
        f"target_lang: {target_lang}\n"
        f"level: {level}\n"
        f"batch_id: {batch_id}\n"
        f"data.json 내용:\n{json.dumps(batch_json, ensure_ascii=False)}"
    )


def call_deepseek(api_key: str, model: str, system_prompt: str, user_message: str,
                   max_retries: int = 3, timeout: int = 120) -> dict:
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "temperature": 0,
        "response_format": {"type": "json_object"},
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        DEEPSEEK_ENDPOINT,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    last_err = None
    for attempt in range(1, max_retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                body = json.loads(resp.read().decode("utf-8"))
            content = body["choices"][0]["message"]["content"]
            return extract_json(content)
        except (urllib.error.URLError, urllib.error.HTTPError, KeyError, ValueError) as e:
            last_err = e
            time.sleep(min(2 ** attempt, 10))
    raise RuntimeError(f"DeepSeek 호출 실패 (재시도 {max_retries}회 소진): {last_err}")


def extract_json(text: str) -> dict:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


# ---------------------------------------------------------------------------
# 2-1. FLAG 발견 시 API 호출 없이 만드는 합성 FAIL 결과
# ---------------------------------------------------------------------------

def build_flag_fail_result(target_lang: str, level: str, batch_id: str, flags) -> dict:
    blocking = [
        f'FLAG 리터럴 미해결: block={b} example={i} lang={lang}: "{reason}"'
        for b, i, lang, reason in flags
    ]
    domains = [
        {"key": "vocab_selection", "name": "어휘·개념 선정 적합성", "weight": 10, "score": 0, "issues": [], "comment": "FLAG 미해결로 채점 보류", "score_reasoning": ""},
        {"key": "core_meaning_zone", "name": "Core & Meaning Zone 품질", "weight": 15, "score": 0, "issues": [], "comment": "FLAG 미해결로 채점 보류", "score_reasoning": ""},
        {"key": "naturalness", "name": "예문 자연스러움·원어민성", "weight": 15, "score": 0, "issues": [], "comment": "FLAG 미해결로 채점 보류", "score_reasoning": ""},
        {"key": "grammar_orthography", "name": "문법·표기 정확성", "weight": 10, "score": 0, "issues": [], "comment": "FLAG 미해결로 채점 보류", "score_reasoning": ""},
        {"key": "pattern_diversity", "name": "문형·상황 다양성", "weight": 10, "score": 0, "issues": [], "comment": "FLAG 미해결로 채점 보류", "score_reasoning": ""},
        {"key": "cultural_safety", "name": "문화적 중립성 및 안전성", "weight": 10, "score": 0, "issues": [], "comment": "FLAG 미해결로 채점 보류", "score_reasoning": ""},
        {"key": "tts_readiness", "name": "TTS·표기 규칙 적합성", "weight": 10, "score": 0, "issues": [], "comment": "FLAG 미해결로 채점 보류", "score_reasoning": ""},
        {"key": "mirror_fidelity", "name": "미러 일치도", "weight": 5, "score": 0, "issues": [], "comment": "FLAG 미해결로 채점 보류", "score_reasoning": ""},
        {"key": "market_competitiveness", "name": "시장 경쟁력", "weight": 15, "score": 0, "issues": [], "comment": "FLAG 미해결로 채점 보류", "score_reasoning": ""},
    ]
    return {
        "batch_id": batch_id,
        "content_type": "voca",
        "target_lang": target_lang,
        "level": level,
        "domains": domains,
        "benchmark": {"references": [], "note": "FLAG 미해결로 채점 자체를 수행하지 않음"},
        "meaning_zone_orphan_flags": [],
        "final_score": 0,
        "final_score_recomputed": 0,
        "decision": "FAIL",
        "blocking_issues": blocking,
        "summary_comment": "⚠️ FLAG_UNRESOLVED — v4 검수 단계가 이 배치에서 누락됨. 채점을 수행하지 않고 즉시 반려.",
        "priority_fixes": [
            f"{b}/{lang}/example_{i}: FLAG를 자연스러운 문장으로 채운 뒤(v4 검수 프롬프트 Section 4) 재채점"
            for b, i, lang, reason in flags
        ],
        "needs_review": True,
        "_pipeline_error": None,
        "_flag_precheck": True,
    }


# ---------------------------------------------------------------------------
# 3. 검증 및 게이트 — score_reasoning 누락도 여기서 강제한다.
# ---------------------------------------------------------------------------

def validate_and_gate(result: dict, pass_threshold: float, review_threshold: float,
                       target_lang: str = None, data_json: dict = None) -> dict:
    domains = result.get("domains", [])
    if len(domains) != REQUIRED_DOMAIN_COUNT:
        result["_pipeline_error"] = f"domains 개수가 {len(domains)}개 (기대값 {REQUIRED_DOMAIN_COUNT})"
        result["decision"] = "FAIL"
        result["needs_review"] = True
        return result

    weight_sum = sum(d.get("weight", 0) for d in domains)
    if weight_sum != WEIGHT_SUM_EXPECTED:
        result["_pipeline_error"] = f"weight 합계가 {weight_sum} (기대값 {WEIGHT_SUM_EXPECTED})"
        result["decision"] = "FAIL"
        result["needs_review"] = True
        return result

    # --- 의미 축(semantic axis) / 감정 색채 하드 게이트 ---
    # pipeline_semantic_axis_gate.py의 사전 기반 검사를 blocking_issues에 합산한다.
    # (LLM이 놓쳐도 여기서 한 번 더 걸러진다. 사전에 없는 단어쌍은 여기선 못 잡으므로
    #  LLM 채점 결과의 blocking_issues도 그대로 유지/합산한다.)
    # 참고: meaning_zone_orphan_flags(②-5)는 여기서 blocking으로 합산하지 않는다 --
    # v2 프롬프트 기준 그 자체로는 FAIL을 유발하지 않는 정보성 기록이다.
    if data_json is not None and target_lang is not None:
        blocking = result.get("blocking_issues", [])
        for block in data_json.get("blocks", []):
            word_data = block.get("word", {}).get(target_lang, {})
            core = word_data.get("core", "")
            mz = word_data.get("meaning_zone", [])
            axis_issues = check_meaning_zone_semantic_axis(core, mz, target_lang)
            blocking.extend(axis_issues)
        result["blocking_issues"] = blocking
    # --------------------------------------------------------

    recomputed = round(sum((d.get("score", 0) / 10) * d.get("weight", 0) for d in domains), 2)
    result["final_score_recomputed"] = recomputed

    min_domain_score = min((d.get("score", 0) for d in domains), default=0)
    blocking = result.get("blocking_issues", [])

    # score_reasoning 누락 검사: LOW_SCORE_DOMAIN_THRESHOLD 미만인데 근거가 없으면
    # 모델이 점수만 찍고 이유를 안 쓴 것 -> 파이프라인 오류로 처리 (재호출 대상)
    missing_reasoning = [
        d.get("key", "?") for d in domains
        if d.get("score", 10) < LOW_SCORE_DOMAIN_THRESHOLD
        and not (d.get("score_reasoning") or "").strip()
    ]
    if missing_reasoning:
        result["_pipeline_error"] = (
            f"저점 도메인에 score_reasoning 누락: {missing_reasoning}"
        )
        result["decision"] = "FAIL"
        result["needs_review"] = True
        return result

    passed = (
        recomputed >= pass_threshold
        and min_domain_score >= 6
        and len(blocking) == 0
    )
    result["decision"] = "PASS" if passed else "FAIL"
    result["needs_review"] = (not passed) or (recomputed < review_threshold)
    return result


# ---------------------------------------------------------------------------
# 4. 재검수용 텍스트 블록 — 파일로 저장하지 않고 터미널에 그대로 찍는다.
#    이 블록을 터미널에서 복사해서 재검수프롬프트 세션에 붙여넣으면 된다.
# ---------------------------------------------------------------------------

def build_review_block_text(target_lang: str, level: str, batch_id: str,
                             batch_json: dict, result: dict) -> str:
    lines = []
    lines.append(f"# 재검수 요청 — target={target_lang} level={level} batch_id={batch_id}")
    lines.append("")
    lines.append(f"## 채점 결과 (final_score={result.get('final_score_recomputed')}, decision={result.get('decision')})")
    lines.append("")
    if result.get("_pipeline_error"):
        lines.append(f"## 파이프라인 오류 (FAIL 직결 사유): {result['_pipeline_error']}")
        lines.append("")
    if result.get("_flag_precheck"):
        lines.append("## FLAG 사전 검사에서 즉시 반려됨 (DeepSeek 채점 API 호출 안 함)")
        lines.append("")
    for d in result.get("domains", []):
        lines.append(f"- [{d.get('key')}] {d.get('name')}: {d.get('score')}/10 (weight {d.get('weight')})")
        if d.get("issues"):
            for issue in d["issues"]:
                lines.append(f"    · issue: {issue}")
        reasoning = d.get("score_reasoning") or d.get("comment")
        if reasoning:
            lines.append(f"    · 사유: {reasoning}")

    blocking = result.get("blocking_issues", [])
    if blocking:
        lines.append("")
        lines.append("## blocking_issues (FAIL 직결 사유)")
        for b in blocking:
            lines.append(f"- {b}")

    orphan_flags = result.get("meaning_zone_orphan_flags", [])
    if orphan_flags:
        lines.append("")
        lines.append("## meaning_zone_orphan_flags (참고용, FAIL 사유 아님)")
        for of in orphan_flags:
            lines.append(f"- block={of.get('block_id')} core={of.get('word_core')} "
                         f"제외항목={of.get('removed_meaning_zone_item')} "
                         f"사유={of.get('reason_excluded')}")

    priority_fixes = result.get("priority_fixes", [])
    if priority_fixes:
        lines.append("")
        lines.append("## priority_fixes (85점 미만 개선 우선순위)")
        for pf in priority_fixes:
            lines.append(f"- {pf}")

    if result.get("summary_comment"):
        lines.append("")
        lines.append(f"## 총평: {result['summary_comment']}")

    lines.append("")
    lines.append("## 원본 data.json")
    lines.append("```json")
    lines.append(json.dumps(batch_json, ensure_ascii=False, indent=2))
    lines.append("```")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# 5. 메인 오케스트레이션
# ---------------------------------------------------------------------------

def run(root: Path, prompt_dir: Path, target_lang: str, batch_filter,
        dry_run: bool, model: str, pass_threshold: float, review_threshold: float):

    entries = scan_batches(root, batch_filter)
    if not entries:
        print(f"[스캔 결과] {root} 아래에서 조건에 맞는 data.json을 찾지 못했습니다.")
        return

    print(f"[스캔 결과] {len(entries)}개 배치 발견 (target_lang={target_lang})")
    for batch_id, fp in entries:
        print(f"  - batch_id={batch_id} -> {fp}")

    if dry_run:
        return

    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        print("DEEPSEEK_API_KEY 환경변수가 설정되어 있지 않습니다.", file=sys.stderr)
        sys.exit(1)

    prompt_filename = f"voca_{target_lang}_평가프롬프트_v2.md"
    prompt_path = prompt_dir / prompt_filename
    if not prompt_path.is_file():
        print(f"[오류] 프롬프트 파일을 찾을 수 없음: {prompt_path}", file=sys.stderr)
        sys.exit(1)
    system_prompt = prompt_path.read_text(encoding="utf-8")

    # batch_id -> {"level", "final_score", "decision", "result", "batch_json", "error"}
    outcomes = {}

    for batch_id, fp in entries:
        try:
            batch_json = json.loads(fp.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            print(f"[오류] JSON 파싱 실패: {fp} ({e})", file=sys.stderr)
            outcomes[batch_id] = {"level": "?", "error": str(e)}
            continue

        level = batch_json.get("meta", {}).get("level", "?")

        # --- FLAG 사전 검사: 발견되면 API 호출 없이 즉시 FAIL ---
        flags = find_flag_placeholders(batch_json, target_lang)
        if flags:
            print(f"[FLAG 발견] target_lang={target_lang} level={level} batch_id={batch_id} "
                  f"-- {len(flags)}건, 채점 API 호출 생략하고 즉시 반려")
            result = build_flag_fail_result(target_lang, level, batch_id, flags)
            outcomes[batch_id] = {"level": level, "result": result, "batch_json": batch_json}
            continue
        # ----------------------------------------------------------

        user_message = build_user_message(fp, target_lang, level, batch_id, batch_json)

        print(f"[채점 중] target_lang={target_lang} level={level} batch_id={batch_id} ...")
        try:
            result = call_deepseek(api_key, model, system_prompt, user_message)
        except RuntimeError as e:
            print(f"[오류] {e}", file=sys.stderr)
            outcomes[batch_id] = {"level": level, "error": str(e)}
            continue

        result = validate_and_gate(result, pass_threshold, review_threshold,
                                    target_lang=target_lang, data_json=batch_json)

        outcomes[batch_id] = {
            "level": level, "result": result, "batch_json": batch_json,
        }

    # -----------------------------------------------------------------
    # 최종 결과 — batch_id 순서대로 터미널에 출력
    # -----------------------------------------------------------------
    print("\n" + "=" * 80)
    print("최종 채점 결과 (batch_id 순)")
    print("=" * 80)

    for batch_id in sorted(outcomes):
        o = outcomes[batch_id]
        if "error" in o:
            print(f"[{batch_id}] level={o['level']} -> 오류: {o['error']}")
            continue
        result = o["result"]
        score = result.get("final_score_recomputed")
        decision = result.get("decision")
        needs_review = result.get("needs_review")
        flag_note = " [FLAG 사전반려]" if result.get("_flag_precheck") else ""
        status = "PASS" if (decision == "PASS" and not needs_review) else (
            "FAIL" if decision == "FAIL" else "PASS(재검수권장)"
        )
        print(f"[{batch_id}] level={o['level']} {score}점 -> {status}{flag_note}")

    review_batches = [
        batch_id for batch_id in sorted(outcomes)
        if "error" not in outcomes[batch_id] and outcomes[batch_id]["result"].get("needs_review")
    ]

    if review_batches:
        print("\n" + "=" * 80)
        print(f"재검수 필요 배치 상세 ({len(review_batches)}건) — 아래 블록을 그대로 복사해서")
        print("재검수프롬프트(voca_kr/en_재검수프롬프트_v1.md) 세션에 붙여넣으세요.")
        print("=" * 80)
        for batch_id in review_batches:
            o = outcomes[batch_id]
            print()
            print(build_review_block_text(target_lang, o["level"], batch_id,
                                           o["batch_json"], o["result"]))
    else:
        print("\n재검수가 필요한 배치가 없습니다.")


def parse_args():
    p = argparse.ArgumentParser(description="voca generator/data 원본 기준 DeepSeek 채점 파이프라인 (결과는 터미널 출력)")
    p.add_argument("--root", default=str(DEFAULT_ROOT), help="voca generator/data 경로")
    p.add_argument("--target-lang", required=True, choices=["kr", "en"], help="이 root 폴더 전체의 target 언어")
    p.add_argument("--prompt-dir", default=str(Path(__file__).parent), help="평가 프롬프트(.md) 폴더")
    p.add_argument("--batch", default="", help="예: 001,002,010-015 (기본: 전체)")
    p.add_argument("--dry-run", action="store_true", help="API 호출 없이 스캔 결과만 출력")
    p.add_argument("--model", default="deepseek-chat")
    p.add_argument("--pass-threshold", type=float, default=80.0)
    p.add_argument("--review-threshold", type=float, default=85.0,
                    help="이 점수 미만이면 PASS라도 재검수 상세 블록 출력")
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    run(
        root=Path(args.root),
        prompt_dir=Path(args.prompt_dir),
        target_lang=args.target_lang,
        batch_filter=parse_batch_filter(args.batch),
        dry_run=args.dry_run,
        model=args.model,
        pass_threshold=args.pass_threshold,
        review_threshold=args.review_threshold,
    )