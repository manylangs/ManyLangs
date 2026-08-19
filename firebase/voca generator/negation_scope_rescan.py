#!/usr/bin/env python3
"""
negation_scope_rescan.py (v1)

목적
----
deepseek_eval_pipeline.py의 9영역 풀채점을 144개 전체에 돌리기 전에,
"부정/가능·불가능/양태의 적용 대상(scope)이 target과 다른 술어로 이동한
오역" 패턴 하나만 저렴하게 먼저 스캔하는 전용 도구.

예: target "He didn't persuade his parents to buy the car."
    kr(오역) "그는 부모님을 설득해서 그 차를 사지 못했다." (부정이
    persuade가 아니라 buy 쪽으로 이동)

동작 방식 (2단계)
------------------
1단계 (항상 실행, API 비용 없음):
    각 block의 각 example에서 target 문자열에 "사역/설득/허용/요청" 류
    다중 술어 동사 + 부정 표지가 동시에 등장하는지 로컬 키워드로 스캔한다.
    해당하면 "후보(candidate)"로 표시하고, 그 example의 모든 언어 컬럼
    (target 포함)을 후보 리포트에 함께 기록한다.

    이건 결정론적 규칙 기반 필터일 뿐이라 실제로 오역인지는 확정하지
    않는다 -- 다만 이 패턴이 아예 없는 압도적 다수의 example을 걸러내서
    사람이 볼 양(또는 2단계에서 LLM에 보낼 양)을 크게 줄여준다.

2단계 (--verify 옵션 줄 때만, DeepSeek API 비용 발생):
    1단계에서 나온 후보만 골라서, 9영역 풀채점이 아니라 이 scope 문제
    하나만 보는 아주 작은 전용 프롬프트로 DeepSeek을 호출해 언어별로
    OK / SCOPE_ERROR 판정과 수정 제안을 받는다. 후보 수가 적으므로
    144개 전체 풀채점보다 훨씬 저렴하다.

출력
----
- 터미널에 요약 + 후보 상세를 출력
- --out으로 지정한 경로에 JSON 리포트 저장 (기본: negation_scope_report_<timestamp>.json)

사용법
------
  # 1) 먼저 무료로 후보만 스캔 (API 호출 없음)
  python3 negation_scope_rescan.py \
      --root "/Users/junghasuk/Desktop/ManyLangs/web/firebase/voca generator/data" \
      --target-lang en

  # 2) 후보에 대해서만 DeepSeek로 실제 scope 오류 여부 검증까지
  export DEEPSEEK_API_KEY=sk-xxxx
  python3 negation_scope_rescan.py \
      --root "/Users/junghasuk/Desktop/ManyLangs/web/firebase/voca generator/data" \
      --target-lang en \
      --verify

  옵션:
    --root PATH           voca generator/data 경로
    --target-lang kr|en   이 root 폴더 전체의 target 언어 (필수)
    --batch 001,002,010-015  특정 batch_id만 (기본: 전체 001-144, 존재하는 것만)
    --verify               1단계 후보에 대해 DeepSeek 검증까지 수행 (API 비용 발생)
    --model                DeepSeek 모델명 (기본: deepseek-chat)
    --out PATH              JSON 리포트 저장 경로
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions"

DEFAULT_ROOT = Path(
    "/Users/junghasuk/Desktop/ManyLangs/web/firebase/voca generator/data"
)

ALL_LANGS = ["target", "en", "es", "fr", "pt", "kr", "jp", "zh"]

# ---------------------------------------------------------------------------
# 1단계: 로컬 키워드 기반 후보 필터
# ---------------------------------------------------------------------------
# 다중 술어(사역/설득/허용/요청 등) 동사 트리거 -- target 언어 기준으로만 감지한다.
# (helper 언어 쪽은 자동으로 scope를 판정하기 어려우므로, target에서 후보를
#  잡은 뒤 모든 언어 컬럼을 함께 리포트에 실어 2단계나 사람이 보게 한다.)

TRIGGER_VERBS = {
    "en": [
        "persuade", "convince", "allow", "permit", "let", "ask", "tell",
        "want", "expect", "order", "forbid", "encourage", "discourage",
        "urge", "invite", "force", "require", "advise", "warn", "remind",
        "teach", "help", "get", "cause", "make",
    ],
    "kr": [
        "설득", "허락", "허용", "시키", "하게 하", "하도록 하", "부탁",
        "요청", "명령", "금지", "권유", "강요", "재촉", "종용", "부추기",
        "말리", "허가", "타이르", "당부",
    ],
    "es": [
        "persuadir", "convencer", "permitir", "dejar", "pedir", "decir",
        "querer", "esperar", "ordenar", "prohibir", "animar", "desanimar",
        "instar", "invitar", "obligar", "requerir", "aconsejar", "advertir",
        "recordar", "enseñar", "ayudar", "hacer que", "hacer",
    ],
    "fr": [
        "persuader", "convaincre", "permettre", "laisser", "demander",
        "dire", "vouloir", "attendre", "espérer", "ordonner", "interdire",
        "encourager", "décourager", "inciter", "inviter", "forcer",
        "obliger", "exiger", "conseiller", "avertir", "rappeler",
        "enseigner", "apprendre", "aider", "faire",
    ],
    "pt": [
        "persuadir", "convencer", "permitir", "deixar", "pedir", "dizer",
        "querer", "esperar", "ordenar", "proibir", "encorajar",
        "desencorajar", "instar", "convidar", "forçar", "obrigar",
        "exigir", "aconselhar", "avisar", "lembrar", "ensinar", "ajudar",
        "fazer com que", "fazer",
    ],
    "jp": [
        "説得", "納得させ", "許可", "許す", "させ", "してもらう", "頼む",
        "望む", "期待", "命令", "禁じ", "勧め", "誘う", "強制", "要求",
        "助言", "警告", "教え", "手伝",
    ],
    "zh": [
        "说服", "劝阻", "劝", "允许", "让", "请", "要求", "希望", "期待",
        "命令", "禁止", "鼓励", "邀请", "强迫", "建议", "警告", "提醒",
        "教", "帮助",
    ],
}

NEGATION_MARKERS = {
    "en": [
        r"\bnot\b", r"n't\b", r"\bnever\b", r"no longer", r"unable to",
        r"\bfailed to\b",
    ],
    "kr": [
        r"지\s*않", r"지\s*못하", r"안\s", r"못\s", r"말라", r"마라",
        r"없다", r"않았", r"못했",
    ],
    "es": [
        r"\bno\s", r"\bnunca\b", r"\btampoco\b", r"\bjamás\b", r"\bni\b",
    ],
    "fr": [
        r"ne\s.*\spas\b", r"n['’]", r"ne\s.*\sjamais\b", r"ne\s.*\splus\b",
        r"ne\s.*\srien\b",
    ],
    "pt": [
        r"\bnão\s", r"\bnunca\b", r"\bjamais\b", r"\bnem\b",
    ],
    "jp": [
        r"ない", r"ません", r"なかった", r"ませんでした", r"できない",
        r"できなかった",
    ],
    "zh": [
        r"不", r"没有", r"没", r"别", r"未",
    ],
}


def contains_any(text: str, patterns) -> bool:
    for p in patterns:
        if re.search(p, text):
            return True
    return False


LATIN_SCRIPT_LANGS = {"en", "es", "fr", "pt"}


def local_scope_candidate(target_lang: str, target_text: str) -> bool:
    """target 문자열이 '다중 술어 동사 + 부정 표지'를 동시에 포함하는가."""
    if not isinstance(target_text, str) or not target_text.strip():
        return False
    verbs = TRIGGER_VERBS.get(target_lang, [])
    negs = NEGATION_MARKERS.get(target_lang, [])
    if not verbs or not negs:
        return False
    use_boundary = target_lang in LATIN_SCRIPT_LANGS
    has_verb = any(
        re.search((r"\b" + re.escape(v) + r"\b") if use_boundary else re.escape(v), target_text)
        for v in verbs
    )
    has_neg = contains_any(target_text, negs)
    return has_verb and has_neg


# ---------------------------------------------------------------------------
# 배치 스캔 (deepseek_eval_pipeline.py와 동일한 규칙: root/{batch_id}/data.json)
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
        data_file = batch_dir / "data.json"
        if data_file.is_file():
            found.append((batch_id, data_file))
    return found


# ---------------------------------------------------------------------------
# 1단계 실행: 모든 배치를 훑어 후보 리스트 생성
# ---------------------------------------------------------------------------

def find_candidates(batch_id: str, batch_json: dict, target_lang: str):
    candidates = []
    for block in batch_json.get("blocks", []):
        block_id = block.get("id", "?")
        for idx, example in enumerate(block.get("examples", []), start=1):
            if not isinstance(example, dict):
                continue
            target_text = example.get("target", "")
            if local_scope_candidate(target_lang, target_text):
                langs_snapshot = {lang: example.get(lang, "") for lang in ALL_LANGS}
                candidates.append({
                    "batch_id": batch_id,
                    "block_id": block_id,
                    "example_index": idx,
                    "languages": langs_snapshot,
                })
    return candidates


# ---------------------------------------------------------------------------
# 2단계 (선택): 후보만 DeepSeek로 scope 검증
# ---------------------------------------------------------------------------

VERIFY_SYSTEM_PROMPT = """당신은 번역 QA의 negation/modality scope 및 argument structure 전담 검증자다.

입력으로 하나의 example(target 문장 하나 + 그 번역들)을 받는다. 이 example은
"사역/설득/허용/요청 등 [동사 + 대상 + to V] 다중 술어 구조 + 부정/가능·불가능"
패턴이 target에 있다고 이미 로컬 필터로 걸러진 후보다.

각 번역 언어에 대해 다음만 확인한다:
1. 부정(not/n't 등)·가능/불가능·시제·양태가 target과 "동일한 술어"에 걸리는가.
   (예: target이 주동사=persuade에 부정이 걸리는 구조라면, 번역도 반드시
   설득/persuade 계열 동사에 부정이 걸려야 한다. 종속동사(buy 등) 쪽으로
   부정이 옮겨가면 SCOPE_ERROR다.)
2. 사역·설득·허용 구조에서 행위 주체(누가 누구에게 무엇을 하는가)가
   target과 동일한가.

문법적으로 자연스럽고 말이 되더라도, scope나 행위 주체가 target과
다르면 SCOPE_ERROR로 판정한다. 자연스러움·문체·다른 오류는 이 검증의
대상이 아니다 (다른 단계에서 이미 다룬다).

출력은 다음 JSON 스키마 하나만, 설명 없이 출력한다:

{
  "verdicts": {
    "en": {"status": "OK|SCOPE_ERROR|N/A", "issue": "", "suggested_fix": ""},
    "es": {"status": "OK|SCOPE_ERROR|N/A", "issue": "", "suggested_fix": ""},
    "fr": {"status": "OK|SCOPE_ERROR|N/A", "issue": "", "suggested_fix": ""},
    "pt": {"status": "OK|SCOPE_ERROR|N/A", "issue": "", "suggested_fix": ""},
    "kr": {"status": "OK|SCOPE_ERROR|N/A", "issue": "", "suggested_fix": ""},
    "jp": {"status": "OK|SCOPE_ERROR|N/A", "issue": "", "suggested_fix": ""},
    "zh": {"status": "OK|SCOPE_ERROR|N/A", "issue": "", "suggested_fix": ""}
  }
}

target 언어 자체의 컬럼은 검증 대상이 아니므로 verdicts에 넣지 않는다
(예: target=en이면 verdicts에 "en"은 넣지 않는다 -- en은 target의 미러이므로
자동으로 일치한다). 해당 언어 값이 비어 있거나 없으면 status는 "N/A"로 둔다.
"""


def call_deepseek(api_key: str, model: str, system_prompt: str, user_message: str,
                   max_retries: int = 3, timeout: int = 60) -> dict:
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
            text = content.strip()
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)
            return json.loads(text)
        except (urllib.error.URLError, urllib.error.HTTPError, KeyError, ValueError) as e:
            last_err = e
            if attempt < max_retries:
                wait = min(2 ** attempt, 10)
                print(f"      (재시도 {attempt}/{max_retries}, {wait}초 대기: {e})", flush=True)
                time.sleep(wait)
    raise RuntimeError(f"DeepSeek 호출 실패 (재시도 {max_retries}회 소진): {last_err}")


def verify_candidate(api_key: str, model: str, target_lang: str, candidate: dict) -> dict:
    user_message = (
        f"target_lang: {target_lang}\n"
        f"batch_id: {candidate['batch_id']}, block_id: {candidate['block_id']}, "
        f"example_index: {candidate['example_index']}\n"
        f"languages: {json.dumps(candidate['languages'], ensure_ascii=False)}"
    )
    return call_deepseek(api_key, model, VERIFY_SYSTEM_PROMPT, user_message)


# ---------------------------------------------------------------------------
# 메인
# ---------------------------------------------------------------------------

def run(root: Path, target_lang: str, batch_filter, do_verify: bool, model: str, out_path: Path):
    entries = scan_batches(root, batch_filter)
    if not entries:
        print(f"[스캔 결과] {root} 아래에서 조건에 맞는 data.json을 찾지 못했습니다.")
        return

    print(f"[스캔 시작] {len(entries)}개 배치, target_lang={target_lang}")

    all_candidates = []
    for batch_id, fp in entries:
        try:
            batch_json = json.loads(fp.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            print(f"[오류] JSON 파싱 실패: {fp} ({e})", file=sys.stderr)
            continue
        cands = find_candidates(batch_id, batch_json, target_lang)
        if cands:
            print(f"  - batch_id={batch_id}: 후보 {len(cands)}건")
        all_candidates.extend(cands)

    print(f"\n[1단계 완료] 전체 {len(entries)}개 배치 중 후보 {len(all_candidates)}건 발견 (API 비용 없음)")

    if not all_candidates:
        print("후보가 없습니다. 이 패턴에 대해서는 추가 조치가 필요 없어 보입니다.")
        report = {"target_lang": target_lang, "candidates": [], "verified": False}
        out_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\n리포트 저장: {out_path}")
        return

    print("\n" + "=" * 80)
    print("후보 상세 (target에 사역/설득/허용/요청 + 부정 패턴 동시 발견)")
    print("=" * 80)
    for c in all_candidates:
        print(f"\n[batch={c['batch_id']} block={c['block_id']} example={c['example_index']}]")
        for lang in ALL_LANGS:
            val = c["languages"].get(lang, "")
            if val:
                print(f"  {lang}: {val}")

    if not do_verify:
        report = {"target_lang": target_lang, "candidates": all_candidates, "verified": False}
        out_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\n[안내] --verify 옵션 없이 실행되어 로컬 후보 목록만 저장했습니다.")
        print(f"리포트 저장: {out_path}")
        print("이 목록을 사람이 직접 검토하거나, --verify를 붙여 DeepSeek 검증을 추가로 돌리세요.")
        return

    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        print("DEEPSEEK_API_KEY 환경변수가 설정되어 있지 않습니다.", file=sys.stderr)
        sys.exit(1)

    print(f"\n[2단계 시작] 후보 {len(all_candidates)}건에 대해 DeepSeek scope 검증 중...")
    scope_error_count = 0
    for i, c in enumerate(all_candidates, start=1):
        print(f"  ({i}/{len(all_candidates)}) 검증 중: batch={c['batch_id']} "
              f"block={c['block_id']} example={c['example_index']} ...", flush=True)
        try:
            verdict = verify_candidate(api_key, model, target_lang, c)
        except RuntimeError as e:
            print(f"    [오류] {e}", file=sys.stderr)
            c["verify_error"] = str(e)
            continue
        c["verdicts"] = verdict.get("verdicts", {})
        errored_langs = [lang for lang, v in c["verdicts"].items()
                          if isinstance(v, dict) and v.get("status") == "SCOPE_ERROR"]
        if errored_langs:
            scope_error_count += 1
            print(f"    [SCOPE_ERROR] 문제 언어: {', '.join(errored_langs)}")
            for lang in errored_langs:
                v = c["verdicts"][lang]
                print(f"      {lang}: {v.get('issue', '')}")
                print(f"      제안: {v.get('suggested_fix', '')}")
        else:
            print(f"    OK")

    print("\n" + "=" * 80)
    print(f"[2단계 완료] 후보 {len(all_candidates)}건 중 실제 SCOPE_ERROR {scope_error_count}건")
    print("=" * 80)

    report = {"target_lang": target_lang, "candidates": all_candidates, "verified": True,
              "scope_error_count": scope_error_count}
    out_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n리포트 저장: {out_path}")
    print("SCOPE_ERROR로 나온 항목만 골라서 재검수프롬프트 세션에 수동으로 반영하거나,")
    print("voca_review.py의 ALL_REPLACEMENTS에 직접 patch를 작성하면 됩니다.")


def parse_args():
    p = argparse.ArgumentParser(
        description="001-144 전체에서 negation/modality scope 오류 후보를 저렴하게 먼저 스캔하는 도구"
    )
    p.add_argument("--root", default=str(DEFAULT_ROOT), help="voca generator/data 경로")
    p.add_argument("--target-lang", required=True, choices=["kr", "en", "es", "fr", "pt", "jp", "zh"],
                    help="이 root 폴더 전체의 target 언어")
    p.add_argument("--batch", default="", help="예: 001,002,010-015 (기본: 전체)")
    p.add_argument("--verify", action="store_true",
                    help="1단계 후보에 대해 DeepSeek 검증까지 수행 (API 비용 발생)")
    p.add_argument("--model", default="deepseek-chat")
    p.add_argument("--out", default="", help="JSON 리포트 저장 경로 (기본: negation_scope_report_<timestamp>.json)")
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    out_path = Path(args.out) if args.out else Path(
        f"negation_scope_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    )
    run(
        root=Path(args.root),
        target_lang=args.target_lang,
        batch_filter=parse_batch_filter(args.batch),
        do_verify=args.verify,
        model=args.model,
        out_path=out_path,
    )   