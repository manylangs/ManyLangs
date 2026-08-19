#!/usr/bin/env python3
"""
real_eval_pipeline.py

real generator/data (real_review.py와 동일한 원본 경로)를 순회하며
DeepSeek로 채점하고, 결과를 파일로 저장하지 않고 터미널에
batch_id 순서대로 출력한다 (voca용 deepseek_eval_pipeline.py와 동일한 구조).

real 시리즈는 voca와 달리:
  - target/미러 언어 개념이 없다 (단일 평가 프롬프트, --target-lang 불필요)
  - domain_scores가 리스트가 아니라 {key: {"score","weight","notes"}} dict
  - blocking_issues가 문자열이 아니라
    {"domain","description_block_index","sentence_index","lang","issue"} 객체
  - weight 합계가 100이 아니라 105 (v1.1: cross_language_consistency 5→10)
  - real_review.py의 교체 키는 (description_block_index, sentence_index, lang)
    3-튜플 하나뿐 (voca처럼 TITLE/WORD/EXAMPLE로 안 나뉨)

사용법
------
  export DEEPSEEK_API_KEY=sk-xxxx
  python real_eval_pipeline.py \
      --root "/Users/junghasuk/Desktop/ManyLangs/web/firebase/real generator/data" \
      --prompt-dir "/Users/junghasuk/Desktop/ManyLangs/web/deepseek/real"

  옵션:
    --root PATH          real generator/data 경로
    --prompt-dir PATH    real_평가프롬프트_v1.1.md가 있는 폴더
    --prompt-file NAME   평가 프롬프트 파일명 (기본: real_평가프롬프트_v1.1.md)
    --batch 011,012,020-025   특정 batch_id만 (기본: 전체 001-120, 폴더 존재하는 것만)
    --dry-run             API 호출 없이 스캔 결과만 출력
    --model               DeepSeek 모델명 (기본: deepseek-chat)
    --pass-threshold       PASS 총점 기준 (기본: 80)
    --review-threshold     이 점수 미만이면 재검수 상세 블록 출력 (기본: 85)
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions"
DEFAULT_PROMPT_FILE = "real_평가프롬프트_v1.1.md"
DEFAULT_ROOT = Path(
    "/Users/junghasuk/Desktop/ManyLangs/web/firebase/real generator/data"
)

EXPECTED_DOMAIN_COUNT = 10
EXPECTED_WEIGHT_SUM = 105  # v1.1: cross_language_consistency weight 5 -> 10
LOW_SCORE_DOMAIN_THRESHOLD = 8.5


# ---------------------------------------------------------------------------
# 1. 배치 스캔 — real_review.py의 resolve_json_file()과 동일한 탐색 순서
# ---------------------------------------------------------------------------

def parse_batch_filter(spec: str):
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


def resolve_batch_file(root: Path, batch_id: str) -> Path | None:
    base = root / batch_id
    if not base.is_dir():
        return None

    p1 = base / f"real_{batch_id}.runtime.json"
    if p1.is_file():
        return p1

    p2 = base / "data.json"
    if p2.is_file():
        return p2

    for sub in sorted(base.iterdir()):
        if sub.is_dir():
            p3 = sub / "data.json"
            if p3.is_file():
                return p3

    return None


def scan_batches(root: Path, batch_filter):
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
        fp = resolve_batch_file(root, batch_id)
        if fp is not None:
            found.append((batch_id, fp))
    return found


# ---------------------------------------------------------------------------
# 2. DeepSeek 호출
# ---------------------------------------------------------------------------

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
# 3. 검증 및 게이트 (real 스키마: domain_scores dict, blocking_issues 객체)
# ---------------------------------------------------------------------------

def validate_and_gate(result: dict, pass_threshold: float, review_threshold: float) -> dict:
    domain_scores = result.get("domain_scores", {})
    if len(domain_scores) != EXPECTED_DOMAIN_COUNT:
        result["_pipeline_error"] = f"도메인 개수가 {len(domain_scores)}개 (기대값 {EXPECTED_DOMAIN_COUNT})"
        result["decision"] = "FAIL"
        result["needs_review"] = True
        return result

    weight_sum = sum(d.get("weight", 0) for d in domain_scores.values())
    if weight_sum != EXPECTED_WEIGHT_SUM:
        result["_pipeline_error"] = f"weight 합계가 {weight_sum} (기대값 {EXPECTED_WEIGHT_SUM})"
        result["decision"] = "FAIL"
        result["needs_review"] = True
        return result

    recomputed = round(sum((d.get("score", 0) / 10) * d.get("weight", 0) for d in domain_scores.values()), 1)
    result["final_score_recomputed"] = recomputed

    min_domain_score = min((d.get("score", 0) for d in domain_scores.values()), default=0)
    blocking = result.get("blocking_issues", [])

    # notes 누락 검사: score_reasoning 대신 real 스키마의 "notes" 필드를 그대로 쓴다.
    missing_notes = [
        key for key, d in domain_scores.items()
        if d.get("score", 10) < LOW_SCORE_DOMAIN_THRESHOLD and not (d.get("notes") or "").strip()
    ]
    if missing_notes:
        result["_pipeline_error"] = f"저점 도메인에 notes 누락: {missing_notes}"
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
# 4. 재검수용 텍스트 블록 — 터미널에만 출력
# ---------------------------------------------------------------------------

def build_review_block_text(batch_id: str, batch_json: dict, result: dict) -> str:
    lines = []
    lines.append(f"# 재검수 요청 — series=real batch_id={batch_id}")
    lines.append("")
    lines.append(f"## 채점 결과 (final_score={result.get('final_score_recomputed')}, decision={result.get('decision')})")
    lines.append("")
    if result.get("_pipeline_error"):
        lines.append(f"## 파이프라인 오류 (FAIL 직결 사유): {result['_pipeline_error']}")
        lines.append("")
    for key, d in result.get("domain_scores", {}).items():
        lines.append(f"- [{key}] {d.get('score')}/10 (weight {d.get('weight')})")
        if d.get("notes"):
            lines.append(f"    · notes: {d['notes']}")

    blocking = result.get("blocking_issues", [])
    if blocking:
        lines.append("")
        lines.append("## blocking_issues (FAIL 직결 사유)")
        for b in blocking:
            lines.append(
                f"- [{b.get('domain')}] block={b.get('description_block_index')} "
                f"sentence={b.get('sentence_index')} lang={b.get('lang')}: {b.get('issue')}"
            )

    priority_fixes = result.get("priority_fixes", [])
    if priority_fixes:
        lines.append("")
        lines.append("## priority_fixes (85점 미만 개선 우선순위)")
        for pf in priority_fixes:
            lines.append(f"- {pf}")

    market = result.get("market_benchmark", {})
    if market.get("estimated_relative_position"):
        lines.append("")
        lines.append(f"## 시장 대비 평가: {market['estimated_relative_position']}")

    lines.append("")
    lines.append("## 원본 JSON")
    lines.append("```json")
    lines.append(json.dumps(batch_json, ensure_ascii=False, indent=2))
    lines.append("```")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# 5. 메인 오케스트레이션
# ---------------------------------------------------------------------------

def run(root: Path, prompt_dir: Path, prompt_file: str, batch_filter,
        dry_run: bool, model: str, pass_threshold: float, review_threshold: float):

    entries = scan_batches(root, batch_filter)
    if not entries:
        print(f"[스캔 결과] {root} 아래에서 조건에 맞는 파일을 찾지 못했습니다.")
        return

    print(f"[스캔 결과] {len(entries)}개 배치 발견 (series=real)")
    for batch_id, fp in entries:
        print(f"  - batch_id={batch_id} -> {fp}")

    if dry_run:
        return

    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        print("DEEPSEEK_API_KEY 환경변수가 설정되어 있지 않습니다.", file=sys.stderr)
        sys.exit(1)

    prompt_path = prompt_dir / prompt_file
    if not prompt_path.is_file():
        print(f"[오류] 프롬프트 파일을 찾을 수 없음: {prompt_path}", file=sys.stderr)
        sys.exit(1)
    system_prompt = prompt_path.read_text(encoding="utf-8")

    outcomes = {}

    for batch_id, fp in entries:
        try:
            batch_json = json.loads(fp.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            print(f"[오류] JSON 파싱 실패: {fp} ({e})", file=sys.stderr)
            outcomes[batch_id] = {"error": str(e)}
            continue

        user_message = f"입력 파일: {fp.as_posix()}\nbatch_id: {batch_id}\ndata.json 내용:\n{json.dumps(batch_json, ensure_ascii=False)}"

        print(f"[채점 중] series=real batch_id={batch_id} ...")
        try:
            result = call_deepseek(api_key, model, system_prompt, user_message)
        except RuntimeError as e:
            print(f"[오류] {e}", file=sys.stderr)
            outcomes[batch_id] = {"error": str(e)}
            continue

        result = validate_and_gate(result, pass_threshold, review_threshold)
        outcomes[batch_id] = {"result": result, "batch_json": batch_json}

    print("\n" + "=" * 80)
    print("최종 채점 결과 (batch_id 순)")
    print("=" * 80)

    for batch_id in sorted(outcomes):
        o = outcomes[batch_id]
        if "error" in o:
            print(f"[{batch_id}] -> 오류: {o['error']}")
            continue
        result = o["result"]
        score = result.get("final_score_recomputed")
        decision = result.get("decision")
        needs_review = result.get("needs_review")
        status = "PASS" if (decision == "PASS" and not needs_review) else (
            "FAIL" if decision == "FAIL" else "PASS(재검수권장)"
        )
        print(f"[{batch_id}] {score}점 -> {status}")

    review_batches = [
        batch_id for batch_id in sorted(outcomes)
        if "error" not in outcomes[batch_id] and outcomes[batch_id]["result"].get("needs_review")
    ]

    if review_batches:
        print("\n" + "=" * 80)
        print(f"재검수 필요 배치 상세 ({len(review_batches)}건) — 아래 블록을 그대로 복사해서")
        print("real_재검수프롬프트_v1.0.md 세션에 붙여넣으세요.")
        print("=" * 80)
        for batch_id in review_batches:
            o = outcomes[batch_id]
            print()
            print(build_review_block_text(batch_id, o["batch_json"], o["result"]))
    else:
        print("\n재검수가 필요한 배치가 없습니다.")


def parse_args():
    p = argparse.ArgumentParser(description="real generator/data 원본 기준 DeepSeek 채점 파이프라인 (결과는 터미널 출력)")
    p.add_argument("--root", default=str(DEFAULT_ROOT), help="real generator/data 경로")
    p.add_argument("--prompt-dir", default=".", help="real_평가프롬프트 폴더")
    p.add_argument("--prompt-file", default=DEFAULT_PROMPT_FILE, help="평가 프롬프트 파일명")
    p.add_argument("--batch", default="", help="예: 011,012,020-025 (기본: 전체)")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--model", default="deepseek-chat")
    p.add_argument("--pass-threshold", type=float, default=80.0)
    p.add_argument("--review-threshold", type=float, default=85.0)
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    run(
        root=Path(args.root),
        prompt_dir=Path(args.prompt_dir),
        prompt_file=args.prompt_file,
        batch_filter=parse_batch_filter(args.batch),
        dry_run=args.dry_run,
        model=args.model,
        pass_threshold=args.pass_threshold,
        review_threshold=args.review_threshold,
    )