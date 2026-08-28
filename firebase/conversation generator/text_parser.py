#!/usr/bin/env python3
"""
text_parser.py — GENERATOR/TRANSLATOR가 순수 텍스트로 출력한 회화를
표준 compact 스키마(JSON)로 파싱한다.

왜 텍스트인가:
DeepSeek이 중첩 JSON(따옴표 이스케이프, 키 이름, 중첩 구조)을 매번 정확히
만드는 데 반복적으로 실패했다 (스키마 편차 4종, 따옴표 이스케이프 누락으로
인한 파싱 실패 등). 반면 "A: 문장" 같은 평범한 줄글은 안정적으로 잘 낸다.
그래서 모델에게는 텍스트만 쓰게 하고, 구조화는 이 파서가 전담한다.

기대하는 입력 형식 (target 생성용, GENERATOR_{LANG}.md가 이렇게 출력):

    LEVEL: a1
    CHAPTER_ID: CONV_ES_GREETINGS
    TITLE: Saludos

    SET 001
    A: 문장1
    B: 문장2
    A: 문장3
    B: 문장4
    A: 문장5
    B: 문장6

    SET 002
    A: ...
    ...

번역용(TRANSLATOR_{LANG}.md)은 LEVEL/CHAPTER_ID 줄이 없어도 된다 (선택적).

파서는 헤더 필드를 순서·개수 상관없이 찾고, SET 블록을 번호 순서와
무관하게 찾아서 정렬하며, 각 세트 안의 A/B 줄은 등장 순서대로 그대로
사용한다 (A/B 라벨 자체는 무시하고 순서만 사용 — 화자 라벨을 다른 문자로
써도 죽지 않도록).
"""
import argparse
import json
import re
import sys
from pathlib import Path

EXPECTED_SET_COUNT = 10
EXPECTED_LINES_PER_SET = 6

HEADER_PATTERNS = {
    "level": re.compile(r"^\s*LEVEL\s*:\s*(.+?)\s*$", re.IGNORECASE | re.MULTILINE),
    "chapter_id": re.compile(r"^\s*CHAPTER_ID\s*:\s*(.+?)\s*$", re.IGNORECASE | re.MULTILINE),
    "title": re.compile(r"^\s*TITLE\s*:\s*(.+?)\s*$", re.IGNORECASE | re.MULTILINE),
    "id": re.compile(r"^\s*ID\s*:\s*(.+?)\s*$", re.IGNORECASE | re.MULTILINE),
}

# "SET 001", "SET 1", "Set001", "세트 001" 등 유연하게 인식
SET_HEADER_RE = re.compile(
    r"^\s*(?:SET|세트)\s*[_ ]?0*(\d+)\s*$", re.IGNORECASE | re.MULTILINE
)

# 줄 시작의 화자 라벨 "A:", "B:", "가:", "나:" 등을 허용하되, 라벨 자체는 버리고
# 순서만 사용한다.
LINE_RE = re.compile(r"^\s*[A-Za-z가-힣]{1,4}\s*[:：]\s*(.+?)\s*$")


def extract_headers(text: str) -> dict:
    headers = {}
    for key, pattern in HEADER_PATTERNS.items():
        m = pattern.search(text)
        if m:
            headers[key] = m.group(1).strip()
    return headers


def extract_sets(text: str) -> dict:
    """SET 블록들을 찾아 {정수번호: [문장, ...]} 형태로 반환."""
    matches = list(SET_HEADER_RE.finditer(text))
    if not matches:
        raise ValueError("SET 블록을 하나도 찾지 못함 (예: 'SET 001' 형식 필요)")

    sets = {}
    for i, m in enumerate(matches):
        set_num = int(m.group(1))
        block_start = m.end()
        block_end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        block_text = text[block_start:block_end]

        lines = []
        for raw_line in block_text.splitlines():
            raw_line = raw_line.strip()
            if not raw_line:
                continue
            line_m = LINE_RE.match(raw_line)
            if line_m:
                lines.append(line_m.group(1).strip())
            # 화자 라벨이 없는 줄(빈 줄, 구분선 등)은 조용히 무시

        sets[set_num] = lines

    return sets


def parse_conversation_text(text: str, require_level_chapter: bool = True) -> dict:
    """전체 텍스트를 파싱해서 compact 스키마 dict를 반환.
    require_level_chapter=True면 LEVEL/CHAPTER_ID가 없을 때 오류
    (target 생성용). 번역용은 False로 호출."""
    headers = extract_headers(text)

    if "title" not in headers or not headers["title"]:
        raise ValueError("TITLE 헤더를 찾지 못함")

    if require_level_chapter:
        if "level" not in headers:
            raise ValueError("LEVEL 헤더를 찾지 못함")
        if "chapter_id" not in headers:
            raise ValueError("CHAPTER_ID 헤더를 찾지 못함")

    raw_sets = extract_sets(text)

    if len(raw_sets) != EXPECTED_SET_COUNT:
        raise ValueError(f"SET 개수 오류: {len(raw_sets)} (10이어야 함)")

    sorted_nums = sorted(raw_sets.keys())
    if sorted_nums != list(range(1, EXPECTED_SET_COUNT + 1)):
        raise ValueError(f"SET 번호가 1~10 연속이 아님: {sorted_nums}")

    sets_out = {}
    for num in sorted_nums:
        lines = raw_sets[num]
        if len(lines) != EXPECTED_LINES_PER_SET:
            raise ValueError(f"SET {num:03d}의 줄 수 오류: {len(lines)} (6이어야 함)")
        for i, line in enumerate(lines):
            if not line.strip():
                raise ValueError(f"SET {num:03d} idx {i} 빈 문장")
        sets_out[f"{num:03d}"] = lines

    result = {
        "lang": "target" if require_level_chapter else None,  # 호출부에서 lang 채움
        "title": headers["title"],
        "sets": sets_out,
    }
    if "level" in headers:
        result["level"] = headers["level"].lower()
    if "chapter_id" in headers:
        result["chapter_id"] = headers["chapter_id"]
    if "id" in headers:
        result["id"] = headers["id"]

    return result


def main():
    parser = argparse.ArgumentParser(description="텍스트 회화 형식을 compact JSON으로 변환 (테스트/단독 실행용)")
    parser.add_argument("input_file", help="파싱할 .txt 파일 경로")
    parser.add_argument("--out", help="저장할 JSON 경로 (생략하면 화면 출력만)")
    parser.add_argument("--translate", action="store_true", help="번역용 모드 (LEVEL/CHAPTER_ID 없어도 됨)")
    args = parser.parse_args()

    text = Path(args.input_file).read_text(encoding="utf-8")
    try:
        result = parse_conversation_text(text, require_level_chapter=not args.translate)
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
