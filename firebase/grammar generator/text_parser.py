#!/usr/bin/env python3
"""
text_parser.py — GENERATOR/TRANSLATOR가 순수 텍스트로 출력한 문법 챕터를
표준 compact 스키마(JSON)로 파싱한다. conversation 파이프라인의
text_parser.py와 동일한 이유로 텍스트 출력을 쓴다: DeepSeek이 17블록짜리
중첩 JSON을 매번 정확히 만드는 데 반복적으로 실패했기 때문이다. 모델에게는
"EXP 1 / ... / EX CORE 1 / ..." 같은 평범한 줄글만 쓰게 하고, 구조화는
이 파서가 전담한다.

기대하는 입력 형식 (target 생성용, GENERATOR_{LANG}.md가 이렇게 출력):

    LEVEL: a1
    CHAPTER_ID: A1_EN_SENTENCE_BASICS
    TITLE: Sentence Basics: Subject, Verb, and Object

    EXP 1
    문장 하나 (grammar_explanation 1/5 — 이게 뭔가)

    EXP 2
    문장 하나 (2/5 — 어떻게 작동하나)

    EXP 3
    문장 하나 (3/5 — 언제 쓰고 언제 못 쓰나)

    EXP 4
    문장 하나 (4/5 — 뭐가 다른가)

    EXP 5
    문장 하나 (5/5 — 주의할 점)

    EX CORE 1
    문장

    EX CORE 2
    문장

    EX CORE 3
    문장

    EX CORE 4
    문장

    EX VAR 1
    문장
    ... (EX VAR 4까지)

    EX EXT 1
    문장
    ... (EX EXT 4까지)

번역용(TRANSLATOR_{LANG}.md)은 LEVEL/CHAPTER_ID 줄이 없어도 된다 (선택적).
EXP/EX 블록의 순서와 번호만 있으면 파싱된다. 블록 라벨 뒤에 오는 첫 번째
비어있지 않은 줄들을 그 블록의 문장으로 사용한다 (여러 줄이면 공백으로
이어붙인다 — 모델이 문장을 실수로 줄바꿈했을 때 대비).
"""
import argparse
import json
import re
import sys
from pathlib import Path

EXPECTED_EXP = 5
EXPECTED_CORE = 4
EXPECTED_VAR = 4
EXPECTED_EXT = 4
EXPECTED_BLOCK_COUNT = EXPECTED_EXP + EXPECTED_CORE + EXPECTED_VAR + EXPECTED_EXT  # 17

HEADER_PATTERNS = {
    "level": re.compile(r"^\s*LEVEL\s*:\s*(.+?)\s*$", re.IGNORECASE | re.MULTILINE),
    "chapter_id": re.compile(r"^\s*CHAPTER_ID\s*:\s*(.+?)\s*$", re.IGNORECASE | re.MULTILINE),
    "title": re.compile(r"^\s*TITLE\s*:\s*(.+?)\s*$", re.IGNORECASE | re.MULTILINE),
    "id": re.compile(r"^\s*ID\s*:\s*(.+?)\s*$", re.IGNORECASE | re.MULTILINE),
}

# "EXP 1" ~ "EXP 5"
EXP_RE = re.compile(r"^\s*EXP\s*[_ ]?0*(\d+)\s*$", re.IGNORECASE | re.MULTILINE)
# "EX CORE 1" ~ "EX CORE 4" (also accepts "EX_CORE", "EXAMPLE CORE")
CORE_RE = re.compile(r"^\s*EX(?:AMPLE)?[_ ]?CORE\s*[_ ]?0*(\d+)\s*$", re.IGNORECASE | re.MULTILINE)
# "EX VAR 1" ~ "EX VAR 4"
VAR_RE = re.compile(r"^\s*EX(?:AMPLE)?[_ ]?VAR(?:IATION)?S?\s*[_ ]?0*(\d+)\s*$", re.IGNORECASE | re.MULTILINE)
# "EX EXT 1" ~ "EX EXT 4"
EXT_RE = re.compile(r"^\s*EX(?:AMPLE)?[_ ]?EXT(?:ENDED)?\s*[_ ]?0*(\d+)\s*$", re.IGNORECASE | re.MULTILINE)

BLOCK_GROUPS = [
    ("EXP", EXP_RE, EXPECTED_EXP, "grammar_explanation", None),
    ("EX CORE", CORE_RE, EXPECTED_CORE, "grammar_example", "core_patterns"),
    ("EX VAR", VAR_RE, EXPECTED_VAR, "grammar_example", "variations"),
    ("EX EXT", EXT_RE, EXPECTED_EXT, "grammar_example", "extended_usage"),
]


def extract_headers(text: str) -> dict:
    headers = {}
    for key, pattern in HEADER_PATTERNS.items():
        m = pattern.search(text)
        if m:
            headers[key] = m.group(1).strip()
    return headers


def _extract_group(text: str, label: str, pattern: re.Pattern, expected_count: int) -> dict:
    """라벨(예: EXP)에 해당하는 블록들을 찾아 {번호: 문장} 딕셔너리로 반환.
    각 블록의 본문은 다음 마커(어떤 그룹이든)가 나오기 전까지의 텍스트다."""
    matches = list(pattern.finditer(text))
    if not matches:
        raise ValueError(f"{label} 블록을 하나도 찾지 못함")

    # 다음 마커 시작점을 찾기 위해 전체 마커(4개 그룹 전부)를 한 번에 모은다
    all_markers = []
    for _, pat, _, _, _ in BLOCK_GROUPS:
        all_markers.extend(m.start() for m in pat.finditer(text))
    all_markers.sort()

    out = {}
    for m in matches:
        num = int(m.group(1))
        start = m.end()
        # start 이후 첫 다음 마커 지점을 찾는다
        end = len(text)
        for pos in all_markers:
            if pos > m.start():
                end = pos
                break
        body = text[start:end]
        lines = [ln.strip() for ln in body.splitlines() if ln.strip()]
        sentence = " ".join(lines).strip()
        out[num] = sentence

    if len(out) != expected_count:
        raise ValueError(f"{label} 개수 오류: {len(out)} (expected {expected_count})")
    if sorted(out.keys()) != list(range(1, expected_count + 1)):
        raise ValueError(f"{label} 번호가 1~{expected_count} 연속이 아님: {sorted(out.keys())}")
    for num, sentence in out.items():
        if not sentence:
            raise ValueError(f"{label} {num} 빈 문장")
    return out


def parse_grammar_text(text: str, require_level_chapter: bool = True) -> dict:
    """전체 텍스트를 파싱해서 compact 스키마 dict를 반환.
    require_level_chapter=True면 LEVEL/CHAPTER_ID가 없을 때 오류
    (target 생성용). 번역용은 False로 호출.

    반환 구조:
        {
          "title": "...",
          "explanations": ["...", "...", "...", "...", "..."],       # 5
          "core_patterns": ["...", "...", "...", "..."],             # 4
          "variations": ["...", "...", "...", "..."],                # 4
          "extended_usage": ["...", "...", "...", "..."],            # 4
          "level": "...",        # require_level_chapter=True일 때만
          "chapter_id": "...",   # 위와 동일
        }
    """
    headers = extract_headers(text)

    if "title" not in headers or not headers["title"]:
        raise ValueError("TITLE 헤더를 찾지 못함")

    if require_level_chapter:
        if "level" not in headers:
            raise ValueError("LEVEL 헤더를 찾지 못함")
        if "chapter_id" not in headers:
            raise ValueError("CHAPTER_ID 헤더를 찾지 못함")

    result = {"title": headers["title"]}

    group_key_map = {
        "EXP": "explanations",
        "EX CORE": "core_patterns",
        "EX VAR": "variations",
        "EX EXT": "extended_usage",
    }

    for label, pattern, expected_count, _btype, _variant in BLOCK_GROUPS:
        parsed = _extract_group(text, label, pattern, expected_count)
        ordered = [parsed[i] for i in range(1, expected_count + 1)]
        result[group_key_map[label]] = ordered

    if "level" in headers:
        result["level"] = headers["level"].lower()
    if "chapter_id" in headers:
        result["chapter_id"] = headers["chapter_id"]
    if "id" in headers:
        result["id"] = headers["id"]

    return result


def to_blocks(parsed: dict) -> list:
    """parse_grammar_text() 결과를 checker.py가 기대하는 17블록 순서
    리스트([{type, variant?, text}, ...])로 펼친다. text 안의 언어 키
    채우기는 merge.py가 담당한다 (이 함수는 언어에 무관)."""
    blocks = []
    for text in parsed["explanations"]:
        blocks.append({"type": "grammar_explanation", "text": text})
    for text in parsed["core_patterns"]:
        blocks.append({"type": "grammar_example", "variant": "core_patterns", "text": text})
    for text in parsed["variations"]:
        blocks.append({"type": "grammar_example", "variant": "variations", "text": text})
    for text in parsed["extended_usage"]:
        blocks.append({"type": "grammar_example", "variant": "extended_usage", "text": text})
    assert len(blocks) == EXPECTED_BLOCK_COUNT
    return blocks


def main():
    parser = argparse.ArgumentParser(description="텍스트 문법 챕터 형식을 compact JSON으로 변환 (테스트/단독 실행용)")
    parser.add_argument("input_file", help="파싱할 .txt 파일 경로")
    parser.add_argument("--out", help="저장할 JSON 경로 (생략하면 화면 출력만)")
    parser.add_argument("--translate", action="store_true", help="번역용 모드 (LEVEL/CHAPTER_ID 없어도 됨)")
    args = parser.parse_args()

    text = Path(args.input_file).read_text(encoding="utf-8")
    try:
        result = parse_grammar_text(text, require_level_chapter=not args.translate)
    except ValueError as e:
        print(f"[파싱 실패] {e}", file=sys.stderr)
        sys.exit(1)

    output = json.dumps(result, ensure_ascii=False, indent=2)
    if args.out:
        Path(args.out).write_text(output + "\n", encoding="utf-8")
        print(f"[저장] {args.out}")
    else:
        print(output)


if __name__ == "__main__":
    main()
