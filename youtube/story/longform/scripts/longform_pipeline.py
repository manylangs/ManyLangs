#!/usr/bin/env python3
"""
longform_pipeline.py

story/longform 20씬 연속 스토리 생성 파이프라인.
shorts_pipeline.py의 핵심 함수(call_deepseek, extract_first_json_object,
translate_all, eval_and_patch_loop, SRT 빌더)를 그대로 재사용하고,
21_STORY_PLANNER.md(기획) + 22_STORY_TARGET.md(씬 순차 생성 + 연속성)
단계를 새로 추가한다.

흐름:
  1) 상황 한 줄 + 레벨 + target_lang 입력
  2) 21_STORY_PLANNER.md 호출 -> scene_plan(20개, 한국어) 생성
  3) 사람이 한국어로 기획 확인 (y/n)
  4) 22_STORY_TARGET.md를 씬 001~020 순차 호출 -> target 대사
     (매 호출마다 직전 씬 원문 전체를 컨텍스트로 포함)
  5) kr 번역을 씬 전체에 대해 먼저 생성 -> 사람이 한국어로 최종 확인
  6) TTS (A 고정보이스 / B는 씬 b_gender에 따라 보이스 풀에서 선택)
  7) 나머지 6개 언어 번역 + 평가/재검수 루프 (씬 단위, shorts_pipeline과 동일)
  8) 저장 (episode.json + 씬별 산출물)

TTS의 B 성별별 보이스는 story/longform 전용 voice_pool_b.py의
VOICE_POOL_B[target_lang]에서 가져온다 (tts/common/config.py는 건드리지 않음).
"""

import argparse
import fnmatch
import io
import json
import os
import re
import sys
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from voice_pool_b import VOICE_POOL_B

DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

RETRY_LIMIT = 3
PASS_SCORE_THRESHOLD = 80
SCENE_COUNT = 20

DEFAULT_TTS_CREDENTIALS = (
    "/Users/junghasuk/Desktop/ManyLangs/web/tts/tts-generator.json"
)
DEFAULT_TTS_COMMON_DIR = "/Users/junghasuk/Desktop/ManyLangs/web/tts/common"

SENTENCE_GAP_MS = 350
SCENE_END_GAP_MS = 650
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
ALL_LANGS = list(TRANSLATOR_PROMPT_FILENAME.keys())


# ---------------------------------------------------------------------------
# 프롬프트 파일 로드 (shorts_pipeline.py find_prompt_file 그대로)
# ---------------------------------------------------------------------------

def find_prompt_file(prompts_dir, pattern):
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
            f"'{pattern}' 패턴에 맞는 프롬프트 파일을 찾지 못함 (경로: {prompts_dir})."
        )
    if len(matches) > 1:
        names = ", ".join(p.name for p in matches)
        raise ValueError(
            f"'{pattern}' 패턴에 맞는 프롬프트 파일이 {len(matches)}개 발견됨: {names}."
        )
    return matches[0].read_text(encoding="utf-8")


def load_planner_prompt(prompts_dir):
    return find_prompt_file(prompts_dir, "21_STORY_PLANNER.md")


def load_story_target_prompt(prompts_dir):
    return find_prompt_file(prompts_dir, "22_STORY_TARGET.md")


def load_eval_prompt_text(prompts_dir, target_lang):
    return find_prompt_file(prompts_dir, f"conversation_{target_lang}_평가프롬프트*")


def load_reviewer_prompt_text(prompts_dir, target_lang):
    return find_prompt_file(prompts_dir, f"conversation_{target_lang}_재검수프롬프트*")


# ---------------------------------------------------------------------------
# DeepSeek 호출 + JSON 추출 (shorts_pipeline.py 그대로)
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
    start = text.find("{")
    if start == -1:
        raise ValueError("응답에서 JSON 객체를 찾지 못함")
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                return json.loads(text[start:end]), start, end
    raise ValueError("JSON 객체가 닫히지 않음")


def extract_python_dict_literal(text):
    import ast
    start = text.find("{")
    end = text.rfind("}") + 1
    literal = ast.literal_eval(text[start:end])
    return literal


# ---------------------------------------------------------------------------
# 1) 입력
# ---------------------------------------------------------------------------

def prompt_inputs():
    situation = input("상황 한 줄 (예: 영화관 가기): ").strip()
    level = input("레벨 (A1~C2): ").strip().upper()
    target_lang = input("target_lang 약어 (2자리): ").strip().lower()
    if not situation or not level or not target_lang:
        print("[오류] 입력이 비어있습니다.")
        sys.exit(1)
    return situation, level, target_lang


def slugify(text):
    text = unicodedata.normalize("NFC", text.strip())
    slug = re.sub(r"[^\w]+", "_", text, flags=re.UNICODE)
    slug = re.sub(r"_+", "_", slug).strip("_").lower()
    return slug


def compute_episode_dir_name(level, situation, episode_num=1):
    return f"{level.lower()}_{slugify(situation)}_ep{episode_num:02d}"


# ---------------------------------------------------------------------------
# 2) 20-beat 기획 생성 (한국어, 언어중립)
# ---------------------------------------------------------------------------

PLAN_RETRY_LIMIT = 3


def generate_scene_plan(situation, level, episode_id, prompts_dir, model, api_key):
    prompt_text = load_planner_prompt(prompts_dir)
    base_user_input = (
        f"SITUATION: {situation}\n"
        f"LEVEL: {level}\n"
        f"EPISODE_ID: {episode_id}\n\n"
        f"6장 출력 스키마 그대로, scene_plan 20개를 한국어로 생성."
    )

    user_input = base_user_input
    last_error = None
    for attempt in range(1, PLAN_RETRY_LIMIT + 1):
        print(f"\n[기획 생성 {attempt}/{PLAN_RETRY_LIMIT}회차] {situation} ({level}) -- 호출 중...")
        raw = call_deepseek(prompt_text, user_input, model, api_key)
        try:
            plan, _s, _e = extract_first_json_object(raw)
            self_check_plan(plan)
            return plan
        except Exception as e:
            last_error = e
            debug_path = _save_debug_raw(prompts_dir, episode_id, f"plan_attempt{attempt}", raw, str(e))
            print(f"  [실패 {attempt}/{PLAN_RETRY_LIMIT}] {e} -- 원문 저장: {debug_path}")

            user_input = (
                base_user_input
                + f"\n\n[재시도 {attempt+1}회차] 직전 시도 결과: {e}\n"
                + "이 문제를 정확히 고쳐서 다시 생성하라. 특히 surprise:true 개수를 "
                + "실제로 세어보고 정확히 2개가 되도록 조정할 것."
            )

    raise ValueError(f"기획 생성 {PLAN_RETRY_LIMIT}회 모두 실패: {last_error}")


def self_check_plan(plan):
    scenes = plan.get("scene_plan", [])
    if len(scenes) != SCENE_COUNT:
        raise ValueError(f"기획: scene_plan 길이가 {len(scenes)} (20이어야 함)")
    surprise_count = sum(1 for s in scenes if s.get("surprise"))
    if not (2 <= surprise_count <= 3):
        raise ValueError(f"기획: 돌발 슬롯 개수가 {surprise_count}개 (2~3개여야 함)")
    for s in scenes:
        if not s.get("surprise") and not s.get("situation"):
            raise ValueError(f"기획: {s.get('scene_id')} situation 누락")
        if not s.get("monologue") and s.get("line_count", 0) % 2 != 0:
            raise ValueError(f"기획: {s.get('scene_id')} line_count가 짝수 아님 (대화 씬)")


def confirm_plan_in_korean(plan, plan_path):
    plan_path.parent.mkdir(parents=True, exist_ok=True)
    plan_path.write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n[기획 검수 대기] 한국어 기획을 저장함: {plan_path}")
    print("파일을 열어 확인/수정 후 저장하세요.")
    while True:
        choice = input("이 기획으로 진행할까요? y/n: ").strip().lower()
        if choice == "y":
            break
        if choice == "n":
            print("[중단] 사용자 취소.")
            sys.exit(0)
        print("y 또는 n만 입력하세요.")
    return json.loads(plan_path.read_text(encoding="utf-8"))


# ---------------------------------------------------------------------------
# 3) target 씬 순차 생성 (연속성 유지 -- 직전 씬 원문을 그대로 컨텍스트로 포함)
# ---------------------------------------------------------------------------

def build_scene_user_input(episode_id, target_lang, level, scene_plan, scene_id, prior_scenes):
    spec = next(s for s in scene_plan["scene_plan"] if s["scene_id"] == scene_id)
    is_monologue = bool(spec.get("monologue"))

    lines = [
        f"EPISODE_ID: {episode_id}",
        f"TARGET_LANGUAGE: {target_lang}",
        f"LEVEL: {level}",
        "",
        "SCENE_PLAN (전체, 참고용):",
        json.dumps(scene_plan, ensure_ascii=False),
        "",
        f"CURRENT_SCENE_ID: {scene_id}",
        f"CURRENT_SCENE_MONOLOGUE: {'true' if is_monologue else 'false'}",
        "",
        "PRIOR_SCENES (target 원문, 요약 아님):",
    ]
    for sid, scene_lines in prior_scenes.items():
        lines.append(f"  [{sid}] " + " / ".join(scene_lines))
    lines.append("")
    if is_monologue:
        lines.append(
            f"이 씬(scene_id={scene_id})은 CURRENT_SCENE_MONOLOGUE: true다. "
            f"반드시 A 혼자만의 대사 {spec.get('line_count')}줄로만 채워라 -- "
            f"B는 절대 등장시키지 마라 (4장 독백 씬 생성 규칙 적용). "
            f"5장 출력 스키마 그대로 생성. 연속성 규칙(3장) 그대로 적용."
        )
    else:
        lines.append(
            f"이 씬(scene_id={scene_id})은 CURRENT_SCENE_MONOLOGUE: false다. "
            f"A-B 대화 {spec.get('line_count')}줄(A-B-A-B...로 끝남)로 채워라 "
            f"(5장 대화 씬 대사 규칙 적용). "
            f"5장 출력 스키마 그대로 생성. 연속성 규칙(3장) 그대로 적용."
        )
    return "\n".join(lines)


def _save_debug_raw(prompts_dir, episode_id, scene_id, raw, error_msg):
    """파싱/검증 실패 시 DeepSeek 원문 응답을 파일로 남긴다 (원인 분석용).
    실패해서 죽더라도 이 파일을 열어보면 실제로 무엇이 잘못 왔는지 확인 가능."""
    debug_dir = Path(prompts_dir).parent / "debug"
    debug_dir.mkdir(parents=True, exist_ok=True)
    debug_path = debug_dir / f"{episode_id}_{scene_id}_raw.txt"
    debug_path.write_text(
        f"[오류] {error_msg}\n\n"
        f"===== DeepSeek 원문 응답 =====\n{raw}\n",
        encoding="utf-8"
    )
    return debug_path


SCENE_RETRY_LIMIT = 3


def generate_scene_target(episode_id, target_lang, level, scene_plan, scene_id,
                           prior_scenes, prompts_dir, model, api_key):
    prompt_text = load_story_target_prompt(prompts_dir)
    base_user_input = build_scene_user_input(
        episode_id, target_lang, level, scene_plan, scene_id, prior_scenes
    )

    spec = next(s for s in scene_plan["scene_plan"] if s["scene_id"] == scene_id)
    expected_lines = spec["line_count"]

    user_input = base_user_input
    last_error = None
    for attempt in range(1, SCENE_RETRY_LIMIT + 1):
        suffix = "" if attempt == 1 else f" (재시도 {attempt}/{SCENE_RETRY_LIMIT})"
        print(f"  [씬 {scene_id} 생성{suffix}] -- 호출 중...")
        raw = call_deepseek(prompt_text, user_input, model, api_key)

        try:
            block, _s, _e = extract_first_json_object(raw)
            title = block.get("title", "")
            if not title.strip():
                raise ValueError(f"씬 {scene_id}: title이 비어있음")
            lines = block.get("sets", {}).get(scene_id)
            if not lines or len(lines) != expected_lines:
                raise ValueError(f"씬 {scene_id}: 줄수 불일치 (기대={expected_lines}, 실제={len(lines) if lines else 0})")
            if any(not l.strip() for l in lines):
                raise ValueError(f"씬 {scene_id}: 빈 문장 포함")
            if re.search(r"[0-9$%#/]", "".join(lines)):
                raise ValueError(f"씬 {scene_id}: 아라비아 숫자/기호 포함")
            if spec.get("surprise"):
                resolution_words = ["찾았", "됐어", "다행이", "해결됐", "여기 있네요", "돌려받"]
                joined = "".join(lines)
                if any(w in joined for w in resolution_words):
                    raise ValueError(f"씬 {scene_id}: 돌발 씬인데 이 씬 안에서 문제를 해결하는 표현이 포함됨")

            return lines, title, block.get("b_gender", spec.get("b_gender", ""))
        except Exception as e:
            last_error = e
            debug_path = _save_debug_raw(prompts_dir, episode_id, f"{scene_id}_attempt{attempt}", raw, str(e))
            print(f"    [실패 {attempt}/{SCENE_RETRY_LIMIT}] {e} -- 원문 저장: {debug_path}")

            user_input = (
                base_user_input
                + f"\n\n[재시도 {attempt+1}회차] 직전 시도 결과: {e}\n"
                + f"sets['{scene_id}']는 반드시 {expected_lines}개의 개별 문자열이 담긴 "
                + "JSON 배열이어야 한다. 절대 여러 줄을 '/'나 다른 구분자로 하나의 "
                + "문자열에 합치지 말 것 -- 배열 항목 개수 자체가 줄 수와 같아야 한다. "
                + "title도 반드시 채울 것. 돌발 씬이면 문제를 절대 이 씬 안에서 "
                + "해결하지 말고 언급/제시만 할 것."
            )

    debug_path = _save_debug_raw(prompts_dir, episode_id, f"{scene_id}_final", raw, str(last_error))
    raise ValueError(f"씬 {scene_id}: {SCENE_RETRY_LIMIT}회 모두 실패: {last_error} -- 원문 저장: {debug_path}")


def generate_all_scenes_sequential(episode_id, target_lang, level, scene_plan,
                                    prompts_dir, model, api_key):
    """001부터 020까지 순서대로, 매 호출마다 직전 씬 전부를 컨텍스트로 넘긴다.
    연속성이 필요한 단계라 병렬화하지 않는다 (번역/평가 단계와의 핵심 차이)."""
    prior_scenes = {}
    scenes_out = {}
    print(f"\n[씬 순차 생성] 총 {SCENE_COUNT}씬")
    for spec in scene_plan["scene_plan"]:
        scene_id = spec["scene_id"]
        lines, title, b_gender = generate_scene_target(
            episode_id, target_lang, level, scene_plan, scene_id,
            prior_scenes, prompts_dir, model, api_key
        )
        scenes_out[scene_id] = {
            "title": title, "lines": lines, "b_gender": b_gender,
            "monologue": spec.get("monologue", False),
        }
        prior_scenes[scene_id] = lines
    return scenes_out


# ---------------------------------------------------------------------------
# 4) kr 번역 우선 생성 -> 한국어 최종 확인 (target_lang과 무관하게 항상 kr)
# ---------------------------------------------------------------------------

def translate_scene_one_lang(episode_id, level, target_lang, scene_id, title,
                              lines, lang, monologue, prompts_dir, model, api_key):
    prompt_text = find_prompt_file(prompts_dir, TRANSLATOR_PROMPT_FILENAME[lang])
    if monologue:
        speaker_desc = "1인 독백 (전부 화자 A, B 없음)"
        line_labels = "\n".join(f"  [A] {l}" for l in lines)
    else:
        speaker_desc = "A-B 순서"
        line_labels = "\n".join(f"  [{'A' if i % 2 == 0 else 'B'}] {l}" for i, l in enumerate(lines))
    user_input = (
        f"BATCH_ID: {episode_id}_{scene_id}\n"
        f"LEVEL: {level}\n"
        f"TARGET_LANGUAGE: {target_lang}\n"
        f"title.target: {title}\n\n"
        f"sets (target, set_id={scene_id}, {len(lines)}줄, {speaker_desc}):\n"
        + line_labels
        + f"\n\n이 세트 1개(set_id={scene_id})만 {lang} 컬럼으로 번역, "
          f"13장 압축 스키마 그대로 title + sets['{scene_id}']만 채워 출력."
    )
    last_error = None
    for attempt in range(1, RETRY_LIMIT + 1):
        raw = call_deepseek(prompt_text, user_input, model, api_key)
        try:
            block, _s, _e = extract_first_json_object(raw)
            translated = block.get("sets", {}).get(scene_id)
            if not translated or len(translated) != len(lines):
                raise ValueError(
                    f"번역 {lang} 씬 {scene_id}: 줄수 불일치 (기대={len(lines)}, "
                    f"실제={len(translated) if translated else 0})"
                )
            return lang, block.get("title", ""), translated
        except Exception as e:
            last_error = e
    raise ValueError(f"번역 {lang} 씬 {scene_id}: {RETRY_LIMIT}회 모두 실패: {last_error}")


def translate_all_scenes_kr_first(episode_id, level, target_lang, scenes,
                                   prompts_dir, model, api_key, workers=6):
    """target_lang이 이미 kr이면 번역 호출 없이 그대로 미러링."""
    kr_by_scene = {}
    if target_lang == "kr":
        for sid, s in scenes.items():
            kr_by_scene[sid] = {"title": s["title"], "lines": s["lines"], "monologue": s.get("monologue", False)}
        return kr_by_scene

    print(f"\n[kr 우선 번역] {SCENE_COUNT}씬")
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(
                translate_scene_one_lang, episode_id, level, target_lang, sid,
                s["title"], s["lines"], "kr", s.get("monologue", False), prompts_dir, model, api_key
            ): sid
            for sid, s in scenes.items()
        }
        for future in as_completed(futures):
            sid = futures[future]
            _lang, kr_title, kr_lines = future.result()
            kr_by_scene[sid] = {"title": kr_title, "lines": kr_lines, "monologue": scenes[sid].get("monologue", False)}
    return kr_by_scene


def confirm_kr_story(kr_by_scene, kr_review_path):
    kr_review_path.parent.mkdir(parents=True, exist_ok=True)
    text_lines = []
    for sid in sorted(kr_by_scene.keys()):
        s = kr_by_scene[sid]
        text_lines.append(f"=== 씬 {sid}: {s['title']} ===")
        monologue = s.get("monologue", False)
        for i, l in enumerate(s["lines"]):
            speaker = "A" if monologue or i % 2 == 0 else "B"
            text_lines.append(f"[{speaker}] {l}")
        text_lines.append("")
    kr_review_path.write_text("\n".join(text_lines), encoding="utf-8")

    print(f"\n[한국어 검수 대기] {kr_review_path}")
    while True:
        choice = input("이 내용으로 TTS 진행할까요? y/n: ").strip().lower()
        if choice == "y":
            return
        if choice == "n":
            print("[중단] 사용자 취소. target 재생성부터 다시 시작할 것.")
            sys.exit(0)
        print("y 또는 n만 입력하세요.")


# ---------------------------------------------------------------------------
# 5) TTS (A 고정보이스 / B는 씬 b_gender에 따라 보이스 풀에서 선택)
# ---------------------------------------------------------------------------

def _load_tts_config(tts_common_dir):
    import importlib.util
    config_path = Path(tts_common_dir) / "config.py"
    if not config_path.exists():
        raise FileNotFoundError(f"tts/common/config.py를 찾지 못함: {config_path}")
    spec = importlib.util.spec_from_file_location("manylangs_tts_config", config_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _get_tts_client(tts_credentials):
    from google.cloud import texttospeech
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = tts_credentials
    return texttospeech.TextToSpeechClient()


def _synthesize_sentence(client, text, voice_name, language_code):
    from google.cloud import texttospeech
    from pydub import AudioSegment
    synthesis_input = texttospeech.SynthesisInput(text=text)
    voice = texttospeech.VoiceSelectionParams(language_code=language_code, name=voice_name)
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.LINEAR16,
        sample_rate_hertz=TTS_SAMPLE_RATE_HZ,
    )
    response = client.synthesize_speech(input=synthesis_input, voice=voice, audio_config=audio_config)
    return AudioSegment.from_file(io.BytesIO(response.audio_content), format="wav")


def _pick_b_voice(target_lang, b_gender, scene_id):
    """A는 tts/common/config.py의 VOICE_AB[target_lang]['A'] 고정 (기존 파일 그대로).
    B는 story/longform 전용 voice_pool_b.py의 VOICE_POOL_B[target_lang][b_gender]에서
    씬 번호로 순환 선택 (매번 같은 목소리만 걸리지 않도록). tts/common/config.py는
    건드리지 않는다."""
    if target_lang not in VOICE_POOL_B or b_gender not in VOICE_POOL_B[target_lang]:
        raise ValueError(
            f"voice_pool_b.py에 VOICE_POOL_B[{target_lang!r}][{b_gender!r}]가 "
            f"없음 -- voice_pool_b.py에 먼저 등록할 것."
        )
    pool = VOICE_POOL_B[target_lang][b_gender]
    idx = int(scene_id) % len(pool)
    return pool[idx]


def tts_generate_scene_audio(lines, target_lang, b_gender, scene_id, monologue, out_audio_path,
                              tts_credentials, tts_common_dir):
    from pydub import AudioSegment
    tts_config = _load_tts_config(tts_common_dir)

    if target_lang not in tts_config.VOICE_AB:
        raise ValueError(f"target_lang={target_lang!r}이 VOICE_AB에 없음.")
    a_voice = tts_config.VOICE_AB[target_lang]["A"]
    b_voice = None if monologue else _pick_b_voice(target_lang, b_gender, scene_id)
    language_code = tts_config.LANGUAGE_CODE[target_lang]

    client = _get_tts_client(tts_credentials)
    final_audio = AudioSegment.empty()
    timings = []

    for i, text in enumerate(lines):
        voice_name = a_voice if (monologue or i % 2 == 0) else b_voice
        segment = _synthesize_sentence(client, text, voice_name, language_code)
        start_ms = len(final_audio)
        final_audio += segment
        end_ms = len(final_audio)
        timings.append((start_ms, end_ms))

        is_last = (i == len(lines) - 1)
        gap_ms = SCENE_END_GAP_MS if is_last else SENTENCE_GAP_MS
        final_audio += AudioSegment.silent(duration=gap_ms)

    out_audio_path = Path(out_audio_path)
    out_audio_path.parent.mkdir(parents=True, exist_ok=True)
    final_audio.export(out_audio_path, format="mp3")
    return timings


# ---------------------------------------------------------------------------
# 6) 나머지 6개 언어 번역 + 평가/재검수 루프 (씬 단위, shorts_pipeline 로직 재사용)
# ---------------------------------------------------------------------------

def build_scene_runtime_json(episode_id, scene_id, target_lang, title, translations, monologue=False, kr_override=None):
    lang_keys = ["target"] + ALL_LANGS
    title_obj = {"target": title}
    for lang in ALL_LANGS:
        title_obj[lang] = title if lang == target_lang else translations[lang]["title"]

    line_count = len(translations[target_lang]["lines"])
    lines = []
    for i in range(line_count):
        speaker = "A" if (monologue or i % 2 == 0) else "B"
        sentences = {"target": translations[target_lang]["lines"][i]}
        for lang in ALL_LANGS:
            if lang == "kr" and kr_override:
                sentences["kr"] = kr_override["lines"][i]
            else:
                sentences[lang] = translations[lang]["lines"][i]
        lines.append({"speaker": speaker, "sentences": sentences})

    return {
        "meta": {"series": "story_longform", "id": f"{episode_id}_{scene_id}"},
        "title": title_obj,
        "blocks": [{"set_id": scene_id, "lines": lines}],
    }


def evaluate(runtime_json, target_lang, prompts_dir, model, api_key):
    prompt_text = load_eval_prompt_text(prompts_dir, target_lang)
    user_input = json.dumps(runtime_json, ensure_ascii=False, indent=2)
    last_error = None
    for attempt in range(1, RETRY_LIMIT + 1):
        raw = call_deepseek(prompt_text, user_input, model, api_key)
        try:
            result, _s, _e = extract_first_json_object(raw)
            return result
        except Exception as e:
            last_error = e
    raise ValueError(f"평가 호출: {RETRY_LIMIT}회 모두 실패: {last_error}")


def is_pass(eval_result):
    if eval_result.get("final_score", 0) < PASS_SCORE_THRESHOLD:
        return False
    for domain in eval_result.get("domain_scores", {}).values():
        if domain.get("score", 0) < 6:
            return False
    if eval_result.get("blocking_issues"):
        return False
    return True


def apply_replacements(runtime_json, replacements_result):
    title_repl = replacements_result.get("TITLE_REPLACEMENTS", {})
    for lang, new_title in title_repl.items():
        runtime_json["title"][lang] = new_title
    line_repl = replacements_result.get("REPLACEMENTS", {})
    lines_by_set = {b["set_id"]: b["lines"] for b in runtime_json["blocks"]}
    for (set_id, line_no, lang), new_text in line_repl.items():
        lines_by_set[set_id][line_no - 1]["sentences"][lang] = new_text


def eval_and_patch_loop(episode_id, scene_id, target_lang, runtime_json, prompts_dir, model, api_key):
    for attempt in range(1, RETRY_LIMIT + 1):
        eval_result = evaluate(runtime_json, target_lang, prompts_dir, model, api_key)
        if is_pass(eval_result):
            return True, runtime_json, eval_result
        reviewer_prompt = load_reviewer_prompt_text(prompts_dir, target_lang)
        reeval_block = (
            f"target={target_lang} batch_id={episode_id}_{scene_id}\n\n"
            f"[채점 결과]\n{json.dumps(eval_result, ensure_ascii=False, indent=2)}\n\n"
            f"[원본 JSON]\n{json.dumps(runtime_json, ensure_ascii=False, indent=2)}"
        )
        raw = call_deepseek(reviewer_prompt, reeval_block, model, api_key)
        try:
            patch = extract_python_dict_literal(raw)
        except ValueError:
            continue
        apply_replacements(runtime_json, patch)
    final_eval = evaluate(runtime_json, target_lang, prompts_dir, model, api_key)
    return False, runtime_json, final_eval


def process_scene_translations_and_qa(episode_id, level, scene_id, target_lang, title, lines,
                                       monologue, kr_override, prompts_dir, model, api_key, workers=6):
    langs_to_translate = [l for l in ALL_LANGS if l != target_lang and l != "kr"]
    translations = {target_lang: {"title": title, "lines": lines}}
    if kr_override:
        translations["kr"] = kr_override

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(
                translate_scene_one_lang, episode_id, level, target_lang, scene_id,
                title, lines, lang, monologue, prompts_dir, model, api_key
            ): lang
            for lang in langs_to_translate
        }
        for future in as_completed(futures):
            lang = futures[future]
            _lang, lang_title, lang_lines = future.result()
            translations[lang] = {"title": lang_title, "lines": lang_lines}

    runtime_json = build_scene_runtime_json(episode_id, scene_id, target_lang, title, translations, monologue=monologue)
    passed, runtime_json, eval_result = eval_and_patch_loop(
        episode_id, scene_id, target_lang, runtime_json, prompts_dir, model, api_key
    )
    return passed, runtime_json, eval_result


# ---------------------------------------------------------------------------
# 7) SRT + 저장
# ---------------------------------------------------------------------------

def format_srt_timestamp(ms):
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def build_srt(lines, timings):
    out = []
    for i, (text, (start, end)) in enumerate(zip(lines, timings), start=1):
        out.append(str(i))
        out.append(f"{format_srt_timestamp(start)} --> {format_srt_timestamp(end)}")
        out.append(text)
        out.append("")
    return "\n".join(out)


def build_all_srts_for_scene(runtime_json, timings):
    lines_by_lang = {lang: [] for lang in ["target"] + ALL_LANGS}
    for line in runtime_json["blocks"][0]["lines"]:
        for lang, text in line["sentences"].items():
            lines_by_lang[lang].append(text)
    return {lang: build_srt(lines, timings) for lang, lines in lines_by_lang.items()}


def episode_dir(output_root, target_lang, episode_dir_name):
    return Path(output_root) / target_lang / episode_dir_name


def save_scene_outputs(episode_dir_path, scene_id, runtime_json, srts, eval_result, passed, audio_path):
    scene_dir = episode_dir_path / "scenes" / scene_id
    scene_dir.mkdir(parents=True, exist_ok=True)

    audio_path = Path(audio_path)
    if audio_path.exists() and audio_path.parent != scene_dir:
        audio_path.rename(scene_dir / audio_path.name)

    (scene_dir / f"{scene_id}.json").write_text(
        json.dumps(runtime_json, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (scene_dir / f"{scene_id}.eval.json").write_text(
        json.dumps(eval_result, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    for lang, srt_text in srts.items():
        (scene_dir / f"{scene_id}.{lang}.srt").write_text(srt_text, encoding="utf-8")

    status = "PASS" if passed else "NEEDS_REVIEW"
    print(f"  [씬 {scene_id} 저장] {scene_dir}/ ({status})")


def save_episode_json(episode_dir_path, episode_id, situation, level, target_lang, scene_plan, scenes_meta):
    episode_json = {
        "episode_id": episode_id,
        "situation": situation,
        "level": level,
        "target_lang": target_lang,
        "scene_plan": scene_plan["scene_plan"],
        "scenes": scenes_meta,
    }
    episode_dir_path.mkdir(parents=True, exist_ok=True)
    (episode_dir_path / "episode.json").write_text(
        json.dumps(episode_json, ensure_ascii=False, indent=2), encoding="utf-8"
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="ManyLangs story/longform 20씬 파이프라인")
    parser.add_argument("--prompts-dir",
                         default="/Users/junghasuk/Desktop/ManyLangs/web/youtube/story/longform/prompts")
    parser.add_argument("--output-root",
                         default="/Users/junghasuk/Desktop/ManyLangs/web/youtube/story/longform")
    parser.add_argument("--model", default="deepseek-chat")
    parser.add_argument("--tts-creds", default=DEFAULT_TTS_CREDENTIALS)
    parser.add_argument("--tts-common-dir", default=DEFAULT_TTS_COMMON_DIR)
    args = parser.parse_args()

    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        print("[오류] DEEPSEEK_API_KEY 환경변수가 없습니다.", file=sys.stderr)
        sys.exit(1)

    # 1) 입력
    situation, level, target_lang = prompt_inputs()
    episode_id = compute_episode_dir_name(level, situation)
    ep_dir = episode_dir(args.output_root, target_lang, episode_id)

    # 2~3) 기획 생성 + 한국어 확인
    scene_plan = generate_scene_plan(situation, level, episode_id, args.prompts_dir, args.model, api_key)
    scene_plan = confirm_plan_in_korean(scene_plan, ep_dir / "plan.json")

    # 4) target 씬 순차 생성 (연속성)
    scenes = generate_all_scenes_sequential(
        episode_id, target_lang, level, scene_plan, args.prompts_dir, args.model, api_key
    )

    # 5) kr 우선 번역 -> 한국어 최종 확인
    kr_by_scene = translate_all_scenes_kr_first(
        episode_id, level, target_lang, scenes, args.prompts_dir, args.model, api_key
    )
    confirm_kr_story(kr_by_scene, ep_dir / f"{episode_id}.kr_review.txt")

    # 6~8) 씬별 TTS + 나머지 언어 번역/QA + 저장
    scenes_meta = {}
    for spec in scene_plan["scene_plan"]:
        scene_id = spec["scene_id"]
        s = scenes[scene_id]
        kr_override = kr_by_scene.get(scene_id)

        audio_path = ep_dir / "scenes" / scene_id / f"{scene_id}.mp3"
        timings = tts_generate_scene_audio(
            s["lines"], target_lang, s["b_gender"], scene_id, s.get("monologue", False), audio_path,
            args.tts_creds, args.tts_common_dir
        )

        passed, runtime_json, eval_result = process_scene_translations_and_qa(
            episode_id, level, scene_id, target_lang, s["title"], s["lines"],
            s.get("monologue", False), kr_override, args.prompts_dir, args.model, api_key
        )
        srts = build_all_srts_for_scene(runtime_json, timings)
        save_scene_outputs(ep_dir, scene_id, runtime_json, srts, eval_result, passed, audio_path)

        scenes_meta[scene_id] = {"title": s["title"], "b_gender": s["b_gender"], "passed": passed}

    save_episode_json(ep_dir, episode_id, situation, level, target_lang, scene_plan, scenes_meta)
    print(f"\n[에피소드 완료] {ep_dir}/")
    print("다음 단계: scripts/assemble_video_lf.py로 20씬 합본 조립.")


if __name__ == "__main__":
    main()
