#!/usr/bin/env python3
"""
idiom_eval_pipeline.py

idiom generator/data (review_idiom.py와 동일한 원본 경로)를 순회하며
DeepSeek로 채점하고, 결과를 파일로 저장하지 않고 터미널에
batch_id 순서대로 출력한다 (voca/real/conversation/grammar용
eval_pipeline과 동일한 구조).

idiom 시리즈는 voca처럼 domains가 **리스트**(dict 아님), target/미러
개념 있음(kr/en/es/fr/pt/zh/jp/ru 8개 target판, --target-lang 필수),
weight 합계 100. 특이점:
  - 10번째 도메인(key="de_idiomatization")은 weight 20으로 별도 구조
    (violations/checked_points/violation_count 필드 보유) — 3건 이상
    위반이면 파이프라인이 강제로 blocking 처리(모델이 놓쳐도 여기서 잡음)
  - review_idiom.py의 교체 키는 block_index가 아니라 **frequency_rank**
    기준: EXPLANATION_REPLACEMENTS: (frequency_rank, lang) -> "설명"
          EXAMPLE_REPLACEMENTS: (frequency_rank, function_tag, lang) -> "예문"
    TITLE_REPLACEMENTS 개념 자체가 없다 (idiom 배치엔 title이 없음).

사용법
------
  export DEEPSEEK_API_KEY=sk-xxxx
  python idiom_eval_pipeline.py \
      --root "/Users/junghasuk/Desktop/ManyLangs/web/firebase/idiom generator/data" \
      --target-lang kr \
      --prompt-dir "/Users/junghasuk/Desktop/ManyLangs/web/deepseek/idiom"

  옵션:
    --root PATH           idiom generator/data 경로
    --target-lang kr|en|es|fr|pt|zh|jp|ru   이 폴더 전체의 target 언어 (필수)
    --prompt-dir PATH     평가 프롬프트(.md)가 있는 폴더
    --prompt-file NAME    평가 프롬프트 파일명 (기본: EVAL_{TARGET-LANG 대문자}.md, 예: EVAL_KR.md)

  참고: 평가/재검수 프롬프트 파일명은 버전 넘버 없는 EVAL_{LANG}.md /
  REVIEW_{LANG}.md 방식으로 통일되었다. pt는 pt-BR 기준이다. ru가 8번째
  언어(target 후보 포함)로 추가됨.
    --batch 001,010-015   특정 batch_id만 (기본: 전체, 폴더 존재하는 것만)
    --dry-run              API 호출 없이 스캔 결과만 출력
    --model                DeepSeek 모델명 (기본: deepseek-chat)
    --pass-threshold        PASS 총점 기준 (기본: 80)
    --review-threshold      이 점수 미만이면 재검수 상세 블록 출력 (기본: 85)
    --de-idiom-threshold    de_idiomatization 위반 강제 FAIL 임계값 (기본: 3)
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
DEFAULT_ROOT = Path(
    "/Users/junghasuk/Desktop/ManyLangs/web/firebase/idiom generator/data"
)

EXPECTED_DOMAIN_COUNT = 10
EXPECTED_WEIGHT_SUM = 100
LOW_SCORE_DOMAIN_THRESHOLD = 8.5


# ---------------------------------------------------------------------------
# 1. 배치 스캔 — review_idiom.py의 resolve_json_file()과 동일한 경로
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
        candidates = [
            batch_dir / f"idiom_{batch_id}.runtime.json",
            batch_dir / "data.json",
        ]
        fp = next((c for c in candidates if c.is_file()), None)
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
# 3. 검증 및 게이트 (domains 리스트, de_idiomatization 강제 게이트)
# ---------------------------------------------------------------------------

def validate_and_gate(result: dict, pass_threshold: float, review_threshold: float,
                       de_idiom_threshold: int) -> dict:
    domains = result.get("domains", [])
    if len(domains) != EXPECTED_DOMAIN_COUNT:
        result["_pipeline_error"] = f"domains 개수가 {len(domains)}개 (기대값 {EXPECTED_DOMAIN_COUNT})"
        result["decision"] = "FAIL"
        result["needs_review"] = True
        return result

    weight_sum = sum(d.get("weight", 0) for d in domains)
    if weight_sum != EXPECTED_WEIGHT_SUM:
        result["_pipeline_error"] = f"weight 합계가 {weight_sum} (기대값 {EXPECTED_WEIGHT_SUM})"
        result["decision"] = "FAIL"
        result["needs_review"] = True
        return result

    recomputed = round(sum((d.get("score", 0) / 10) * d.get("weight", 0) for d in domains), 2)
    result["final_score_recomputed"] = recomputed

    min_domain_score = min((d.get("score", 0) for d in domains), default=0)
    blocking = list(result.get("blocking_issues", []))

    # de_idiomatization 강제 게이트: violation_count가 임계값 이상이면
    # 모델이 blocking_issues에 안 넣었어도 파이프라인이 강제로 FAIL 처리
    for d in domains:
        if d.get("key") == "de_idiomatization":
            vcount = d.get("violation_count")
            if vcount is None:
                vcount = len(d.get("violations", []))
            if vcount >= de_idiom_threshold:
                msg = f"탈이디엄화 위반 {vcount}건 (임계값 {de_idiom_threshold}) — 파이프라인 강제 FAIL"
                if msg not in blocking:
                    blocking.append(msg)
    result["blocking_issues"] = blocking

    # score_reasoning 누락 검사 (v1.1 addendum 필드)
    missing_reasoning = [
        d.get("key", "?") for d in domains
        if d.get("score", 10) < LOW_SCORE_DOMAIN_THRESHOLD
        and not (d.get("score_reasoning") or "").strip()
    ]
    if missing_reasoning:
        result["_pipeline_error"] = f"저점 도메인에 score_reasoning 누락: {missing_reasoning}"
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

def build_review_block_text(target_lang: str, batch_id: str, batch_json: dict, result: dict) -> str:
    lines = []
    lines.append(f"# 재검수 요청 — series=idiom target={target_lang} batch_id={batch_id}")
    lines.append("")
    lines.append(f"## 채점 결과 (final_score={result.get('final_score_recomputed')}, decision={result.get('decision')})")
    lines.append("")
    if result.get("_pipeline_error"):
        lines.append(f"## 파이프라인 오류 (FAIL 직결 사유): {result['_pipeline_error']}")
        lines.append("")
    for d in result.get("domains", []):
        lines.append(f"- [{d.get('key')}] {d.get('name')}: {d.get('score')}/10 (weight {d.get('weight')})")
        if d.get("issues"):
            for issue in d["issues"]:
                lines.append(f"    · issue: {issue}")
        reasoning = d.get("score_reasoning") or d.get("comment")
        if reasoning:
            lines.append(f"    · 사유: {reasoning}")
        if d.get("key") == "de_idiomatization" and d.get("violations"):
            for v in d["violations"]:
                lines.append(
                    f"    · [탈이디엄화 위반] rank={v.get('frequency_rank')} lang={v.get('lang')} "
                    f"location={v.get('location')} found=\"{v.get('found_expression')}\": {v.get('issue')}"
                )

    blocking = result.get("blocking_issues", [])
    if blocking:
        lines.append("")
        lines.append("## blocking_issues (FAIL 직결 사유)")
        for b in blocking:
            lines.append(f"- {b}")

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
    lines.append("## 원본 JSON")
    lines.append("```json")
    lines.append(json.dumps(batch_json, ensure_ascii=False, indent=2))
    lines.append("```")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# 5. 메인 오케스트레이션
# ---------------------------------------------------------------------------

def run(root: Path, prompt_dir: Path, prompt_file: str, target_lang: str, batch_filter,
        dry_run: bool, model: str, pass_threshold: float, review_threshold: float,
        de_idiom_threshold: int):

    entries = scan_batches(root, batch_filter)
    if not entries:
        print(f"[스캔 결과] {root} 아래에서 조건에 맞는 파일을 찾지 못했습니다.")
        return

    print(f"[스캔 결과] {len(entries)}개 배치 발견 (series=idiom target_lang={target_lang})")
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

        user_message = f"실제 폴더 경로: {fp.as_posix()}\ntarget_lang: {target_lang}\nbatch_id: {batch_id}\ndata.json 내용:\n{json.dumps(batch_json, ensure_ascii=False)}"

        print(f"[채점 중] target_lang={target_lang} batch_id={batch_id} ...")
        try:
            result = call_deepseek(api_key, model, system_prompt, user_message)
        except RuntimeError as e:
            print(f"[오류] {e}", file=sys.stderr)
            outcomes[batch_id] = {"error": str(e)}
            continue

        result = validate_and_gate(result, pass_threshold, review_threshold, de_idiom_threshold)
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
        print(f"REVIEW_{target_lang.upper()}.md 세션에 붙여넣으세요.")
        print("=" * 80)
        for batch_id in review_batches:
            o = outcomes[batch_id]
            print()
            print(build_review_block_text(target_lang, batch_id, o["batch_json"], o["result"]))
    else:
        print("\n재검수가 필요한 배치가 없습니다.")


def parse_args():
    p = argparse.ArgumentParser(description="idiom generator/data 원본 기준 DeepSeek 채점 파이프라인 (결과는 터미널 출력)")
    p.add_argument("--root", default=str(DEFAULT_ROOT), help="idiom generator/data 경로")
    p.add_argument("--target-lang", required=True,
                   choices=["kr", "en", "es", "fr", "pt", "zh", "jp", "ru"],
                   help="이 root 폴더 전체의 target 언어")
    p.add_argument("--prompt-dir", default=".", help="평가 프롬프트 폴더")
    p.add_argument("--prompt-file", default=None, help="평가 프롬프트 파일명 (기본: EVAL_{TARGET-LANG 대문자}.md)")
    p.add_argument("--batch", default="", help="예: 001,010-015 (기본: 전체)")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--model", default="deepseek-chat")
    p.add_argument("--pass-threshold", type=float, default=80.0)
    p.add_argument("--review-threshold", type=float, default=85.0)
    p.add_argument("--de-idiom-threshold", type=int, default=3)
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    prompt_file = args.prompt_file or f"EVAL_{args.target_lang.upper()}.md"
    run(
        root=Path(args.root),
        prompt_dir=Path(args.prompt_dir),
        prompt_file=prompt_file,
        target_lang=args.target_lang,
        batch_filter=parse_batch_filter(args.batch),
        dry_run=args.dry_run,
        model=args.model,
        pass_threshold=args.pass_threshold,
        review_threshold=args.review_threshold,
        de_idiom_threshold=args.de_idiom_threshold,
    )