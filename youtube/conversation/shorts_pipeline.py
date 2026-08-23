#!/usr/bin/env python3
"""
shorts_pipeline.py

ManyLangs 유튜브 쇼츠용 회화 1세트(6줄) 생성 파이프라인.
deepseek_generate.py(voca 파이프라인)의 핵심 함수(call_deepseek,
extract_first_json_object, FLAG 스캔, ThreadPoolExecutor 병렬 번역 구조)를
그대로 재사용하고, 회화(conversation) 스키마 + 평가/재검수 채점 루프 +
TTS/SRT 단계를 새로 추가한 버전이다.

전체 흐름 (확정된 설계):
  1) 터미널: 언어 약어(2자리) 입력 -> 60개 챕터 전체를 실제 폴더명
     (level_slug, 예: a1_ordering_at_a_cafe) 형태로 번호 매겨 한 번에 보여줌
     -> 번호 입력으로 선택 (레벨을 따로 묻지 않음, 이미 만들어진 폴더를 같은
     번호로 다시 고르면 그 폴더가 그대로 덮어써짐 -- 재작업/새작업 구분 없이
     "그 폴더 작업"으로 통일)
  2) target 6줄 생성 (01/09_TARGET_GENERATOR.md, 세트 1개로 축소 호출)
  3) 경량 자체확인 통과 -> target 6줄을 텍스트 파일로 저장하고 "녹음할까요?"
     대기 (사람이 파일을 열어 수정/저장할 수 있는 마지막 검수 지점, 확정사항)
  4) target 텍스트 -> TTS 오디오 생성 (target 언어 1개만)
  5) 오디오 실제 타이밍 추출 -> target SRT 생성 (6줄, cue)
  6) target SRT 각 줄을 앵커로 02~08_TRANSLATOR.md 호출 -> 7개 언어 텍스트
     (target 자신의 언어는 미러링 -> LANG_TRANSLATOR가 자체적으로 mirror 분기 처리)
  7) 채점(평가프롬프트) -> PASS 아니면 재검수프롬프트로 "문장 단위"만 패치
     (target 자체 문제면 3)으로 복귀), 재시도 상한 RETRY_LIMIT 회
  8) 초과분은 needs_review/ 로 격리하고 나머지 언어는 그대로 진행
  9) PASS한 언어 텍스트를 target SRT의 동일 타임스탬프에 텍스트만 교체 -> SRT x7
  10) 산출물 저장: conversation/{target_lang}/{level}_{topic}/ 하위

주의: TTS 실제 호출(4단계)과 오디오 타이밍 추출(5단계)은 실제 tts/common/config.py
(VOICE_AB, LANGUAGE_CODE)를 그대로 import해서 쓴다 -- 언어별 실제 엔진은 다를 수
있음(예: en=Chirp3 HD, kr=Neural2, 청취 테스트로 확정된 값). 이 스크립트는 어떤
엔진을 쓰는지 하드코딩하지 않고 항상 config.py의 값을 그대로 따른다.

언어 약어(target_lang) 자체는 이 스크립트가 검증하지 않는다 -- 이 파일은
공용 파일이라 어떤 약어를 넘길지는 실행하는 사람이 판단해서 입력한다.
target 쪽 프롬프트(생성/평가/재검수)는 딕셔너리에 등록하는 게 아니라
prompts_dir에서 파일명 패턴으로 찾는다 (find_prompt_file 참고) -- 그래서
새 target 언어를 추가할 때 이 스크립트를 고칠 필요가 없고, 파일명 규칙에
맞는 프롬프트 3개(생성/평가/재검수)만 넣으면 된다. 패턴에 맞는 파일이
없으면 "이 언어는 아직 준비 안 됐다"는 신호로 FileNotFoundError가 난다.

번역 대상 7개 언어(ALL_LANGS: en/es/fr/pt/kr/zh/jp)는 이것과 다르다 -- 모든
교재가 공유하는 고정 스키마라서 딕셔너리(TRANSLATOR_PROMPT_FILENAME)로
관리하며, 이 7개는 늘리지 않는다(target 언어를 늘리는 것과 별개 문제).
"""

import argparse
import ast
import fnmatch
import io
import json
import os
import re
import sys
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

RETRY_LIMIT = 3  # 문장 단위 재검수 재시도 상한 (비용이 아니라 안전장치)
PASS_SCORE_THRESHOLD = 80  # 평가프롬프트 PASS 기준, 필요 시 90으로 상향 가능

# ---------------------------------------------------------------------------
# TTS 설정 (01_설계도_ManyLangs_TTS_시스템_v4.md 6장 Conversation 표준 그대로 이식)
#
# 설계도 13장 "유지보수 원칙": 언어/Voice 정책은 config.py가 단일 소스다.
# 여기서 VOICE_AB/LANGUAGE_CODE를 다시 하드코딩하면, 실제 config.py가 바뀔 때마다
# (예: kr을 Chirp3 HD -> Neural2로 교체한 것처럼) 이 스크립트만 옛날 값을 쓰게 되는
# 사고가 생긴다. 그래서 실제 config.py를 直접 import한다.
# ---------------------------------------------------------------------------

DEFAULT_TTS_CREDENTIALS = (
    "/Users/junghasuk/Desktop/ManyLangs/web/tts/tts-generator.json"
)
DEFAULT_TTS_COMMON_DIR = "/Users/junghasuk/Desktop/ManyLangs/web/tts/common"


def _load_tts_config(tts_common_dir):
    """tts/common/config.py를 그 경로에서 직접 import한다 (LANGUAGE_CODE, VOICE_AB,
    VOICE_SINGLE 등을 여기서 재정의하지 않고 항상 실제 소스를 그대로 읽는다)."""
    import importlib.util

    config_path = Path(tts_common_dir) / "config.py"
    if not config_path.exists():
        raise FileNotFoundError(
            f"tts/common/config.py를 찾지 못함: {config_path} -- "
            f"--tts-common-dir 로 실제 경로를 지정할 것"
        )
    spec = importlib.util.spec_from_file_location("manylangs_tts_config", config_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


SENTENCE_GAP_MS = 350   # 문장 간 (설계도 6장 Conversation)
SET_END_GAP_MS = 650    # 세트 끝 (쇼츠는 세트 1개뿐이라 이 세트의 맨 끝에만 적용, "세트 간" 900ms은 해당 없음)
TTS_SAMPLE_RATE_HZ = 24000

TRANSLATOR_PROMPT_FILENAME = {
    "en": "02_EN_TRANSLATOR.md",
    "es": "03_ES_TRANSLATOR.md",
    "fr": "04_FR_TRANSLATOR.md",
    "pt": "05_PT_TRANSLATOR.md",
    "kr": "06_KR_TRANSLATOR.md",
    "zh": "07_ZH_TRANSLATOR.md",
    "jp": "08_JP_TRANSLATOR.md",
}
ALL_LANGS = list(TRANSLATOR_PROMPT_FILENAME.keys())  # en/es/fr/pt/kr/zh/jp -- 고정 7개, 확장하지 않는다.

# ---------------------------------------------------------------------------
# target 쪽 프롬프트(생성/평가/재검수)는 딕셔너리로 등록하지 않는다.
#
# ALL_LANGS(번역 대상 7개 언어)는 모든 교재가 공유하는 고정 스키마라서 딕셔너리로
# 관리하지만, target으로 쓸 언어는 몇 개든 늘어날 수 있다(en/kr/pt 다음 de, it,
# ru... 20개까지). 새 target 언어를 추가할 때마다 이 스크립트를 고쳐야 한다면
# 그 자체가 병목이므로, 대신 아래 파일명 규칙만 지키면 코드 수정 없이 자동으로
# 인식되도록 glob 패턴 검색으로 찾는다:
#
#   {아무 접두 번호}_{LANG}_TARGET_GENERATOR.md      예: 10_PT_TARGET_GENERATOR.md
#   conversation_{lang}_평가프롬프트{아무 버전 표기}    예: conversation_pt_평가프롬프트_v1.1.md
#   conversation_{lang}_재검수프롬프트{아무 버전 표기}   예: conversation_pt_재검수프롬프트_v1.0.md
#
# 새 target 언어를 추가하려면 이 3개 파일만 prompts_dir에 넣으면 끝이다.
# ---------------------------------------------------------------------------

def find_prompt_file(prompts_dir, pattern):
    """
    prompts_dir에서 pattern에 맞는 파일을 정확히 1개 찾아 내용을 읽는다.

    0개면 "아직 이 언어는 준비 안 됐다"는 신호로 FileNotFoundError.
    2개 이상이면(예: 옛 버전을 안 지우고 새 버전을 추가한 경우) 어느 걸
    써야 할지 스크립트가 임의로 판단하지 않고 사람이 정리하도록 ValueError.

    macOS 파일시스템(HFS+/APFS)은 한글이 섞인 파일명을 NFD(자모 분리)로
    저장하는 경우가 흔한데, 이 코드의 pattern 문자열은 일반적인 NFC로
    타이핑돼 있다. Path.glob()은 바이트 단위로 비교하므로 NFC 패턴이
    NFD 파일명과 안 맞아 파일을 못 찾는 사고가 난다. 그래서 fnmatch를
    NFC로 정규화한 뒤 비교해서 이 정규화 차이를 무시하도록 한다.
    """
    normalized_pattern = unicodedata.normalize("NFC", pattern)

    matches = []
    for entry in sorted(Path(prompts_dir).iterdir()):
        if not entry.is_file():
            continue
        normalized_name = unicodedata.normalize("NFC", entry.name)
        if fnmatch.fnmatch(normalized_name, normalized_pattern):
            matches.append(entry)

    if not matches:
        raise FileNotFoundError(
            f"'{pattern}' 패턴에 맞는 프롬프트 파일을 찾지 못함 (경로: {prompts_dir}). "
            f"이 언어의 프롬프트가 아직 준비되지 않았거나 파일명 규칙이 어긋난 것이다."
        )

    if len(matches) > 1:
        names = ", ".join(p.name for p in matches)
        raise ValueError(
            f"'{pattern}' 패턴에 맞는 프롬프트 파일이 {len(matches)}개 발견됨: {names}. "
            f"버전이 여러 개 섞여 있으면 스크립트가 임의로 고르지 않는다 -- "
            f"오래된 버전을 정리하고 정확히 1개만 남길 것."
        )

    return matches[0].read_text(encoding="utf-8")


def load_target_generator_prompt(prompts_dir, target_lang):
    return find_prompt_file(
        prompts_dir,
        f"*_{target_lang.upper()}_TARGET_GENERATOR.md"
    )


def load_eval_prompt_text(prompts_dir, target_lang):
    return find_prompt_file(
        prompts_dir,
        f"conversation_{target_lang}_평가프롬프트*"
    )


def load_reviewer_prompt_text(prompts_dir, target_lang):
    return find_prompt_file(
        prompts_dir,
        f"conversation_{target_lang}_재검수프롬프트*"
    )


# ---------------------------------------------------------------------------
# DeepSeek 호출 (deepseek_generate.py 그대로 재사용)
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
    return resp.json()["choices"][0]["message"]["content"]


def extract_first_json_object(text):
    """첫 번째로 닫히는 균형잡힌 {...} 를 찾아 파싱한다 (deepseek_generate.py 동일 로직)."""
    start = text.find("{")
    if start == -1:
        raise ValueError("no '{' found in response")
    depth, in_string, escape = 0, False, False
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


def extract_python_dict_literal(text):
    """재검수프롬프트 출력(Python dict 리터럴, 튜플 키 포함)을 파싱한다.
    형태: "{batch_id}": {"TITLE_REPLACEMENTS": {...}, "REPLACEMENTS": {...}},
    안전하게 ast.literal_eval로만 평가한다 (eval 금지)."""
    # 딕셔너리 리터럴 전체를 감싸는 중괄호 쌍을 찾는다: "001": { ... },
    m = re.search(r'"(\d{3})"\s*:\s*(\{.*\})\s*,?\s*$', text.strip(), re.DOTALL)
    if not m:
        raise ValueError("재검수 출력에서 batch_id: {...} 패턴을 찾지 못함")
    batch_id, dict_text = m.group(1), m.group(2)
    parsed = ast.literal_eval(dict_text)
    return batch_id, parsed


def load_prompt(prompts_dir, filename):
    path = Path(prompts_dir) / filename
    if not path.exists():
        raise FileNotFoundError(f"prompt file not found: {path}")
    return path.read_text(encoding="utf-8")


# ---------------------------------------------------------------------------
# 60챕터 표 파싱 (01/09_TARGET_GENERATOR.md 4장 마크다운 표에서 직접 추출)
# ---------------------------------------------------------------------------

CHAPTER_ROW_RE = re.compile(
    r"\|\s*(\d{3})\s*\|\s*([A-Z0-9_]+)\s*\|\s*([A-Z0-9]+)\s*\|\s*(.+?)\s*\|"
)


def parse_chapter_table(manual_text):
    """4장 표에서 (idx, chapter_id, level, title) 리스트를 뽑는다.
    01/09_TARGET_GENERATOR.md 양쪽 다 동일 표 형식이라 파서 공용."""
    chapters = []
    for line in manual_text.splitlines():
        m = CHAPTER_ROW_RE.match(line.strip())
        if not m:
            continue
        idx, chapter_id, level, title = m.groups()
        if idx == "IDX":  # 헤더 행 스킵
            continue
        chapters.append({"idx": idx, "chapter_id": chapter_id, "level": level, "title": title})
    if len(chapters) != 60:
        raise ValueError(f"챕터 60개가 아니라 {len(chapters)}개 파싱됨 -- 표 형식 변경 여부 확인 필요")
    return chapters


# ---------------------------------------------------------------------------
# 1) 터미널 인터랙티브 선택
#    (레벨을 따로 묻지 않는다: 언어 약어만 물어보고, 60개 챕터 전체를 실제
#    폴더명(level_slug) 형태로 번호 매겨 한 번에 보여준 뒤 번호만 입력받는다.
#    번호가 이미 생성된 폴더를 가리키면 그 폴더는 그대로 덮어써진다 -- 새
#    작업이든 재작업이든 "그 폴더 작업"으로 동일하게 처리하기로 확정.)
# ---------------------------------------------------------------------------

def prompt_target_lang():
    """
    언어 약어(2자리)를 입력받는다.

    이 스크립트는 공용 파일이라 특정 언어 목록으로 값을 검증하지 않는다.
    입력한 약어에 대응하는 TARGET_GENERATOR_FILENAME 항목이 없으면
    (아직 그 언어의 타겟 생성 매뉴얼이 없으면) load_prompt() 단계에서
    FileNotFoundError로 자연스럽게 멈춘다.
    """
    target_lang = input("언어 약어 (2자리): ").strip().lower()

    if not target_lang:
        print("[오류] 언어 약어를 입력하지 않았습니다.")
        sys.exit(1)

    return target_lang


def prompt_chapter_selection(chapters, target_lang):
    """60개 챕터 전체를 compute_filename_base()로 만든 실제 폴더명(level_slug)
    그대로 번호 매겨 보여주고, 번호 하나만 입력받아 챕터를 고른다."""
    print("\n챕터 후보 (전체 60개):")
    for i, c in enumerate(chapters, start=1):
        folder_name = compute_filename_base(c, target_lang)
        print(f"  {i:>2} - {folder_name}")

    choice = input("번호 선택: ").strip()
    if not choice.isdigit() or not (1 <= int(choice) <= len(chapters)):
        print(f"[오류] 잘못된 번호: {choice}")
        sys.exit(1)
    return chapters[int(choice) - 1]


# ---------------------------------------------------------------------------
# 2) target 1세트(6줄) 생성
# ---------------------------------------------------------------------------

def build_target_user_input_single_set(chapter):
    """01/09_TARGET_GENERATOR.md는 원래 세트 10개(BATCH 전체)를 만드는
    매뉴얼이지만, 쇼츠는 세트 1개만 필요하다. 프롬프트 본문은 그대로 두고,
    유저 메시지에서 '세트 1개만 생성'을 명시적으로 오버라이드한다 -- 매뉴얼
    자체를 고치지 않는 이유는 정규 60챕터 파이프라인과 공유해야 하기 때문."""
    return (
        f"BATCH_ID: {chapter['idx']}\n\n"
        f"[쇼츠 오버라이드] 이번 호출은 유튜브 쇼츠용이다. 4장 표에서 "
        f"IDX {chapter['idx']}({chapter['chapter_id']}, {chapter['title']})는 "
        f"이미 확정되어 있으니 챕터 추출 단계는 건너뛴다. "
        f"평소처럼 10세트가 아니라 세트 1개(6줄, A-B-A-B-A-B)만 생성한다. "
        f"6~11장(화자 시스템, 세트 구조, 상호작용/질문-응답/자연화/TTS 규칙)은 "
        f"세트 1개에도 동일하게 그대로 적용한다. 세트 다양성 규칙(10세트 간 "
        f"시작방식·상황 분산)은 세트가 1개뿐이므로 해당 없음. "
        f"12장 스키마를 따르되 sets에는 \"001\" 키 하나만 채운다."
    )


def generate_target(chapter, target_lang, prompts_dir, model, api_key):
    manual_text = load_target_generator_prompt(prompts_dir, target_lang)
    user_input = build_target_user_input_single_set(chapter)

    print(f"\n[target 생성] {chapter['title']} ({target_lang}) -- 호출 중...")
    raw = call_deepseek(manual_text, user_input, model, api_key)
    block, _s, _e = extract_first_json_object(raw)

    self_check_target(block, chapter)
    return block


def self_check_target(block, chapter):
    """13/14장 경량 자체확인 중 스크립트 레벨에서 재확인 가능한 부분만 검증.
    (원어민 자연화, 직역투 여부 등 언어적 판단은 LLM 자체확인에 맡긴다)"""
    sets = block.get("sets", {})
    if "001" not in sets or len(sets["001"]) != 6:
        raise ValueError("target: sets['001']이 6줄이 아님")
    if any(not line.strip() for line in sets["001"]):
        raise ValueError("target: 빈 문장 포함")
    if block.get("title") != chapter["title"]:
        raise ValueError(
            f"target: title 불일치 (기대={chapter['title']!r}, 실제={block.get('title')!r})"
        )
    if re.search(r"[0-9$%#/]", "".join(sets["001"])):
        raise ValueError("target: 아라비아 숫자/숫자 기호 포함 (TTS 규칙 위반)")


# ---------------------------------------------------------------------------
# 3) 녹음(TTS) 직전 사람 검수 지점
#
#    별도의 임시파일이 아니라, 최종 산출물과 "정확히 같은 경로/같은 파일명"의
#    target 언어 SRT를 미리 만들어둔다:
#      {output_root}/{target_lang}/{filename_base}/{filename_base}.{target_lang}.srt
#    (이 경로는 save_outputs()가 나중에 진짜 타이밍으로 덮어쓰는 파일과 100%
#    동일하다 -- 확인 단계와 최종 저장 단계가 서로 다른 파일을 쓰면 "내가 고친
#    파일이 실제로 반영된 건지" 헷갈리는 사고가 나기 때문에 경로를 하나로 고정.)
#
#    확인 시점에는 실제 오디오가 아직 없으므로 타임스탬프는 자리채움(placeholder)
#    값이다. 사용자는 이 SRT를 열어 "텍스트만" 고치고(번호/타임스탬프는 그대로
#    둔 채) 저장한 뒤 y를 입력한다. y를 누르면 화면에 있던 문장이 아니라
#    "이 시점에 파일에 실제로 저장돼 있는 대사 텍스트"만 다시 파싱해서 최종
#    target_lines로 확정한다 (타임스탬프/번호는 어차피 실제 녹음 후 재계산되므로
#    무시). 저장을 깜빡해도 이전 문장이 그대로 녹음되는 사고를 막기 위해 항상
#    "파일 기준"으로 확정한다. n을 입력하면 TTS 호출도, 이후 저장도 전혀 하지
#    않고 그대로 종료한다.
# ---------------------------------------------------------------------------

def target_srt_final_path(output_root, target_lang, filename_base):
    """확인 단계의 draft SRT와 save_outputs()의 최종 SRT가 공유하는 단일 경로."""
    return item_dir(output_root, target_lang, filename_base) / f"{filename_base}.{target_lang}.srt"


def write_placeholder_target_srt(path, target_lines):
    """실제 오디오가 아직 없으므로, 문장당 2000ms + 문장 간 SENTENCE_GAP_MS로
    가짜 타이밍을 채워 유효한 SRT 구조만 만든다. 이 타임스탬프 자체는 의미가
    없고(어차피 실제 녹음 후 덮어써짐), 사용자가 익숙한 SRT 편집기/뷰어로 열어
    텍스트만 고칠 수 있도록 형식만 맞춘 것이다."""
    timings = []
    cursor = 0
    for _ in target_lines:
        start = cursor
        end = cursor + 2000
        timings.append((start, end))
        cursor = end + SENTENCE_GAP_MS

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(build_srt(target_lines, timings), encoding="utf-8")


def parse_srt_dialogue_lines(path):
    """SRT 큐 블록(번호 / 타임스탬프 / 텍스트 / 빈줄)에서 텍스트만 순서대로
    뽑는다. 번호·타임스탬프 줄은 사람이 그대로 두고 텍스트만 고치는 워크플로우를
    전제로 하며, build_srt()가 만드는 표준 4줄(번호/타임스탬프/텍스트/공백)
    블록 구조를 그대로 역파싱한다."""
    content = path.read_text(encoding="utf-8")
    blocks = re.split(r"\n\s*\n", content.strip())
    lines = []
    for block in blocks:
        block_lines = [l for l in block.splitlines() if l.strip() != ""]
        if len(block_lines) < 3:
            continue  # 번호+타임스탬프+텍스트 미만이면 깨진 블록 -- 건너뜀
        text = " ".join(block_lines[2:]).strip()
        lines.append(text)
    return lines


def confirm_before_recording(target_lines, target_lang, srt_path):
    write_placeholder_target_srt(srt_path, target_lines)
    print(f"\n[검수 대기] target 대사 6줄을 SRT로 저장함: {srt_path}")
    print("이 파일을 열어 '텍스트만' 고치세요 (번호/타임스탬프는 그대로 둘 것 -- "
          "실제 녹음이 끝나면 정확한 타이밍으로 이 파일이 그대로 덮어써집니다).")

    while True:
        choice = input("녹음(TTS)을 시작할까요? 수정 후 저장했다면 y, 취소하려면 n: ").strip().lower()
        if choice == "y":
            break
        if choice == "n":
            print("[중단] 사용자 취소.")
            sys.exit(0)
        print("y 또는 n만 입력하세요.")

    edited_lines = parse_srt_dialogue_lines(srt_path)
    if len(edited_lines) != 6:
        print(f"[오류] target이 6줄이 아님 (현재 {len(edited_lines)}줄). "
              f"{srt_path} 파일의 큐 구조(번호/타임스탬프/텍스트)가 깨지지 않았는지 "
              f"확인 후 다시 실행하세요.")
        sys.exit(1)
    if re.search(r"[0-9$%#/]", "".join(edited_lines)):
        raise ValueError("target: 아라비아 숫자/숫자 기호 포함 (TTS 규칙 위반)")

    return edited_lines


# ---------------------------------------------------------------------------
# 4~5) TTS 생성 + 오디오 타이밍 추출 -> target SRT
# ---------------------------------------------------------------------------

def _get_tts_client(tts_credentials):
    """Google Cloud TTS 클라이언트를 생성한다. GOOGLE_APPLICATION_CREDENTIALS를
    이 호출 안에서만 임시로 세팅한다 (다른 GCP 인증에 영향 주지 않도록)."""
    from google.cloud import texttospeech

    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = tts_credentials
    return texttospeech.TextToSpeechClient()


def _synthesize_sentence(client, text, voice_name, language_code):
    """설계도 5장 공통 오디오 표준(LINEAR16/24000Hz/Mono) + 문장 단위 응답을
    AudioSegment.from_file(io.BytesIO(...), format="wav")로 읽는 방식을 그대로 따른다.
    직접 PCM bytes를 이어붙이는 방식은 설계도에서 명시적으로 금지."""
    from google.cloud import texttospeech
    from pydub import AudioSegment

    synthesis_input = texttospeech.SynthesisInput(text=text)
    voice = texttospeech.VoiceSelectionParams(
        language_code=language_code, name=voice_name
    )
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.LINEAR16,
        sample_rate_hertz=TTS_SAMPLE_RATE_HZ,
    )
    response = client.synthesize_speech(
        input=synthesis_input, voice=voice, audio_config=audio_config
    )
    return AudioSegment.from_file(io.BytesIO(response.audio_content), format="wav")


def tts_generate_target_audio(target_lines, target_lang, out_audio_path,
                               tts_credentials=DEFAULT_TTS_CREDENTIALS,
                               tts_common_dir=DEFAULT_TTS_COMMON_DIR):
    """설계도 6장 Conversation 표준: 문장별 개별 TTS 호출 -> AudioSegment 병합
    -> 문장 간 350ms, 세트 끝 650ms. A=여성(홀수 줄), B=남성(짝수 줄) -- target
    생성 매뉴얼의 화자 순서(A-B-A-B-A-B)와 동일하게 맞춘다.

    Voice/언어코드는 실제 tts/common/config.py에서 그대로 가져온다 (예: kr은
    Chirp3 HD가 아니라 Neural2 A/C -- 실제 청취 테스트로 확정된 값이므로 이
    스크립트에서 별도로 재정의하지 않는다).

    반환값: 6개 (start_ms, end_ms) 튜플 -- 각 줄의 실제 발화 구간(무음 제외).
    이 타이밍이 이후 target SRT 및 나머지 7개 언어 SRT 전부의 기준이 된다."""
    from pydub import AudioSegment

    tts_config = _load_tts_config(tts_common_dir)

    if target_lang not in tts_config.VOICE_AB:
        raise ValueError(
            f"target_lang={target_lang!r}이 tts/common/config.py의 VOICE_AB에 없음. "
            f"02_생성메뉴얼 STEP 2(list_voices() 조회)로 보이스를 확정해 config.py에 "
            f"먼저 추가할 것 (이 스크립트가 아니라 config.py가 단일 소스임)."
        )
    voices = tts_config.VOICE_AB[target_lang]
    language_code = tts_config.LANGUAGE_CODE[target_lang]

    client = _get_tts_client(tts_credentials)
    final_audio = AudioSegment.empty()
    timings = []

    for i, text in enumerate(target_lines):
        speaker = "A" if i % 2 == 0 else "B"
        voice_name = voices[speaker]

        segment = _synthesize_sentence(client, text, voice_name, language_code)

        start_ms = len(final_audio)
        final_audio += segment
        end_ms = len(final_audio)
        timings.append((start_ms, end_ms))

        is_last_line = (i == len(target_lines) - 1)
        gap_ms = SET_END_GAP_MS if is_last_line else SENTENCE_GAP_MS
        final_audio += AudioSegment.silent(duration=gap_ms)

    out_audio_path = Path(out_audio_path)
    out_audio_path.parent.mkdir(parents=True, exist_ok=True)
    final_audio.export(out_audio_path, format="mp3")
    print(f"  [TTS 저장] {out_audio_path} ({len(final_audio)}ms)")

    return timings


def format_srt_timestamp(ms):
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def build_srt(lines, timings):
    """lines: 6개 문자열, timings: 6개 (start_ms, end_ms) 튜플."""
    out = []
    for i, (text, (start, end)) in enumerate(zip(lines, timings), start=1):
        out.append(str(i))
        out.append(f"{format_srt_timestamp(start)} --> {format_srt_timestamp(end)}")
        out.append(text)
        out.append("")
    return "\n".join(out)


# ---------------------------------------------------------------------------
# 6) target SRT 앵커 -> 7개 언어 1:1 번역
# ---------------------------------------------------------------------------

def build_translation_user_input(chapter, target_lang, title, target_lines, lang):
    lines = [
        f"BATCH_ID: {chapter['idx']}",
        f"LEVEL: {chapter['level']}",
        f"TARGET_LANGUAGE: {target_lang}",
        f"title.target: {title}",
        "",
        "sets (target, set_id=001, 6줄, A-B-A-B-A-B 순서):",
    ]
    for i, line in enumerate(target_lines, start=1):
        speaker = "A" if i % 2 == 1 else "B"
        lines.append(f"  [{speaker}] {line}")
    lines.append("")
    lines.append(
        f"이 세트 1개(set_id=001, 6줄)만 {lang} 컬럼으로 번역(또는 target=이 언어면 "
        f"미러링)해서, 문서 13장 압축 스키마 그대로 title + sets['001'] 6칸만 채워 출력."
    )
    return "\n".join(lines)


def translate_one_lang(chapter, target_lang, title, target_lines, lang, prompts_dir, model, api_key):
    prompt_text = load_prompt(prompts_dir, TRANSLATOR_PROMPT_FILENAME[lang])
    user_input = build_translation_user_input(chapter, target_lang, title, target_lines, lang)

    raw = call_deepseek(prompt_text, user_input, model, api_key)
    block, _s, _e = extract_first_json_object(raw)
    lines = block.get("sets", {}).get("001")
    if not lines or len(lines) != 6:
        raise ValueError(f"{lang}: sets['001']이 6줄이 아님")
    return lang, block.get("title", ""), lines


def translate_all(chapter, target_lang, title, target_lines, prompts_dir, model, api_key, workers=4):
    """target_lang 자신은 이미 target이므로 번역 대상에서 제외.
    나머지 6개 언어를 병렬 호출 (deepseek_generate.py의 ThreadPoolExecutor 구조 재사용)."""
    langs_to_translate = [l for l in ALL_LANGS if l != target_lang]
    results = {}

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(
                translate_one_lang, chapter, target_lang, title, target_lines,
                lang, prompts_dir, model, api_key
            ): lang
            for lang in langs_to_translate
        }
        for future in as_completed(futures):
            lang = futures[future]
            try:
                lang, lang_title, lang_lines = future.result()
                results[lang] = {"title": lang_title, "lines": lang_lines}
                print(f"  [완료] {lang}")
            except Exception as e:
                print(f"  [실패] {lang}: {e}")
                raise

    # target 언어 자신은 원문 그대로
    results[target_lang] = {"title": title, "lines": target_lines}
    return results


# ---------------------------------------------------------------------------
# 7) 채점(평가) -> 재검수(패치) 루프
# ---------------------------------------------------------------------------

def build_runtime_json(chapter, target_lang, title, translations):
    """평가/재검수 프롬프트가 기대하는 runtime JSON(meta/title/blocks[].lines[].sentences)
    형태로 조립. set 1개, 6줄뿐이므로 blocks 배열도 원소 1개."""
    lang_keys = ["target"] + ALL_LANGS  # target, en, es, fr, pt, kr, jp, zh
    title_obj = {"target": title}
    for lang in ALL_LANGS:
        title_obj[lang] = title if lang == target_lang else translations[lang]["title"]

    lines = []
    for i in range(6):
        speaker = "A" if i % 2 == 0 else "B"
        sentences = {"target": translations[target_lang]["lines"][i]}
        for lang in ALL_LANGS:
            sentences[lang] = translations[lang]["lines"][i]
        lines.append({"speaker": speaker, "sentences": sentences})

    return {
        "meta": {"series": "conversation_shorts", "level": chapter["level"].lower(),
                  "id": chapter["idx"]},
        "title": title_obj,
        "blocks": [{"set_id": "001", "lines": lines}],
    }


def evaluate(runtime_json, target_lang, prompts_dir, model, api_key):
    prompt_text = load_eval_prompt_text(prompts_dir, target_lang)
    user_input = json.dumps(runtime_json, ensure_ascii=False, indent=2)
    raw = call_deepseek(prompt_text, user_input, model, api_key)
    result, _s, _e = extract_first_json_object(raw)
    return result


def is_pass(eval_result):
    if eval_result.get("final_score", 0) < PASS_SCORE_THRESHOLD:
        return False
    for domain in eval_result.get("domain_scores", {}).values():
        if domain.get("score", 0) < 6:
            return False
    if eval_result.get("blocking_issues"):
        return False
    return True


def build_reeval_request_block(chapter, target_lang, eval_result, runtime_json):
    """conversation_eval_pipeline.py가 원래 터미널에 출력하는 '재검수 요청 블록'
    형태를 그대로 재현한다 (재검수프롬프트가 이 형식을 기대함)."""
    return (
        f"target={target_lang} batch_id={chapter['idx']}\n\n"
        f"[채점 결과]\n{json.dumps(eval_result, ensure_ascii=False, indent=2)}\n\n"
        f"[원본 JSON]\n{json.dumps(runtime_json, ensure_ascii=False, indent=2)}"
    )


def apply_replacements(runtime_json, replacements_result):
    """재검수프롬프트 출력(TITLE_REPLACEMENTS/REPLACEMENTS)을 runtime_json에 patch."""
    title_repl = replacements_result.get("TITLE_REPLACEMENTS", {})
    for lang, new_title in title_repl.items():
        runtime_json["title"][lang] = new_title

    line_repl = replacements_result.get("REPLACEMENTS", {})
    lines_by_set = {b["set_id"]: b["lines"] for b in runtime_json["blocks"]}
    for (set_id, line_no, lang), new_text in line_repl.items():
        lines_by_set[set_id][line_no - 1]["sentences"][lang] = new_text


def eval_and_patch_loop(chapter, target_lang, runtime_json, prompts_dir, model, api_key):
    """확정 설계: 문장 단위 패치, 재시도 상한 RETRY_LIMIT.
    target 자체가 원인으로 의심되면(=blocking_issues에 lang=target_lang(미러 컬럼)가
    반복 등장) 이 함수는 False를 반환해 상위 호출자가 target부터 재생성하게 한다."""
    for attempt in range(1, RETRY_LIMIT + 1):
        eval_result = evaluate(runtime_json, target_lang, prompts_dir, model, api_key)
        print(f"  [평가 {attempt}회차] final_score={eval_result.get('final_score')} "
              f"pass={is_pass(eval_result)}")

        if is_pass(eval_result):
            return True, runtime_json, eval_result

        reeval_block = build_reeval_request_block(chapter, target_lang, eval_result, runtime_json)
        reviewer_prompt = load_reviewer_prompt_text(prompts_dir, target_lang)
        raw = call_deepseek(reviewer_prompt, reeval_block, model, api_key)

        try:
            _batch_id, patch = extract_python_dict_literal(raw)
        except ValueError as e:
            print(f"  [경고] 재검수 출력 파싱 실패, 다음 시도로: {e}")
            continue

        apply_replacements(runtime_json, patch)

    # 상한 초과
    final_eval = evaluate(runtime_json, target_lang, prompts_dir, model, api_key)
    return False, runtime_json, final_eval


# ---------------------------------------------------------------------------
# 9) 언어별 SRT 생성 (target 타이밍 재사용, 텍스트만 교체)
# ---------------------------------------------------------------------------

def build_all_srts(runtime_json, target_lang, timings):
    lines_by_lang = {lang: [] for lang in ["target"] + ALL_LANGS}
    for line in runtime_json["blocks"][0]["lines"]:
        for lang, text in line["sentences"].items():
            lines_by_lang[lang].append(text)

    srts = {}
    for lang, lines in lines_by_lang.items():
        srts[lang] = build_srt(lines, timings)
    return srts


def build_combined_srt(runtime_json, timings):
    """
    target + 7개 언어를 같은 타임스탬프 구간에 8줄로 몰아넣은
    합본 SRT 하나를 만든다.

    줄 순서: target -> ALL_LANGS 순서(en/es/fr/pt/kr/zh/jp) 고정.
    언어 라벨은 붙이지 않는다 (텍스트만 8줄).
    """
    order = ["target"] + ALL_LANGS

    lines_by_lang = {lang: [] for lang in order}
    for line in runtime_json["blocks"][0]["lines"]:
        for lang, text in line["sentences"].items():
            if lang in lines_by_lang:
                lines_by_lang[lang].append(text)

    out = []
    for i, (start_ms, end_ms) in enumerate(timings):
        out.append(str(i + 1))
        out.append(f"{format_srt_timestamp(start_ms)} --> {format_srt_timestamp(end_ms)}")
        for lang in order:
            out.append(lines_by_lang[lang][i])
        out.append("")
    return "\n".join(out)


# ---------------------------------------------------------------------------
# 10) 저장 (파일명과 동일한 이름의 폴더 하나에 json/eval/오디오/SRT ×8 모두 저장)
# ---------------------------------------------------------------------------

def compute_filename_base(chapter, target_lang):
    """
    선택한 target 언어의 TARGET_GENERATOR에 정의된 chapter["title"]을
    그대로 사용하여 폴더명/파일명을 생성한다.

    예:
      kr: 자기소개 -> a1_자기소개
      en: Self Introduction -> a1_self_introduction
      es: Presentación personal -> a1_presentación_personal
      fr: Présentation personnelle -> a1_présentation_personnelle
      pt: Apresentação pessoal -> a1_apresentação_pessoal

    한국어/중국어/일본어/악센트 문자를 포함한 라틴 문자 등
    Unicode 문자를 삭제하지 않는다.
    """
    title = unicodedata.normalize("NFC", chapter["title"].strip())

    # Unicode 문자/숫자는 유지.
    # 공백, 하이픈, 문장부호 등만 "_"로 변환.
    topic_slug = re.sub(r"[^\w]+", "_", title, flags=re.UNICODE)

    # 연속된 "_" 정리
    topic_slug = re.sub(r"_+", "_", topic_slug).strip("_")

    # 대소문자가 존재하는 언어만 자연스럽게 소문자화
    topic_slug = topic_slug.lower()

    return f"{chapter['level'].lower()}_{topic_slug}"


def item_dir(output_root, target_lang, filename_base):
    return Path(output_root) / target_lang / filename_base


def save_outputs(chapter, target_lang, filename_base, runtime_json, srts, combined_srt,
                  eval_result, passed, audio_path, output_root):
    final_dir = item_dir(output_root, target_lang, filename_base)
    if not passed:
        final_dir = Path(output_root) / "needs_review" / filename_base
    final_dir.mkdir(parents=True, exist_ok=True)

    # TTS 단계에서 이미 item_dir(target_lang용)에 오디오를 만들어뒀는데, 상한 초과라
    # needs_review로 옮겨야 하는 경우 오디오 파일도 함께 옮긴다.
    audio_path = Path(audio_path)
    if audio_path.exists() and audio_path.parent != final_dir:
        audio_path.rename(final_dir / audio_path.name)

    (final_dir / f"{filename_base}.json").write_text(
        json.dumps(runtime_json, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (final_dir / f"{filename_base}.eval.json").write_text(
        json.dumps(eval_result, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    for lang, srt_text in srts.items():
        (final_dir / f"{filename_base}.{lang}.srt").write_text(srt_text, encoding="utf-8")

    (final_dir / f"{filename_base}.all.srt").write_text(combined_srt, encoding="utf-8")

    print(f"\n[저장 완료] {final_dir}/ ({'PASS' if passed else 'NEEDS_REVIEW'})")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="ManyLangs 쇼츠 회화 1세트 생성 파이프라인")
    parser.add_argument("--prompts-dir",
                         default="/Users/junghasuk/Desktop/ManyLangs/web/youtube/conversation/prompts",
                         help="target생성/번역/검수/평가/재검수 13종 프롬프트 md가 모여있는 폴더")
    parser.add_argument("--output-root",
                         default="/Users/junghasuk/Desktop/ManyLangs/web/youtube/conversation")
    parser.add_argument("--model", default="deepseek-chat")
    parser.add_argument("--tts-creds", default=DEFAULT_TTS_CREDENTIALS,
                         help="Google Cloud TTS 서비스 계정 json 경로")
    parser.add_argument("--tts-common-dir", default=DEFAULT_TTS_COMMON_DIR,
                         help="tts/common/config.py가 있는 폴더 (VOICE_AB/LANGUAGE_CODE 소스)")
    args = parser.parse_args()

    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        print("[오류] DEEPSEEK_API_KEY 환경변수가 없습니다.", file=sys.stderr)
        sys.exit(1)

    # 1) 언어 약어만 묻고, 60개 챕터를 폴더명으로 번호 매겨 보여준 뒤 번호로 선택
    target_lang = prompt_target_lang()
    manual_text = load_target_generator_prompt(args.prompts_dir, target_lang)
    chapters = parse_chapter_table(manual_text)
    chapter = prompt_chapter_selection(chapters, target_lang)

    # 2) target 생성 -- 1회만 실행한다. target 자체가 원인으로 의심되는 케이스는
    #    자동 재생성하지 않고 needs_review/에 보내 사람이 판단하기로 확정했으므로,
    #    여기서 재시도 루프를 두지 않는다 (문장 단위 재시도는 eval_and_patch_loop
    #    내부에서 RETRY_LIMIT 만큼 별도로 이루어짐).
    target_block = generate_target(chapter, target_lang, args.prompts_dir, args.model, api_key)
    title = target_block["title"]
    target_lines = target_block["sets"]["001"]

    filename_base = compute_filename_base(chapter, target_lang)

    # 3) 녹음(TTS) 직전 사람 검수 지점 -- 최종 산출물과 동일한 경로/이름의
    #    target 언어 SRT를 미리 만들어두고 대기. 수정 후 저장 + y 입력 시
    #    "그 SRT 파일에 저장된 텍스트"를 최종 target_lines로 확정.
    srt_path = target_srt_final_path(args.output_root, target_lang, filename_base)
    target_lines = confirm_before_recording(target_lines, target_lang, srt_path)

    # 4~5) TTS + target SRT 타이밍 -- 파일명과 동일한 폴더에 오디오까지 함께 저장
    audio_dir = item_dir(args.output_root, target_lang, filename_base)
    audio_path = audio_dir / f"{filename_base}.mp3"
    audio_path.parent.mkdir(parents=True, exist_ok=True)
    timings = tts_generate_target_audio(target_lines, target_lang, audio_path,
                                         tts_credentials=args.tts_creds,
                                         tts_common_dir=args.tts_common_dir)

    # 6) 7개 언어 번역
    translations = translate_all(
        chapter, target_lang, title, target_lines, args.prompts_dir, args.model, api_key
    )

    # 7) 채점 -> 재검수 루프 (문장 단위, RETRY_LIMIT회). 상한 초과 시 passed=False로
    #    반환되며, 이 경우 target 자체 결함일 가능성을 사람이 needs_review/에서 직접
    #    판단한다 -- 자동 target 재생성은 하지 않는다 (확정 사항).
    runtime_json = build_runtime_json(chapter, target_lang, title, translations)
    passed, runtime_json, eval_result = eval_and_patch_loop(
        chapter, target_lang, runtime_json, args.prompts_dir, args.model, api_key
    )
    if not passed:
        print("  [사람 판단 필요] 재시도 상한 초과 -- needs_review/에 저장 후 target 자체 "
              "재생성이 필요한지는 blocking_issues를 직접 확인해 결정할 것")

    # 9) SRT 생성 (언어별 8개 + 합본 1개) + 10) 저장
    srts = build_all_srts(runtime_json, target_lang, timings)
    combined_srt = build_combined_srt(runtime_json, timings)
    save_outputs(chapter, target_lang, filename_base, runtime_json, srts, combined_srt,
                 eval_result, passed, audio_path, args.output_root)


if __name__ == "__main__":
    main()
