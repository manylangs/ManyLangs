#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gender_audit.py (v4) — ManyLangs 성별(문법적 성) 검수기

v3와의 핵심 차이:
- 실행 시작 시 "전체 JSON 합성 전입니까? [y/n]" 한 번만 물어봐서
  입력 데이터의 단계를 분기한다.
    y → 기존 로직 100% 그대로 (target.json / en.json / ... 분리형, SRT 등)
    n → 최종 합본 JSON 모드: 상위 폴더의 2자리 언어 폴더(en, kr, es, ...)가
        target 언어를 확정하고, 각 JSON 파일 내부에 이미 8~9개 언어가
        합쳐져 있다고 가정한다. conversation뿈 아니라
        grammar/idiom/voca/real 전부 동일하게 처리된다.
- n 모드에서는 경로에서 얻은 target 언어를 그대로 믿지 않고, 실제로 그
  JSON 내부에 해당 언어 컬럼이 존재하는지 검증한다. 없으면 그 파일은
  API로 보내지 않고 SOURCE_LANG_MISSING 같은 구조 오류로 분리해서
  리포트한다.

v2와의 핵심 차이(기존):
- 폴더 이름(conversation/grammar/...)에 의존하지 않는다.
- 대신 파일명 패턴(*-target.json, *-{lang}.json)과 JSON 구조로
  콘텐츠타입/소스언어/형제파일을 전부 자동 판별한다.
- 검수 후 언어별로 파일이 쪼개진 상태(각 파일에 그 언어 텍스트만 있음)를
  전제로, 같은 접두사를 가진 형제 파일들을 하나의 세트로 묶어서 읽는다.

사용법:
    export DEEPSEEK_API_KEY="sk-..."
    python3 gender_audit.py
    (실행하면 대상 폴더의 절대경로와, "전체 JSON 합성 전입니까? [y/n]"을 물어봄)

    또는 비대화형으로:
    python3 gender_audit.py --path /절대/경로 --mode y
    python3 gender_audit.py --path /절대/경로 --mode n

    구조만 확인 (API 호출 없음):
    python3 gender_audit.py --path /절대/경로 --mode n --dry-run
"""

import argparse
import difflib
import json
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

from gender_audit_llm import audit_segments_via_llm, audit_segments_full_report

# ─────────────────────────────────────────────────────────
# 설정
# ─────────────────────────────────────────────────────────

GENDER_LANGS_FULL = {"es", "fr", "pt", "it", "ru"}
GENDER_LANGS_PARTIAL = {"de"}
ALL_GENDER_LANGS = GENDER_LANGS_FULL | GENDER_LANGS_PARTIAL

KNOWN_LANGS = ALL_GENDER_LANGS | {"en", "kr", "zh", "jp"}
# 파일명 끝의 언어/스테이지 접미사 패턴: {prefix}-{lang}.json 또는 {prefix}-{lang}.{stage}.json
FILE_PATTERN = re.compile(
    r"^(?P<prefix>.+)-(?P<lang>target|" + "|".join(sorted(KNOWN_LANGS)) + r")"
    r"(?:\.(?P<stage>draft|compact))?\.json$"
)

SPEAKER_GENDER = {"A": "F", "B": "M"}
SIMILARITY_THRESHOLD = 0.85

# SRT 파일명 패턴: {prefix}.{lang}.srt (점 구분, .all.srt는 lang 목록에 없어서 자동 제외)
SRT_FILE_PATTERN = re.compile(
    r"^(?P<prefix>.+)\.(?P<lang>target|" + "|".join(sorted(KNOWN_LANGS)) + r")\.srt$"
)


def parse_srt(path: Path) -> list[tuple[int, str]]:
    """SRT 파일을 (cue_index, text) 리스트로 파싱. 타임코드 줄은 버림."""
    try:
        raw = path.read_text(encoding="utf-8")
    except Exception as e:
        print(f"[PARSE ERROR] {path}: {e}", file=sys.stderr)
        return []

    cues = []
    blocks = re.split(r"\n\s*\n", raw.strip())
    for block in blocks:
        lines = [l for l in block.strip().split("\n") if l.strip()]
        if len(lines) < 2:
            continue
        try:
            idx = int(lines[0].strip())
        except ValueError:
            continue
        # lines[1]은 타임코드 (00:00:00,000 --> 00:00:02,000), lines[2:]가 텍스트
        text_lines = lines[2:] if len(lines) > 2 else []
        text = " ".join(text_lines).strip()
        if text:
            cues.append((idx, text))
    return cues


@dataclass
class Segment:
    group_key: str
    content_type: str
    unit_id: str
    sub_id: str
    role: str                              # "conversation_line" | "narrator"
    speaker: Optional[str] = None
    own_gender: Optional[str] = None
    interlocutor_gender: Optional[str] = None
    texts: dict = field(default_factory=dict)   # {lang: text}


# ─────────────────────────────────────────────────────────
# 1) 파일 탐색 및 형제파일 그룹핑
# ─────────────────────────────────────────────────────────

def discover_and_group(base_path: str) -> dict[str, dict]:
    """base_path 하위를 재귀 탐색해서 세트 그룹을 만든다.

    두 가지 형식을 모두 인식한다:
    (A) 분리형: {prefix}-{lang}.json / {prefix}-{lang}.draft.json 등
        → 같은 (폴더,prefix,stage)를 공유하는 파일들을 그룹으로 묶음
    (B) 통합형: {prefix}.json 하나에 blocks[].lines[].sentences가
        {lang: text, ...} 딕셔너리로 전부 들어있는 옛날 방식
        → 파일 하나가 그 자체로 그룹 (langs 딕셔너리엔 "__combined__"로 표시)
    """
    base = Path(base_path)
    groups: dict[str, dict[str, Path]] = {}
    split_matched_files: set[Path] = set()

    # (A) 분리형 먼저 매칭
    for jf in sorted(base.rglob("*.json")):
        if "/audio/" in str(jf):
            continue
        m = FILE_PATTERN.match(jf.name)
        if not m:
            continue
        prefix = m.group("prefix")
        lang = m.group("lang")
        stage = m.group("stage") or ""
        group_key = f"{jf.parent}::{prefix}::{stage}"
        groups.setdefault(group_key, {})[lang] = jf
        split_matched_files.add(jf)

    # (B) 분리형으로 안 잡힌 나머지 .json 중, 통합형(sentences가 dict) 구조인지 확인
    for jf in sorted(base.rglob("*.json")):
        if jf in split_matched_files or "/audio/" in str(jf):
            continue
        if jf.name in ("youtube_url_cache.json", "youtube_title_cache.json") or jf.name.endswith(".eval.json"):
            continue
        doc = load_json(jf)
        if doc is None or "blocks" not in doc:
            continue
        blocks = doc.get("blocks", [])
        if not blocks:
            continue
        # 첫 블록에서 sentences 또는 유사 필드가 dict-of-langs인지 확인
        is_combined = False
        b0 = blocks[0]
        for key in ("sentences",):
            lines = b0.get("lines")
            if lines and isinstance(lines[0].get(key), dict):
                is_combined = True
                break
        if is_combined:
            group_key = f"{jf.parent}::{jf.stem}::combined"
            groups[group_key] = {"__combined__": jf}

    return groups


def load_json(path: Path) -> Optional[dict]:
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[PARSE ERROR] {path}: {e}", file=sys.stderr)
        return None


# ─────────────────────────────────────────────────────────
# 2) 콘텐츠타입 자동판별 (구조 기반, 폴더명 무관)
# ─────────────────────────────────────────────────────────

def detect_content_type(d: dict) -> str:
    blocks = d.get("blocks")
    if not blocks:
        return "unknown"
    b0 = blocks[0]
    if "lines" in b0 and b0.get("lines") and "speaker" in b0["lines"][0]:
        return "conversation"
    if b0.get("type") in ("grammar_explanation", "grammar_example"):
        return "grammar"
    if "expression" in b0:
        return "idiom"
    if "word" in b0:
        return "voca"
    if b0.get("type") == "description" or b0.get("type") == "image":
        return "real"
    if "lines" in b0:
        # speaker 필드가 없어도 lines 구조면 conversation류로 취급 (인덱스로 A/B 결정)
        return "conversation"
    return "unknown"


# ─────────────────────────────────────────────────────────
# 3) 텍스트 유사도로 소스언어 판별
# ─────────────────────────────────────────────────────────

def flatten_texts(d: dict) -> str:
    """JSON에서 모든 문자열 leaf 값을 이어붙여 유사도 비교용 텍스트로 만든다."""
    parts = []

    def walk(obj):
        if isinstance(obj, str):
            parts.append(obj)
        elif isinstance(obj, dict):
            for v in obj.values():
                walk(v)
        elif isinstance(obj, list):
            for v in obj:
                walk(v)

    walk(d)
    return " ".join(parts)


def determine_source_lang(files: dict[str, Path]) -> Optional[str]:
    """target.json과 각 lang.json의 텍스트 유사도를 비교해서 소스언어를 판별.
    통합형(단일 파일)은 파일 내부에 target 필드가 이미 있으므로 None 반환."""
    if "__combined__" in files:
        return None
    if "target" not in files:
        return None
    target_doc = load_json(files["target"])
    if target_doc is None:
        return None
    target_text = flatten_texts(target_doc)
    if not target_text.strip():
        return None

    best_lang, best_ratio = None, 0.0
    for lang, path in files.items():
        if lang == "target":
            continue
        doc = load_json(path)
        if doc is None:
            continue
        ratio = difflib.SequenceMatcher(None, target_text, flatten_texts(doc)).ratio()
        if ratio > best_ratio:
            best_lang, best_ratio = lang, ratio

    if best_lang and best_ratio >= SIMILARITY_THRESHOLD:
        return best_lang
    return None


# ─────────────────────────────────────────────────────────
# 3.5) n모드(최종 합본 JSON) 전용 헬퍼
# ─────────────────────────────────────────────────────────

def detect_target_lang_from_path(path: Path, base: Path) -> Optional[str]:
    """경로의 상위 폴더들 중 2자리 언어 폴더(en, kr, es, ...)를 찾아 target으로 확정.
    예: .../conversation/en/a1/001/....json -> "en"
        .../conversation/kr/a1/001/....json -> "kr"
    base 기준 상대경로를 우선 쓰고, 실패하면 전체 경로를 그대로 훑는다."""
    try:
        parts = path.relative_to(base).parts
    except ValueError:
        parts = path.parts
    for part in parts:
        if part in KNOWN_LANGS:
            return part
    return None


def contains_target_lang(doc: dict, lang: str) -> bool:
    """경로에서 얻은 target 언어를 무조건 믿지 않고, doc 내부 어딘가에
    실제로 그 언어 컬럼이 존재하는지 검증한다. (언어맵으로 보이는 dict —
    키가 2개 이상 알려진 언어코드와 겹치는 dict — 안에 lang 키가 있으면 통과)"""
    found = False

    def walk(o):
        nonlocal found
        if found:
            return
        if isinstance(o, dict):
            keys = set(o.keys())
            if lang in keys and len(keys & KNOWN_LANGS) >= 2:
                found = True
                return
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)

    walk(doc)
    return found


def extract_lang_texts(v) -> dict:
    """v가 언어맵({lang: "text"} 또는 {lang: {"core": "text", ...}})이면
    {lang: text} 형태로 평탄화해서 반환. 언어맵이 아니면(예: 단일언어
    오브젝트 {"core":..., "meaning_zone":...}) 빈 dict를 반환한다.
    성별판정 대상 언어(ALL_GENDER_LANGS)뿐 아니라 target/en/kr/zh/jp도
    문맥 참고용으로 함께 추출한다.

    real 시리즈처럼 언어맵이 "texts"라는 래퍼 안에 한 번 더 감싸져 있는
    경우({"texts": {"en": "...", "es": "...", ...}})도 자동으로 풀어낸다 —
    real만 예외처리하는 게 아니라, 다른 콘텐츠타입에서 같은 래퍼 패턴이
    나와도 동일하게 처리되도록 일반화."""
    out = {}
    if not isinstance(v, dict):
        return out
    if ("texts" in v and isinstance(v["texts"], dict)
            and not (set(v.keys()) & KNOWN_LANGS)):
        v = v["texts"]
    allowed = ALL_GENDER_LANGS | {"target", "en", "kr", "zh", "jp"}
    for k, vv in v.items():
        if k not in allowed:
            continue
        if isinstance(vv, str):
            out[k] = vv
        elif isinstance(vv, dict):
            if isinstance(vv.get("core"), str):
                out[k] = vv["core"]
            else:
                for vk in vv.values():
                    if isinstance(vk, str):
                        out[k] = vk
                        break
    return out


def discover_final_merged_files(base_path: str) -> dict[str, dict]:
    """n모드(전체 JSON 합성 후): 상위 언어 폴더에서 target을 확정하고,
    파일 하나하나를 독립된 그룹으로 취급한다. 폴더명(conversation/grammar/
    idiom/voca/real)에 상관없이 전부 동일한 방식으로 처리된다."""
    base = Path(base_path)
    result: dict[str, dict] = {}
    for jf in sorted(base.rglob("*.json")):
        if "/audio/" in str(jf):
            continue
        if jf.name in ("youtube_url_cache.json", "youtube_title_cache.json") or jf.name.endswith(".eval.json"):
            continue
        target_lang = detect_target_lang_from_path(jf, base)
        if target_lang is None:
            continue
        group_key = f"{jf}::final_merged"
        result[group_key] = {"file": jf, "target_lang": target_lang}
    return result


def build_segments_for_final_merged(group_key: str, file: Path, target_lang: str):
    """n모드 파일 하나 -> (segments, error_code).
    error_code가 있으면(SOURCE_LANG_MISSING 등) API로 보내지 않고 구조 오류로 뺀다."""
    doc = load_json(file)
    if doc is None:
        return [], "PARSE_ERROR"
    if "blocks" not in doc or not doc.get("blocks"):
        return [], "NO_BLOCKS"
    if not contains_target_lang(doc, target_lang):
        return [], "SOURCE_LANG_MISSING"

    content_type = detect_content_type(doc)
    if content_type == "unknown":
        return [], "UNKNOWN_CONTENT_TYPE"

    docs = {"__combined__": doc}
    segments = build_segments_core(group_key, docs, doc, content_type, target_lang)
    return segments, None


# ─────────────────────────────────────────────────────────
# 4) 그룹 하나를 세그먼트 리스트로 변환 (위치 기반 정렬)
# ─────────────────────────────────────────────────────────

def discover_srt_groups(base_path: str) -> dict[str, dict]:
    """{prefix}.{lang}.srt 파일들을 (폴더,prefix) 기준으로 그룹핑."""
    base = Path(base_path)
    groups: dict[str, dict[str, Path]] = {}
    for sf in sorted(base.rglob("*.srt")):
        m = SRT_FILE_PATTERN.match(sf.name)
        if not m:
            continue  # .all.srt 등은 여기서 자동 제외됨
        prefix = m.group("prefix")
        lang = m.group("lang")
        group_key = f"SRT::{sf.parent}::{prefix}"
        groups.setdefault(group_key, {})[lang] = sf
    return groups


def determine_source_lang_srt(files: dict[str, Path]) -> Optional[str]:
    if "target" not in files:
        return None
    target_cues = parse_srt(files["target"])
    target_text = " ".join(t for _, t in target_cues)
    if not target_text.strip():
        return None

    best_lang, best_ratio = None, 0.0
    for lang, path in files.items():
        if lang == "target":
            continue
        cues = parse_srt(path)
        text = " ".join(t for _, t in cues)
        ratio = difflib.SequenceMatcher(None, target_text, text).ratio()
        if ratio > best_ratio:
            best_lang, best_ratio = lang, ratio
    if best_lang and best_ratio >= SIMILARITY_THRESHOLD:
        return best_lang
    return None


def build_segments_for_srt_group(group_key: str, files: dict[str, Path]) -> list[Segment]:
    """SRT 그룹 하나 -> Segment 리스트. 화자는 큐 번호 홀짝으로 결정
    (1·3·5번=A=여성, 2·4·6번=B=남성 — 문서 4장 검증된 방법론)."""
    parsed = {lang: dict(parse_srt(p)) for lang, p in files.items()}
    all_indices = sorted(set().union(*[set(d.keys()) for d in parsed.values()])) if parsed else []

    segments = []
    for idx in all_indices:
        speaker = "A" if idx % 2 == 1 else "B"
        own_g = SPEAKER_GENDER.get(speaker)
        other_g = SPEAKER_GENDER.get("B" if speaker == "A" else "A")

        texts = {}
        for lang, cues in parsed.items():
            if idx in cues:
                texts[lang] = cues[idx]

        if not (set(texts.keys()) & ALL_GENDER_LANGS):
            continue

        segments.append(Segment(
            group_key=group_key, content_type="conversation_srt",
            unit_id="1", sub_id=str(idx),
            role="conversation_line", speaker=speaker,
            own_gender=own_g, interlocutor_gender=other_g,
            texts=texts,
        ))
    return segments


def build_segments_core(group_key: str, docs: dict[str, dict], ref_doc: dict,
                         content_type: str, source_lang: Optional[str]) -> list[Segment]:
    """docs({lang_or_"__combined__": doc}) + ref_doc + content_type을 받아
    실제 Segment 리스트로 변환하는 공통 로직.

    - 분리형(y모드): docs는 {lang: 그 언어만 담긴 doc, ...}
    - 통합형/합본형(y모드의 __combined__, n모드): docs는 {"__combined__": 모든
      언어가 합쳐진 doc 하나} — 이 경우 언어별 값은 extract_lang_texts()로
      dict 내부에서 직접 풀어낸다.

    conversation뿐 아니라 grammar/idiom/voca/real도 동일하게 처리한다.
    """
    segments = []

    if content_type == "conversation":
        blocks = ref_doc.get("blocks", [])
        for bi, block in enumerate(blocks):
            set_id = block.get("set_id", str(bi))
            lines = block.get("lines", [])
            for li in range(len(lines)):
                speaker = lines[li].get("speaker") or ("A" if li % 2 == 0 else "B")
                own_g = SPEAKER_GENDER.get(speaker)
                other_g = SPEAKER_GENDER.get("B" if speaker == "A" else "A")

                texts = {}
                for lang, doc in docs.items():
                    try:
                        blk = doc["blocks"][bi]
                        ln = blk["lines"][li]
                        sent = ln.get("sentences")
                        if isinstance(sent, dict):
                            texts.update(extract_lang_texts(sent))
                        elif isinstance(sent, str):
                            texts[lang] = sent
                    except (KeyError, IndexError, TypeError):
                        continue

                if not (set(texts.keys()) & ALL_GENDER_LANGS):
                    continue

                segments.append(Segment(
                    group_key=group_key, content_type=content_type,
                    unit_id=str(set_id), sub_id=str(li),
                    role="conversation_line", speaker=speaker,
                    own_gender=own_g, interlocutor_gender=other_g,
                    texts=texts,
                ))

    else:
        # narrator형: grammar / idiom / voca / real 공통 처리
        # ref_doc 구조를 순회하며 각 하위 텍스트 위치에 대응하는 형제파일(또는
        # 합본 doc 내부 언어맵) 값을 모은다.
        blocks = ref_doc.get("blocks", [])
        for bi, block in enumerate(blocks):
            # 각 콘텐츠타입별로 텍스트가 들어있는 위치가 달라서, 후보 경로들을 순서대로 시도
            candidate_paths = []
            if content_type == "grammar":
                candidate_paths = [("sentences",)]
            elif content_type == "idiom":
                candidate_paths = [("explanation",), ("examples",)]
            elif content_type == "voca":
                candidate_paths = [("word",), ("examples",)]
            elif content_type == "real":
                candidate_paths = [("sentences",)]

            for path in candidate_paths:
                key = path[0]
                ref_val = block.get(key)
                if ref_val is None:
                    continue

                # examples 같은 리스트는 각 원소별로 세그먼트 생성
                if isinstance(ref_val, list):
                    for ei in range(len(ref_val)):
                        texts = {}
                        for lang, doc in docs.items():
                            try:
                                v = doc["blocks"][bi][key][ei]
                            except (KeyError, IndexError, TypeError):
                                continue
                            if isinstance(v, dict):
                                texts.update(extract_lang_texts(v))
                            elif isinstance(v, str):
                                texts[lang] = v
                        if set(texts.keys()) & ALL_GENDER_LANGS:
                            segments.append(Segment(
                                group_key=group_key, content_type=content_type,
                                unit_id=str(bi), sub_id=f"{key}_{ei}",
                                role="narrator", texts=texts,
                            ))
                else:
                    texts = {}
                    for lang, doc in docs.items():
                        try:
                            v = doc["blocks"][bi][key]
                        except (KeyError, IndexError, TypeError):
                            continue
                        if isinstance(v, dict):
                            # 합본형: {lang: {core,...}} 또는 {lang: "text"} 언어맵
                            if set(v.keys()) & KNOWN_LANGS:
                                texts.update(extract_lang_texts(v))
                            # 분리형: 단일언어 word 오브젝트 {"core":..., "meaning_zone":...}
                            elif isinstance(v.get("core"), str):
                                texts[lang] = v["core"]
                            else:
                                texts.update(extract_lang_texts(v))
                        elif isinstance(v, str):
                            texts[lang] = v
                    if set(texts.keys()) & ALL_GENDER_LANGS:
                        segments.append(Segment(
                            group_key=group_key, content_type=content_type,
                            unit_id=str(bi), sub_id=key,
                            role="narrator", texts=texts,
                        ))

    return segments


def build_segments_for_group(group_key: str, files: dict[str, Path]) -> list[Segment]:
    # 통합형(단일 파일, sentences 등이 이미 {lang:text} 언어맵)은
    # build_segments_core에 docs={"__combined__": doc} 하나로 위임
    if "__combined__" in files:
        doc = load_json(files["__combined__"])
        if doc is None:
            return []
        content_type = detect_content_type(doc)
        if content_type == "unknown":
            return []
        docs = {"__combined__": doc}
        return build_segments_core(group_key, docs, doc, content_type, None)

    docs = {lang: load_json(p) for lang, p in files.items()}
    docs = {lang: d for lang, d in docs.items() if d is not None}
    if not docs:
        return []

    # 콘텐츠타입 판별: target 우선, 없으면 아무 문서나
    ref_doc = docs.get("target") or next(iter(docs.values()))
    content_type = detect_content_type(ref_doc)
    if content_type == "unknown":
        return []

    source_lang = determine_source_lang(files)
    return build_segments_core(group_key, docs, ref_doc, content_type, source_lang)


# ─────────────────────────────────────────────────────────
# 4.5) 확정용 fix_candidates.txt 생성
# ─────────────────────────────────────────────────────────

def resolve_fix_locator(item: dict) -> Optional[dict]:
    """review item 하나를 실제 파일+위치 정보로 변환.
    현재 지원: conversation_srt(SRT), conversation(JSON 통합형).
    그 외(분리형 JSON, narrator형)는 아직 자동 반영 대상 아님 -> None."""
    ct = item.get("content_type")
    gk = item.get("group_key", "")

    if ct == "conversation_srt" and gk.startswith("SRT::"):
        _, parent, prefix = gk.split("::", 2)
        lang = item.get("lang")
        cue = item.get("sub_id")
        if not lang or cue is None:
            return None
        file_path = str(Path(parent) / f"{prefix}.{lang}.srt")
        return {"file": file_path, "type": "SRT", "cue": cue, "lang": lang}

    if ct == "conversation" and "::combined" in gk:
        parent, stem, _ = gk.split("::", 2)
        set_id = item.get("unit_id")
        line_idx = item.get("sub_id")
        lang = item.get("lang")
        if set_id is None or line_idx is None or not lang:
            return None
        file_path = str(Path(parent) / f"{stem}.json")
        return {"file": file_path, "type": "JSON_COMBINED",
                "set_id": set_id, "line": line_idx, "lang": lang}

    if ct != "conversation_srt" and "::final_merged" in gk:
        file_path = gk.split("::final_merged")[0]
        set_id = item.get("unit_id")
        line_idx = item.get("sub_id")
        lang = item.get("lang")
        if lang is None:
            return None
        return {"file": file_path, "type": "JSON_FINAL_MERGED",
                "set_id": set_id, "line": line_idx, "lang": lang}

    return None  # 미지원 형식


def _record_key(r: dict) -> tuple:
    """레코드를 (group_key, unit_id, sub_id, lang)로 유일하게 식별."""
    return (r.get("group_key"), r.get("unit_id"), r.get("sub_id"), r.get("lang"))


def aggregate_consensus(all_runs: list[list[dict]]) -> list[dict]:
    """N번 실행 결과를 (파일,CUE,언어) 키로 묶어서 합의 판정을 만든다.

    반환: 각 항목에 consensus(CONFIRMED_PASS/CONFIRMED_FIX/UNSTABLE),
    votes(예: 'FIX 3/3'), run별 원본 기록(runs)을 포함."""
    grouped: dict[tuple, list[dict]] = {}
    for run_records in all_runs:
        for r in run_records:
            grouped.setdefault(_record_key(r), []).append(r)

    n_runs = len(all_runs)
    aggregated = []
    for key, records in grouped.items():
        n_fix = sum(1 for r in records if r.get("status") == "FIX")
        n_pass = sum(1 for r in records if r.get("status") == "PASS")
        n_seen = len(records)  # 배치 실패 등으로 n_runs보다 적을 수 있음

        if n_fix == 0:
            consensus = "CONFIRMED_PASS"
        elif n_fix == n_seen:
            # FIX로 전부 일치 -> 제안값도 비교 (완전히 같은 제안이 다수인지)
            fixes = [r.get("suggested_fix", "").strip() for r in records]
            most_common_fix = max(set(fixes), key=fixes.count) if fixes else ""
            agree_count = fixes.count(most_common_fix)
            consensus = "CONFIRMED_FIX" if agree_count == n_seen else "UNSTABLE_FIX_TEXT"
        else:
            consensus = "UNSTABLE"

        rep = records[0]
        aggregated.append({
            "group_key": rep.get("group_key"), "content_type": rep.get("content_type"),
            "unit_id": rep.get("unit_id"), "sub_id": rep.get("sub_id"),
            "speaker": rep.get("speaker"), "lang": rep.get("lang"),
            "consensus": consensus,
            "votes": f"FIX {n_fix}/{n_seen} (전체 {n_runs}회 중 {n_seen}회 응답)",
            "runs": records,
        })
    return aggregated


def write_consensus_report_txt(aggregated: list[dict], out_path: str):
    """합의 결과를 사람이 읽기 좋은 형태로 저장."""

    def to_loc_input(a):
        return {
            "content_type": a.get("content_type"), "group_key": a.get("group_key"),
            "lang": a.get("lang"), "unit_id": a.get("unit_id"), "sub_id": a.get("sub_id"),
        }

    grouped_by_file = {}
    for a in aggregated:
        if a["consensus"] == "CONFIRMED_PASS":
            continue  # PASS 만장일치는 리포트에서 생략 (분량 절약), 필요시 아래 요약에만 카운트
        loc = resolve_fix_locator({**to_loc_input(a), "current_text_snippet": "", "suggested_fix": "x"})
        file_key = loc["file"] if loc else (a.get("group_key") or "UNKNOWN")
        grouped_by_file.setdefault(file_key, []).append((a, loc))

    n_confirmed_pass = sum(1 for a in aggregated if a["consensus"] == "CONFIRMED_PASS")
    n_confirmed_fix = sum(1 for a in aggregated if a["consensus"] == "CONFIRMED_FIX")
    n_unstable = sum(1 for a in aggregated if a["consensus"] in ("UNSTABLE", "UNSTABLE_FIX_TEXT"))

    lines = [
        "# gender_audit 합의(consensus) 리포트",
        "# ------------------------------------------------------------",
        f"# 만장일치 PASS: {n_confirmed_pass}건 (아래 목록에서는 생략됨)",
        f"# 만장일치 FIX (제안값도 일치): {n_confirmed_fix}건 -> 자동으로 fix_candidates에 포함됨",
        f"# 불안정(엇갈림): {n_unstable}건 -> 사람이 반드시 직접 판단 필요",
        "# ------------------------------------------------------------",
        "",
    ]

    for file_key in sorted(grouped_by_file.keys()):
        lines.append(f"### {file_key}")
        entries = grouped_by_file[file_key]
        try:
            entries.sort(key=lambda pair: int(pair[0].get("sub_id")))
        except (TypeError, ValueError):
            pass
        for a, loc in entries:
            loc_desc = ""
            if loc:
                loc_desc = f"CUE {loc['cue']}" if loc["type"] == "SRT" else f"SET_ID {loc['set_id']} LINE {loc['line']}"
            mark = {"CONFIRMED_FIX": "✅ 확정 FIX", "UNSTABLE": "⚠️ 불안정",
                    "UNSTABLE_FIX_TEXT": "⚠️ FIX합의는됐으나 제안값 불일치"}[a["consensus"]]
            lines.append(f"[{mark}] {loc_desc} lang={a['lang']} speaker={a['speaker']} — {a['votes']}")
            for i, r in enumerate(a["runs"], 1):
                lines.append(f"    run{i}: [{r.get('status')}] 현재={r.get('current_text_snippet','')!r} "
                             f"제안={r.get('suggested_fix','')!r}")
                lines.append(f"           이유: {r.get('reason','')}")
            lines.append("")
        lines.append("")

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def build_fix_candidates_from_consensus(aggregated: list[dict]) -> list[dict]:
    """CONFIRMED_FIX(만장일치+제안값 일치)만 review_items 포맷으로 변환해서
    기존 write_fix_candidates_txt()에 그대로 넣을 수 있게 만든다."""
    items = []
    for a in aggregated:
        if a["consensus"] != "CONFIRMED_FIX":
            continue
        rep = a["runs"][0]
        items.append({
            "group_key": a["group_key"], "content_type": a["content_type"],
            "unit_id": a["unit_id"], "sub_id": a["sub_id"], "speaker": a["speaker"],
            "lang": a["lang"], "check_type": "전체판정(합의)",
            "current_text_snippet": rep.get("current_text_snippet", ""),
            "suggested_fix": rep.get("suggested_fix", ""),
            "issue_description": f"{len(a['runs'])}회 반복 실행 모두 동일하게 FIX 판정: " + rep.get("reason", ""),
            "confidence": "high",
        })
    return items


def write_full_report_txt(records: list[dict], out_path: str):
    """PASS/FIX 전부를 사람이 훑어보기 좋은 형태로 저장.
    파일별로 묶어서 CUE/LINE 순서대로 정렬."""
    # resolve_fix_locator 재사용을 위해 current_text_snippet/suggested_fix 키로 맞춤
    def to_loc_input(r):
        return {
            "content_type": r.get("content_type"),
            "group_key": r.get("group_key"),
            "lang": r.get("lang"),
            "unit_id": r.get("unit_id"),
            "sub_id": r.get("sub_id"),
        }

    grouped = {}
    for r in records:
        loc = resolve_fix_locator({**to_loc_input(r), "current_text_snippet": "", "suggested_fix": "x"})
        file_key = loc["file"] if loc else (r.get("group_key") or "UNKNOWN")
        grouped.setdefault(file_key, []).append((r, loc))

    def sort_key(pair):
        r, loc = pair
        try:
            return int(r.get("sub_id"))
        except (TypeError, ValueError):
            return 0

    lines = [
        "# gender_audit 전체판정 리포트 (PASS/FIX 전부 포함)",
        "# ------------------------------------------------------------",
        "# 이 파일을 대화창에 붙여넣어 하나씩 같이 검토하세요.",
        "# FIX인 항목 중 진짜 반영할 것만 골라서 gender_fix.py용 txt를 새로 만듭니다.",
        "# ------------------------------------------------------------",
        "",
    ]

    for file_key in sorted(grouped.keys()):
        lines.append(f"### {file_key}")
        entries = sorted(grouped[file_key], key=sort_key)
        for r, loc in entries:
            status = r.get("status", "?")
            mark = "✅ PASS" if status == "PASS" else "❌ FIX "
            loc_desc = ""
            if loc:
                if loc["type"] == "SRT":
                    loc_desc = f"CUE {loc['cue']}"
                else:
                    loc_desc = f"SET_ID {loc['set_id']} LINE {loc['line']}"
            lines.append(f"[{mark}] {loc_desc} lang={r.get('lang')} speaker={r.get('speaker')}")
            lines.append(f"    현재: {r.get('current_text_snippet', '')}")
            lines.append(f"    이유: {r.get('reason', '')}")
            if status == "FIX":
                lines.append(f"    제안: {r.get('suggested_fix', '')}")
            lines.append("")
        lines.append("")

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def write_fix_candidates_txt(review_items: list[dict], out_path: str):
    """사람이 검토/확정할 수 있는 txt 파일 생성.
    confidence=low는 자동 제외. 지원 안 되는 형식/의심스러운 항목은
    파일 맨 아래 별도 표기 (자동 반영 대상에서 제외)."""
    supported_blocks = []
    unsupported_items = []

    # NEW 값에 다른 언어 라벨이 섞여 있으면 오염된 것으로 간주.
    # "fr: '...'" 형태뿐 아니라 "fr은 '...'" 같은 한국어 조사 결합 형태도 탐지.
    OTHER_LANG_LABEL_RE = re.compile(
        r"\b(es|fr|pt|ru|it|de|en|kr|zh|jp)\s*(?:[:：]|은|는|이|가)\s*['\"“‘]"
    )
    # 보조 휴리스틱: 인용부호로 감싼 구절이 2개 이상이면 여러 언어 제안이
    # 한 필드에 뭉쳐 들어갔을 가능성이 높음
    MULTI_QUOTE_RE = re.compile(r"['\"“‘][^'\"“”‘’]{1,80}['\"”’]")

    for item in review_items:
        if item.get("confidence") == "low":
            continue

        old_val = (item.get("current_text_snippet") or "").strip()
        new_val = (item.get("suggested_fix") or "").strip()

        # 안전장치 1a: NEW가 비어있으면 실제 수정 제안이 없는 것 (예: "문제없음"
        # 판정인데 suggested_fix를 안 채운 경우) -> 절대 반영 대상 아님
        if not new_val:
            item = {**item, "issue_description":
                     "[자동감지: NEW 값이 비어있어 자동반영 제외] " + item.get("issue_description", "")}
            unsupported_items.append(item)
            continue

        # 안전장치 1b: OLD와 NEW가 동일하면 실제로는 "문제없음"인데 잘못 등록된 것
        if old_val and old_val == new_val:
            item = {**item, "issue_description":
                     "[자동감지: OLD=NEW라 실제 수정사항 없음] " + item.get("issue_description", "")}
            unsupported_items.append(item)
            continue

        # 안전장치 2: NEW 값에 다른 언어 라벨이 섞여 있거나(예: "fr은 '...'",
        # "pt: '...'") 인용 구절이 2개 이상 뭉쳐있으면 여러 언어 제안이 한
        # 필드에 섞인 것으로 간주하고 자동 반영에서 제외
        if OTHER_LANG_LABEL_RE.search(new_val) or len(MULTI_QUOTE_RE.findall(new_val)) >= 2:
            item = {**item, "issue_description":
                     "[자동감지: NEW 값에 다른 언어/복수 제안이 섞여있어 자동반영 제외] "
                     + item.get("issue_description", "")}
            unsupported_items.append(item)
            continue

        loc = resolve_fix_locator(item)
        if loc is None:
            unsupported_items.append(item)
            continue
        block_lines = [f"FILE: {loc['file']}", f"TYPE: {loc['type']}"]
        if loc["type"] == "SRT":
            block_lines.append(f"CUE: {loc['cue']}")
        else:
            block_lines.append(f"SET_ID: {loc['set_id']}")
            block_lines.append(f"LINE: {loc['line']}")
        block_lines.append(f"LANG: {loc['lang']}")
        block_lines.append(f"OLD: {item.get('current_text_snippet', '')}")
        block_lines.append(f"NEW: {item.get('suggested_fix', '')}")
        block_lines.append(f"REASON: {item.get('issue_description', '')}")
        block_lines.append(f"CONFIDENCE: {item.get('confidence', '')}")
        supported_blocks.append("\n".join(block_lines))

    header = (
        "# gender_audit 수정 후보 목록\n"
        "# ------------------------------------------------------------\n"
        "# 아래 각 블록의 NEW: 값을 검토하고, 필요하면 직접 고치세요.\n"
        "# 반영하고 싶지 않은 블록은 통째로 삭제하세요.\n"
        "# 검토가 끝나면 이 파일을 그대로 아래 명령어에 넣어 실행하세요:\n"
        "#   python3 gender_fix.py --input <이 파일 경로>\n"
        "# (기본은 dry-run입니다. 실제로 파일에 반영하려면 --apply를 추가하세요)\n"
        "# confidence=low 항목은 이미 자동 제외되었습니다.\n"
        "# ------------------------------------------------------------\n\n"
    )

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(header)
        f.write("\n===\n".join(supported_blocks))
        if supported_blocks:
            f.write("\n===\n")
        if unsupported_items:
            f.write("\n\n# ------------------------------------------------------------\n")
            f.write("# 아래는 자동 반영이 아직 지원되지 않는 형식입니다 (수동 확인 필요):\n")
            f.write("# ------------------------------------------------------------\n")
            for item in unsupported_items:
                f.write(f"# [{item.get('content_type')}] group={item.get('group_key')} "
                        f"unit={item.get('unit_id')} sub={item.get('sub_id')} "
                        f"lang={item.get('lang')}\n")
                f.write(f"#   OLD: {item.get('current_text_snippet', '')}\n")
                f.write(f"#   NEW: {item.get('suggested_fix', '')}\n")
                f.write(f"#   REASON: {item.get('issue_description', '')}\n\n")

    return len(supported_blocks), len(unsupported_items)


# ─────────────────────────────────────────────────────────
# 5) 메인
# ─────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description="ManyLangs 성별 검수기 (v4, y/n 단계분기 + 구조 자동판별)")
    ap.add_argument("--path", default=None, help="대상 최상위 절대경로 (생략하면 대화형으로 입력받음)")
    ap.add_argument("--mode", choices=["y", "n"], default=None,
                     help="y=아직 분리되어있는 파일(target.json/en.json/... 또는 SRT) 방식 / "
                          "n=최종 합본 JSON(파일 하나에 모든 언어가 이미 합쳐진) 방식. "
                          "생략하면 '전체 JSON 합성 전입니까? [y/n]'으로 대화형 입력받음")
    ap.add_argument("--out", default=None, help="리뷰 JSON 저장 경로")
    ap.add_argument("--batch-size", type=int, default=25)
    ap.add_argument("--dry-run", action="store_true", help="API 호출 없이 탐색/파싱만 확인")
    ap.add_argument("--full-report", action="store_true",
                     help="이슈만 골라내지 않고 전체 세그먼트를 PASS/FIX+이유로 전부 출력 "
                          "(대화창에서 사람이 직접 검토하기 위한 모드)")
    ap.add_argument("--repeat", type=int, default=1,
                     help="--full-report를 N번 반복 실행해서 다수결로 합의된 것만 "
                          "최종 후보로 채택 (재현성 검증용, 기본 1회)")
    args = ap.parse_args()

    base_path = args.path
    if not base_path:
        base_path = input("검사할 폴더의 절대경로를 입력하세요: ").strip()

    # 경로가 실제로 존재하는 디렉토리인지 먼저 검증한다. 예를 들어 절대경로
    # 대신 상대경로(폴더명만)를 입력하면 현재 작업 디렉토리 기준으로 해석되어
    # "존재하지 않는 폴더"를 조용히 스캔하고 0개를 반환하는 문제가 있었다
    # (discover 단계에서 그냥 0건으로만 보여서 원인 파악이 어려웠음).
    while not Path(base_path).is_dir():
        print(f"[오류] 경로가 존재하는 폴더가 아닙니다: {base_path}")
        print(f"       (상대경로를 입력했다면 현재 작업 디렉토리 기준으로 해석됩니다. "
              f"현재 작업 디렉토리: {Path.cwd()})")
        print("       절대경로(/로 시작)를 입력했는지 다시 확인하세요.")
        if args.path:
            # --path로 비대화형 지정한 경우는 재입력 없이 바로 종료
            sys.exit(1)
        base_path = input("검사할 폴더의 절대경로를 다시 입력하세요: ").strip()

    mode = args.mode
    if not mode:
        mode = input("전체 JSON 합성 전입니까? [y/n]: ").strip().lower()
    while mode not in ("y", "n"):
        mode = input("y 또는 n 으로 입력해주세요 [y/n]: ").strip().lower()

    all_segments: list[Segment] = []
    groups: dict = {}
    srt_groups: dict = {}

    if mode == "y":
        # ── 기존 방식: target.json / en.json / ... 분리형, SRT 등 ──
        groups = discover_and_group(base_path)
        srt_groups = discover_srt_groups(base_path)

        # SRT가 최종 검수본이므로, 같은 (폴더, prefix)에 SRT가 있으면 JSON은 건너뛴다
        srt_topics = set()
        for gk in srt_groups:
            # gk == "SRT::{parent}::{prefix}"
            _, parent, prefix = gk.split("::", 2)
            srt_topics.add((parent, prefix))

        skipped = []
        filtered_groups = {}
        for gk, files in groups.items():
            parts = gk.split("::")
            parent, prefix = parts[0], parts[1]
            if (parent, prefix) in srt_topics:
                skipped.append(gk)
                continue
            filtered_groups[gk] = files
        groups = filtered_groups

        if skipped:
            print(f"[skip] SRT 최종본이 있어 JSON {len(skipped)}개 그룹은 건너뜁니다 "
                  f"(중복 검사 방지)")
        print(f"[discover] JSON 그룹 {len(groups)}개 / SRT 그룹 {len(srt_groups)}개 발견")

        for group_key, files in groups.items():
            langs_found = sorted(files.keys())
            source_lang = determine_source_lang(files)
            segs = build_segments_for_group(group_key, files)
            if segs:
                ct = segs[0].content_type
                print(f"  - [JSON] {group_key}  langs={langs_found}  source_lang={source_lang}  "
                      f"type={ct}  segments={len(segs)}")
            all_segments.extend(segs)

        for group_key, files in srt_groups.items():
            langs_found = sorted(files.keys())
            source_lang = determine_source_lang_srt(files)
            segs = build_segments_for_srt_group(group_key, files)
            if segs:
                print(f"  - [SRT]  {group_key}  langs={langs_found}  source_lang={source_lang}  "
                      f"segments={len(segs)}")
            all_segments.extend(segs)

    else:
        # ── n모드: 최종 합본 JSON. 상위 언어 폴더에서 target 확정 +
        #    합본 JSON 내부 언어들을 동일 세그먼트로 비교.
        #    conversation/grammar/idiom/voca/real 전부 동일하게 처리 ──
        groups = discover_final_merged_files(base_path)
        print(f"[discover] 최종 합본 모드: JSON 파일 {len(groups)}개 발견 "
              f"(경로의 언어 폴더에서 target 자동판별)")

        structure_errors: list[tuple[str, str]] = []
        for group_key, info in groups.items():
            segs, err = build_segments_for_final_merged(group_key, info["file"], info["target_lang"])
            if err:
                structure_errors.append((str(info["file"]), err))
                continue
            if segs:
                ct = segs[0].content_type
                print(f"  - [MERGED] {info['file']}  target={info['target_lang']}  "
                      f"type={ct}  segments={len(segs)}")
            all_segments.extend(segs)

        if structure_errors:
            print(f"\n[구조오류] {len(structure_errors)}개 파일이 API 전송 없이 제외되었습니다 "
                  f"(경로의 target 언어가 실제 JSON 내부에 없거나, blocks/콘텐츠타입을 못 찾음):")
            for fpath, err in structure_errors:
                print(f"  - [{err}] {fpath}")

    print(f"\n[parse] 총 {len(all_segments)}개 세그먼트 파싱됨\n")

    if args.dry_run:
        n_with_gender = sum(1 for s in all_segments if set(s.texts.keys()) & ALL_GENDER_LANGS)
        print(f"[dry-run] 성별표시 언어 컬럼이 있는 세그먼트: {n_with_gender} / {len(all_segments)}")
        return

    if args.full_report and args.repeat > 1:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        all_runs = []
        for run_i in range(1, args.repeat + 1):
            print(f"\n{'#'*60}")
            print(f"# 반복 실행 {run_i}/{args.repeat}")
            print(f"{'#'*60}")
            records = audit_segments_full_report(all_segments, ALL_GENDER_LANGS,
                                                  batch_size=max(15, min(args.batch_size, 15)))
            run_txt = f"full_report_{timestamp}_run{run_i}.txt"
            write_full_report_txt(records, run_txt)
            print(f"[saved] run{run_i} 원본 리포트: {run_txt}")
            all_runs.append(records)

        aggregated = aggregate_consensus(all_runs)
        consensus_txt = f"full_report_{timestamp}_consensus.txt"
        write_consensus_report_txt(aggregated, consensus_txt)

        n_confirmed_pass = sum(1 for a in aggregated if a["consensus"] == "CONFIRMED_PASS")
        n_confirmed_fix = sum(1 for a in aggregated if a["consensus"] == "CONFIRMED_FIX")
        n_unstable = sum(1 for a in aggregated if a["consensus"] in ("UNSTABLE", "UNSTABLE_FIX_TEXT"))

        print(f"\n{'='*60}")
        print(f"[합의 완료] {args.repeat}회 반복, 총 {len(aggregated)}개 항목")
        print(f"    - 만장일치 PASS: {n_confirmed_pass}건")
        print(f"    - 만장일치 FIX(제안값 일치): {n_confirmed_fix}건 -> 자동 반영 후보")
        print(f"    - 불안정(엇갈림): {n_unstable}건 -> 사람 확인 필요")
        print(f"[saved] 합의 리포트: {consensus_txt}")

        fix_items = build_fix_candidates_from_consensus(aggregated)
        fix_txt = f"full_report_{timestamp}_fix_candidates.txt"
        n_sup, n_unsup = write_fix_candidates_txt(fix_items, fix_txt)
        print(f"[saved] 최종 반영 후보: {fix_txt} (반영가능 {n_sup}건, 추가확인필요 {n_unsup}건)")
        print(f"[다음 단계] {consensus_txt}에서 '불안정' 항목을 직접 검토하고,")
        print(f"           {fix_txt}는 gender_fix.py로 바로 반영해도 안전합니다.")
        print(f"{'='*60}")
        return

    if args.full_report:
        records = audit_segments_full_report(all_segments, ALL_GENDER_LANGS,
                                              batch_size=max(15, min(args.batch_size, 15)))
        out_txt = args.out or f"full_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        if not out_txt.endswith(".txt"):
            out_txt += ".txt"
        write_full_report_txt(records, out_txt)
        n_pass = sum(1 for r in records if r.get("status") == "PASS")
        n_fix = sum(1 for r in records if r.get("status") == "FIX")
        print(f"\n{'='*60}")
        print(f"[전체판정 완료] 총 {len(records)}건 판정 (PASS {n_pass} / FIX {n_fix})")
        print(f"[saved] 전체 리포트: {out_txt}")
        print(f"[다음 단계] 이 파일 내용을 대화창에 붙여넣어 같이 검토한 뒤,")
        print(f"           확정된 항목만 gender_fix.py용 txt로 만들어 반영하세요.")
        print(f"{'='*60}")
        return

    review_items = audit_segments_via_llm(all_segments, ALL_GENDER_LANGS, batch_size=args.batch_size)

    print(f"\n{'='*60}")
    print(f"[최종 결과] 총 {len(groups) + len(srt_groups)}개 그룹 "
          f"(JSON {len(groups)} + SRT {len(srt_groups)}) / {len(all_segments)}개 세그먼트 검사 완료")
    print(f"[최종 결과] 이슈 {len(review_items)}건 발견")
    if review_items:
        by_type = {}
        for item in review_items:
            ct = item.get("check_type", "?")
            by_type[ct] = by_type.get(ct, 0) + 1
        print("[최종 결과] 유형별 집계:")
        for ct, cnt in sorted(by_type.items(), key=lambda x: -x[1]):
            print(f"    - {ct}: {cnt}건")
    print(f"{'='*60}")

    out_path = args.out or f"review_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(review_items, f, ensure_ascii=False, indent=2)
    print(f"[saved] 리뷰 파일: {out_path}")

    txt_path = out_path.replace(".json", "") + ".fix_candidates.txt"
    n_supported, n_unsupported = write_fix_candidates_txt(review_items, txt_path)
    print(f"[saved] 수정 확정용 파일: {txt_path} "
          f"(반영가능 {n_supported}건, 수동확인필요 {n_unsupported}건)")
    if n_supported:
        print(f"[다음 단계] {txt_path} 내용을 검토/수정한 뒤:")
        print(f"    python3 gender_fix.py --input \"{txt_path}\"          # dry-run (미리보기)")
        print(f"    python3 gender_fix.py --input \"{txt_path}\" --apply  # 실제 반영")


if __name__ == "__main__":
    main()
