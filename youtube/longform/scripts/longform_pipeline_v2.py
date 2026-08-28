#!/usr/bin/env python3

import argparse
import json
import os
import re
import sys
from pathlib import Path

import requests

DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_PROMPTS_DIR = BASE_DIR / "prompts"
DEFAULT_SCHEMAS_DIR = BASE_DIR / "schemas"
DEFAULT_SERIES_ROOT = BASE_DIR / "series"

MODEL_DEFAULT = "deepseek-chat"


def load_text(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(path)
    return path.read_text(encoding="utf-8")


def load_json(path: Path):
    if not path.exists():
        raise FileNotFoundError(path)
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8"
    )


def extract_first_json_value(text: str):
    text = text.strip()

    try:
        return json.loads(text)
    except Exception:
        pass

    starts = []

    obj_pos = text.find("{")
    arr_pos = text.find("[")

    if obj_pos != -1:
        starts.append((obj_pos, "{", "}"))
    if arr_pos != -1:
        starts.append((arr_pos, "[", "]"))

    if not starts:
        raise ValueError("DeepSeek 응답에서 JSON 시작 문자를 찾지 못함")

    starts.sort(key=lambda x: x[0])
    start, opener, closer = starts[0]

    depth = 0
    in_string = False
    escape = False

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
            continue

        if ch == opener:
            depth += 1
        elif ch == closer:
            depth -= 1
            if depth == 0:
                return json.loads(text[start:i + 1])

    raise ValueError("DeepSeek 응답의 JSON이 닫히지 않음")


def call_deepseek(system_prompt: str, user_payload, model: str, api_key: str):
    if isinstance(user_payload, str):
        user_text = user_payload
    else:
        user_text = json.dumps(user_payload, ensure_ascii=False, indent=2)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": user_text,
            },
        ],
        "temperature": 0.3,
        "max_tokens": 16000,
    }

    response = requests.post(
        DEEPSEEK_URL,
        headers=headers,
        json=payload,
        timeout=180,
    )
    response.raise_for_status()

    return response.json()["choices"][0]["message"]["content"]


def validate_json(instance, schema_path: Path):
    try:
        import jsonschema
        from referencing import Registry, Resource
    except ImportError as e:
        raise RuntimeError(
            "jsonschema/referencing 패키지가 필요합니다. "
            "python3 -m pip install jsonschema referencing"
        ) from e

    schema = load_json(schema_path)

    registry = Registry()

    for local_path in sorted(schema_path.parent.glob("*.schema.json")):
        local_schema = load_json(local_path)

        resource = Resource.from_contents(local_schema)

        schema_id = local_schema.get("$id")
        if schema_id:
            registry = registry.with_resource(
                schema_id,
                resource,
            )

        registry = registry.with_resource(
            local_path.name,
            resource,
        )

    validator_cls = jsonschema.validators.validator_for(schema)
    validator_cls.check_schema(schema)

    validator = validator_cls(
        schema,
        registry=registry,
    )

    errors = sorted(
        validator.iter_errors(instance),
        key=lambda e: list(e.absolute_path)
    )

    if errors:
        lines = []
        for err in errors[:20]:
            where = ".".join(str(x) for x in err.absolute_path)
            if not where:
                where = "<root>"
            lines.append(f"{where}: {err.message}")

        raise ValueError(
            f"Schema validation 실패: {schema_path.name}\n"
            + "\n".join(lines)
        )

def generate_with_schema(
    *,
    label,
    prompt_path,
    user_payload,
    schema_path,
    model,
    api_key,
    debug_dir,
):
    print(f"\n[{label}] DeepSeek 호출 중...")

    raw = call_deepseek(
        load_text(prompt_path),
        user_payload,
        model,
        api_key,
    )

    debug_dir.mkdir(parents=True, exist_ok=True)

    raw_path = debug_dir / f"{label.lower()}_raw.txt"
    raw_path.write_text(raw, encoding="utf-8")

    try:
        data = extract_first_json_value(raw)
        validate_json(data, schema_path)
    except Exception:
        print(f"[오류] 원문 저장: {raw_path}", file=sys.stderr)
        raise

    print(f"[PASS] {label}: {schema_path.name}")
    return data



def slugify_identifier(value: str) -> str:
    value = value.strip().lower()

    value = re.sub(r"[^a-z0-9]+", "_", value)
    value = re.sub(r"_+", "_", value)
    value = value.strip("_")

    if not value:
        raise ValueError(
            f"ID로 변환할 수 없는 값입니다: {value!r}"
        )

    return value


def build_system_ids(args):
    category_id = slugify_identifier(args.category)

    if args.series_id:
        series_id = slugify_identifier(args.series_id)
    else:
        series_basis = args.setting or args.topic
        series_id = (
            category_id
            + "_"
            + slugify_identifier(series_basis)
        )

    episode_id = (
        f"{series_id}_ep{args.episode_number:03d}"
    )

    if args.protagonist_name:
        protagonist_name = slugify_identifier(
            args.protagonist_name
        ).upper()
    else:
        protagonist_name = "PROTAGONIST"

    protagonist_id = (
        f"CHAR_{protagonist_name}_001"
    )

    return {
        "category_id": category_id,
        "series_id": series_id,
        "episode_id": episode_id,
        "protagonist_id": protagonist_id,
    }


def make_content_request(args):
    request = {
        "metadata": {
            "schema_version": "2.0",
            "content_version": "1.0",
            "revision": 1
        },
        "category": args.category,
        "genre": args.genre,
        "topic": args.topic,
        "target_language": args.target_lang,
        "cefr_level": args.level,
        "episode": {
            "episode_number": args.episode_number,
            "scene_count": 20
        },
        "tone": args.tone,
        "setting": args.setting,
        "protagonist_preferences": {
            "gender": args.protagonist_gender,
            "name": args.protagonist_name
        },
        "reality_context": {
            "reference_date": "2026-08"
        }
    }

    return request


def initialize_continuity_state(series_id, episode_id, protagonist_ref):
    return {
        "metadata": {
            "schema_version": "2.0",
            "content_version": "1.0",
            "revision": 1
        },
        "series_id": series_id,
        "current_episode_id": episode_id,
        "protagonist_ref": protagonist_ref,
        "protagonist_state": {
            "current_emotion": "neutral",
            "known_information": [],
            "current_goals": []
        },
        "story_facts": [],
        "unresolved_threads": [],
        "relationship_states": [],
        "inventory_state": [],
        "location_state": {
            "current_location_ref": None,
            "previous_location_ref": None
        }
    }


def initialize_learning_history(series_id, target_language, cefr_level):
    return {
        "metadata": {
            "schema_version": "2.0",
            "content_version": "1.0",
            "revision": 1
        },
        "series_id": series_id,
        "target_language": target_language,
        "cefr_level": cefr_level,
        "expressions": []
    }


def save_series_builder_outputs(series_root: Path, builder):
    bible = builder["series_bible"]
    episode = builder["episode"]
    protagonist = builder["protagonist"]
    locations = builder["locations"]

    series_id = bible["series_id"]
    episode_number = episode["episode_number"]

    series_dir = series_root / series_id
    episode_dir = series_dir / f"episode_{episode_number:03d}"

    save_json(series_dir / "series_bible.json", bible)

    save_json(
        series_dir / "characters" / f'{protagonist["character_id"]}.json',
        protagonist,
    )

    for location in locations:
        save_json(
            series_dir / "locations" / f'{location["location_id"]}.json',
            location,
        )

    save_json(
        episode_dir / "episode.json",
        episode,
    )

    return series_dir, episode_dir


def generate_bootstrap(
    content_request,
    system_ids,
    prompts_dir,
    schemas_dir,
    model,
    api_key,
    debug_dir,
):
    payload = {
        "CONTENT_REQUEST": content_request,
        "SYSTEM_IDS": system_ids,
        "LANGUAGE_CONFIG": load_json(BASE_DIR / "config" / "languages.json"),
        "OUTPUT_SCHEMA_SUMMARY": load_json(
            schemas_dir / "series_bootstrap.schema.json"
        ),
    }

    bootstrap = generate_with_schema(
        label="SERIES_BOOTSTRAP",
        prompt_path=prompts_dir / "20_SERIES_BOOTSTRAP.md",
        user_payload=payload,
        schema_path=schemas_dir / "series_bootstrap.schema.json",
        model=model,
        api_key=api_key,
        debug_dir=debug_dir,
    )

    # ------------------------------------------------------------
    # SYSTEM CANONICAL ID LOCK
    # IDs are system contracts, not creative AI output.
    # ------------------------------------------------------------
    bootstrap["category_id"] = system_ids["category_id"]
    bootstrap["series_id"] = system_ids["series_id"]
    bootstrap["episode_id"] = system_ids["episode_id"]
    bootstrap["protagonist_design"]["character_id"] = (
        system_ids["protagonist_id"]
    )

    # ------------------------------------------------------------
    # SYSTEM CANONICAL REALITY CONTEXT LOCK
    # Reality context comes from CONTENT_REQUEST, not AI invention.
    # ------------------------------------------------------------

    reality_context = content_request["reality_context"]

    bootstrap["reality_context"] = {
        "reference_date": reality_context["reference_date"],
        "location_context": content_request["setting"],
    }

    validate_json(
        bootstrap,
        schemas_dir / "series_bootstrap.schema.json",
    )

    return bootstrap


def generate_series_objects(
    content_request,
    bootstrap,
    prompts_dir,
    schemas_dir,
    model,
    api_key,
    debug_dir,
):
    payload = {
        "CONTENT_REQUEST": content_request,
        "SERIES_BOOTSTRAP": bootstrap,
        "SERIES_BIBLE_SCHEMA": load_json(
            schemas_dir / "series_bible.schema.json"
        ),
        "EPISODE_SCHEMA": load_json(
            schemas_dir / "episode.schema.json"
        ),
        "CHARACTER_SCHEMA": load_json(
            schemas_dir / "character.schema.json"
        ),
        "LOCATION_SCHEMA": load_json(
            schemas_dir / "location.schema.json"
        ),
    }

    print("\n[SERIES_BUILDER] DeepSeek 호출 중...")

    raw = call_deepseek(
        load_text(prompts_dir / "21_SERIES_BUILDER.md"),
        payload,
        model,
        api_key,
    )

    debug_dir.mkdir(parents=True, exist_ok=True)
    raw_path = debug_dir / "series_builder_raw.txt"
    raw_path.write_text(raw, encoding="utf-8")

    try:
        result = extract_first_json_value(raw)

        for key in [
            "series_bible",
            "episode",
            "protagonist",
            "locations",
        ]:
            if key not in result:
                raise ValueError(f"SERIES_BUILDER 출력에 {key} 누락")

        # ------------------------------------------------------------
        # SYSTEM CANONICAL FIELD LOCK
        # IDs / language / CEFR / protagonist identity are contracts,
        # not creative AI output. Re-apply upstream Source of Truth
        # before schema validation.
        # ------------------------------------------------------------

        result["series_bible"]["series_id"] = bootstrap["series_id"]
        result["series_bible"]["category_id"] = bootstrap["category_id"]

        result["episode"]["series_id"] = bootstrap["series_id"]
        result["episode"]["episode_id"] = bootstrap["episode_id"]
        result["episode"]["episode_number"] = (
            bootstrap["episode_direction"]["episode_number"]
        )

        result["episode"]["language_context"]["target_language"] = (
            bootstrap["episode_direction"]["target_language"]
        )
        result["episode"]["language_context"]["cefr_level"] = (
            bootstrap["episode_direction"]["cefr_level"]
        )

        # ------------------------------------------------------------
        # SYSTEM CANONICAL EPISODE REALITY CONTRACT LOCK
        # Reality constraints come from canonical Bootstrap context.
        # AI may use these facts, but may not redefine them.
        # ------------------------------------------------------------

        reality_context = bootstrap["reality_context"]

        result["episode"]["reality_contract"] = {
            "mode": "real_world",
            "reference_date": reality_context["reference_date"],
            "location_context": reality_context["location_context"],
            "rules": {
                "do_not_invent_operational_facts": True,
                "do_not_invent_prices": True,
                "do_not_invent_routes": True,
                "do_not_invent_payment_methods": True,
                "do_not_invent_schedules": True,
                "do_not_invent_named_services": True,
            },
            "uncertain_fact_policy": "generalize_or_flag",
        }

        result["protagonist"]["series_id"] = bootstrap["series_id"]
        result["protagonist"]["character_id"] = (
            bootstrap["protagonist_design"]["character_id"]
        )
        result["protagonist"]["identity"]["gender"] = (
            bootstrap["protagonist_design"]["gender"]
        )

        for location in result["locations"]:
            location["series_id"] = bootstrap["series_id"]

        validate_json(
            result["series_bible"],
            schemas_dir / "series_bible.schema.json",
        )

        validate_json(
            result["episode"],
            schemas_dir / "episode.schema.json",
        )

        validate_json(
            result["protagonist"],
            schemas_dir / "character.schema.json",
        )

        if not isinstance(result["locations"], list):
            raise ValueError("locations가 list가 아님")

        if not result["locations"]:
            raise ValueError("locations가 비어 있음")

        for location in result["locations"]:
            validate_json(
                location,
                schemas_dir / "location.schema.json",
            )

    except Exception:
        print(f"[오류] 원문 저장: {raw_path}", file=sys.stderr)
        raise

    print("[PASS] SERIES_BUILDER: all canonical objects")
    return result


def generate_scene_plan(
    *,
    builder,
    continuity_state,
    learning_history,
    prompts_dir,
    schemas_dir,
    model,
    api_key,
    debug_dir,
):
    payload = {
        "SERIES_BIBLE": builder["series_bible"],
        "EPISODE": builder["episode"],
        "PROTAGONIST": builder["protagonist"],
        "AVAILABLE_LOCATIONS": builder["locations"],
        "CONTINUITY_STATE": continuity_state,
        "LEARNING_HISTORY": learning_history,
        "OUTPUT_SCHEMA_SUMMARY": load_json(
            schemas_dir / "scene_plan.schema.json"
        ),
    }

    return generate_with_schema(
        label="SCENE_PLAN",
        prompt_path=prompts_dir / "31_MASTER_SCRIPT_PLANNER.md",
        user_payload=payload,
        schema_path=schemas_dir / "scene_plan.schema.json",
        model=model,
        api_key=api_key,
        debug_dir=debug_dir,
    )


def generate_master_script(
    *,
    builder,
    scene_plan,
    continuity_state,
    learning_history,
    prompts_dir,
    schemas_dir,
    model,
    api_key,
    debug_dir,
):
    payload = {
        "SERIES_BIBLE": builder["series_bible"],
        "EPISODE": builder["episode"],
        "PROTAGONIST": builder["protagonist"],
        "AVAILABLE_LOCATIONS": builder["locations"],
        "SCENE_PLAN": scene_plan,
        "CONTINUITY_STATE": continuity_state,
        "LEARNING_HISTORY": learning_history,
        "OUTPUT_SCHEMA_SUMMARY": load_json(
            schemas_dir / "master_script.schema.json"
        ),
    }

    return generate_with_schema(
        label="MASTER_SCRIPT",
        prompt_path=prompts_dir / "32_MASTER_SCRIPT_WRITER.md",
        user_payload=payload,
        schema_path=schemas_dir / "master_script.schema.json",
        model=model,
        api_key=api_key,
        debug_dir=debug_dir,
    )



def generate_master_script_reality_validation(
    *,
    builder,
    scene_plan,
    master_script,
    prompts_dir,
    schemas_dir,
    model,
    api_key,
    debug_dir,
):
    payload = {
        "SERIES_BIBLE": builder["series_bible"],
        "EPISODE": builder["episode"],
        "PROTAGONIST": builder["protagonist"],
        "AVAILABLE_LOCATIONS": builder["locations"],
        "SCENE_PLAN": scene_plan,
        "MASTER_SCRIPT": master_script,
        "OUTPUT_SCHEMA_SUMMARY": load_json(
            schemas_dir /
            "master_script_reality_validation.schema.json"
        ),
    }

    print(
        "\n[MASTER REALITY VALIDATION] "
        "DeepSeek 호출 중..."
    )

    raw = call_deepseek(
        load_text(
            prompts_dir /
            "37_MASTER_SCRIPT_REALITY_VALIDATOR.md"
        ),
        payload,
        model,
        api_key,
    )

    debug_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    raw_path = (
        debug_dir /
        "master_script_reality_validation_raw.txt"
    )

    raw_path.write_text(
        raw,
        encoding="utf-8",
    )

    try:
        result = extract_first_json_value(raw)

        # ------------------------------------------------------------
        # SYSTEM CANONICAL MASTER REALITY VALIDATION LOCK
        # ------------------------------------------------------------

        result["episode_id"] = (
            builder["episode"]["episode_id"]
        )

        validate_json(
            result,
            schemas_dir /
            "master_script_reality_validation.schema.json",
        )

        scene_checks = result.get("scene_checks", [])

        if len(scene_checks) != 20:
            raise ValueError(
                "Master reality validation scene count mismatch: "
                f"expected=20 actual={len(scene_checks)}"
            )

        actual_ids = [
            item.get("scene_id")
            for item in scene_checks
        ]

        expected_ids = [
            f"S{i:03d}"
            for i in range(1, 21)
        ]

        if actual_ids != expected_ids:
            raise ValueError(
                "Master reality validation scene_id sequence mismatch"
            )

        fail_issues = [
            issue
            for issue in result.get("issues", [])
            if issue.get("severity") == "fail"
        ]

        if (
            fail_issues
            and result.get("overall_pass") is True
        ):
            raise ValueError(
                "Master reality validation contradiction: "
                "fail issue exists but overall_pass=true"
            )

        if (
            result.get("severity") == "fail"
            and result.get("overall_pass") is True
        ):
            raise ValueError(
                "Master reality validation contradiction: "
                "severity=fail but overall_pass=true"
            )

    except Exception:
        print(
            "[오류] Master Reality Validator 원문 저장: "
            f"{raw_path}",
            file=sys.stderr,
        )
        raise

    print(
        "[PASS] MASTER REALITY VALIDATION: "
        f'severity={result["severity"]}, '
        f'overall_pass={result["overall_pass"]}'
    )

    return result


def generate_dialogue(
    *,
    builder,
    master_script_scene,
    prior_dialogue_context,
    prompts_dir,
    schemas_dir,
    model,
    api_key,
    debug_dir,
):
    episode = builder["episode"]

    location_ref = master_script_scene["location_ref"]

    location = next(
        (
            item
            for item in builder["locations"]
            if item["location_id"] == location_ref
        ),
        None,
    )

    if location is None:
        raise ValueError(
            f"Dialogue location not found: {location_ref}"
        )

    payload = {
        "SERIES_BIBLE": builder["series_bible"],
        "EPISODE": episode,
        "PROTAGONIST": builder["protagonist"],
        "LOCATION": location,
        "MASTER_SCRIPT_SCENE": master_script_scene,
        "PRIOR_DIALOGUE_CONTEXT": prior_dialogue_context,
        "TARGET_LANGUAGE": (
            episode["language_context"]["target_language"]
        ),
        "CEFR_LEVEL": (
            episode["language_context"]["cefr_level"]
        ),
        "OUTPUT_SCHEMA_SUMMARY": load_json(
            schemas_dir / "dialogue.schema.json"
        ),
    }

    scene_id = master_script_scene["scene_id"]

    print(f"\n[DIALOGUE {scene_id}] DeepSeek 호출 중...")

    debug_dir.mkdir(parents=True, exist_ok=True)

    max_attempts = 3
    last_error = None

    for attempt in range(1, max_attempts + 1):
        retry_payload = dict(payload)

        retry_payload["CANONICAL_LINE_COUNT"] = (
            master_script_scene["line_count"]
        )

        if last_error is not None:
            retry_payload["RETRY_INSTRUCTION"] = {
                "attempt": attempt,
                "previous_error": str(last_error),
                "instruction": (
                    "Regenerate the complete Dialogue JSON. "
                    "The lines array MUST contain exactly "
                    f'{master_script_scene["line_count"]} lines. '
                    "Do not simply truncate the previous answer. "
                    "Compress naturally while preserving all "
                    "must_happen, must_not_happen, continuity, "
                    "dialogue_goal, speaker rules, CEFR level, "
                    "and Reality Contract."
                ),
            }

        print(
            f"[DIALOGUE {scene_id}] "
            f"attempt {attempt}/{max_attempts}"
        )

        raw = call_deepseek(
            load_text(prompts_dir / "33_DIALOGUE_WRITER.md"),
            retry_payload,
            model,
            api_key,
        )

        raw_path = (
            debug_dir
            / f"dialogue_{scene_id}_attempt_{attempt}_raw.txt"
        )
        raw_path.write_text(raw, encoding="utf-8")

        try:
            result = extract_first_json_value(raw)

            # ------------------------------------------------------------
            # SYSTEM CANONICAL DIALOGUE LOCK
            # Structural values come from the canonical upstream objects.
            # ------------------------------------------------------------

            result["episode_id"] = episode["episode_id"]
            result["scene_id"] = scene_id

            result["target_language"] = (
                episode["language_context"]["target_language"]
            )

            result["cefr_level"] = (
                episode["language_context"]["cefr_level"]
            )

            result["protagonist_ref"] = (
                builder["protagonist"]["character_id"]
            )

            if master_script_scene["monologue"]:
                result["mode"] = "monologue"
                result["b_gender"] = None
            else:
                result["mode"] = "dialogue"
                result["b_gender"] = master_script_scene["b_gender"]

            expected_count = master_script_scene["line_count"]

            if "validation" not in result:
                result["validation"] = {}

            result["validation"]["expected_line_count"] = expected_count

            actual_count = len(result.get("lines", []))

            result["validation"]["actual_line_count"] = actual_count

            if actual_count != expected_count:
                raise ValueError(
                    f"{scene_id}: line count mismatch: "
                    f"expected={expected_count}, actual={actual_count}"
                )

            if "scene_state" not in result:
                raise ValueError(
                    f"{scene_id}: scene_state missing"
                )

            # ------------------------------------------------------------
            # SYSTEM CANONICAL SCENE STATE LOCK
            # Narrative continuity belongs to Master Script.
            # Dialogue Writer may express it, but may not redefine it.
            # ------------------------------------------------------------

            master_continuity = master_script_scene["continuity"]

            result["scene_state"]["location_ref"] = location_ref
            result["scene_state"]["carry_in"] = list(
                master_continuity["carry_in"]
            )
            result["scene_state"]["carry_out"] = list(
                master_continuity["carry_out"]
            )

            validate_json(
                result,
                schemas_dir / "dialogue.schema.json",
            )

        except Exception as exc:
            last_error = exc

            print(
                f"[RETRY] DIALOGUE {scene_id} "
                f"attempt {attempt}/{max_attempts} failed: {exc}",
                file=sys.stderr,
            )

            print(
                f"[오류] Dialogue 원문 저장: {raw_path}",
                file=sys.stderr,
            )

            if attempt == max_attempts:
                raise

            continue

        print(
            f"[PASS] DIALOGUE {scene_id} "
            f"attempt {attempt}/{max_attempts}"
        )

        return result

    raise RuntimeError(
        f"{scene_id}: dialogue generation exhausted retries"
    )



def generate_learning(
    *,
    builder,
    master_script_scene,
    dialogue,
    learning_history,
    prompts_dir,
    schemas_dir,
    model,
    api_key,
    debug_dir,
):
    payload = {
        "EPISODE": builder["episode"],
        "MASTER_SCRIPT_SCENE": master_script_scene,
        "DIALOGUE": dialogue,
        "TARGET_LANGUAGE": dialogue["target_language"],
        "CEFR_LEVEL": dialogue["cefr_level"],
        "LEARNING_HISTORY": learning_history,
        "LANGUAGE_POLICY": {
            "target_language": dialogue["target_language"],
            "cefr_level": dialogue["cefr_level"],
        },
        "OUTPUT_SCHEMA_SUMMARY": load_json(
            schemas_dir / "learning.schema.json"
        ),
    }

    return generate_with_schema(
        label=f'LEARNING_{dialogue["scene_id"]}',
        prompt_path=prompts_dir / "35_LEARNING_WRITER.md",
        user_payload=payload,
        schema_path=schemas_dir / "learning.schema.json",
        model=model,
        api_key=api_key,
        debug_dir=debug_dir,
    )


def generate_dialogue_semantic_validation(
    *,
    builder,
    master_script_scene,
    dialogue,
    prior_dialogue_context,
    prompts_dir,
    schemas_dir,
    model,
    api_key,
    debug_dir,
):
    location_ref = master_script_scene["location_ref"]

    location = next(
        (
            item
            for item in builder["locations"]
            if item["location_id"] == location_ref
        ),
        None,
    )

    if location is None:
        raise ValueError(
            f"Semantic validator location not found: {location_ref}"
        )

    scene_id = master_script_scene["scene_id"]

    payload = {
        "SERIES_BIBLE": builder["series_bible"],
        "EPISODE": builder["episode"],
        "PROTAGONIST": builder["protagonist"],
        "LOCATION": location,
        "MASTER_SCRIPT_SCENE": master_script_scene,
        "DIALOGUE": dialogue,
        "PRIOR_DIALOGUE_CONTEXT": prior_dialogue_context,
        "OUTPUT_SCHEMA_SUMMARY": load_json(
            schemas_dir /
            "dialogue_semantic_validation.schema.json"
        ),
    }

    print(
        f"\n[SEMANTIC VALIDATION {scene_id}] "
        "DeepSeek 호출 중..."
    )

    raw = call_deepseek(
        load_text(
            prompts_dir /
            "36_DIALOGUE_SEMANTIC_VALIDATOR.md"
        ),
        payload,
        model,
        api_key,
    )

    debug_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    raw_path = (
        debug_dir /
        f"dialogue_semantic_{scene_id}_raw.txt"
    )

    raw_path.write_text(
        raw,
        encoding="utf-8",
    )

    try:
        result = extract_first_json_value(raw)

        # ------------------------------------------------------------
        # SYSTEM CANONICAL SEMANTIC VALIDATION LOCK
        # ------------------------------------------------------------

        result["episode_id"] = (
            builder["episode"]["episode_id"]
        )

        result["scene_id"] = scene_id

        validate_json(
            result,
            schemas_dir /
            "dialogue_semantic_validation.schema.json",
        )

        issue_severities = [
            issue.get("severity")
            for issue in result.get("issues", [])
        ]

        has_fail = "fail" in issue_severities

        if has_fail and result.get("overall_pass") is True:
            raise ValueError(
                f"{scene_id}: semantic result contradiction: "
                "fail issue exists but overall_pass=true"
            )

        if (
            result.get("severity") == "fail"
            and result.get("overall_pass") is True
        ):
            raise ValueError(
                f"{scene_id}: severity=fail but overall_pass=true"
            )

    except Exception:
        print(
            f"[오류] Semantic Validator 원문 저장: {raw_path}",
            file=sys.stderr,
        )
        raise

    print(
        f"[PASS] SEMANTIC VALIDATION {scene_id}: "
        f'severity={result["severity"]}, '
        f'overall_pass={result["overall_pass"]}'
    )

    return result



def generate_episode_final_validation(
    *,
    builder,
    scene_plan,
    master_script,
    master_reality_validation,
    dialogues,
    dialogue_semantic_validations,
    prompts_dir,
    schemas_dir,
    model,
    api_key,
    debug_dir,
):
    payload = {
        "SERIES_BIBLE": builder["series_bible"],
        "EPISODE": builder["episode"],
        "PROTAGONIST": builder["protagonist"],
        "AVAILABLE_LOCATIONS": builder["locations"],
        "SCENE_PLAN": scene_plan,
        "MASTER_SCRIPT": master_script,
        "MASTER_SCRIPT_REALITY_VALIDATION": (
            master_reality_validation
        ),
        "DIALOGUES": dialogues,
        "DIALOGUE_SEMANTIC_VALIDATIONS": (
            dialogue_semantic_validations
        ),
        "OUTPUT_SCHEMA_SUMMARY": load_json(
            schemas_dir /
            "episode_final_validation.schema.json"
        ),
    }

    print(
        "\n[EPISODE FINAL VALIDATION] "
        "DeepSeek 호출 중..."
    )

    raw = call_deepseek(
        load_text(
            prompts_dir /
            "38_EPISODE_FINAL_VALIDATOR.md"
        ),
        payload,
        model,
        api_key,
    )

    debug_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    raw_path = (
        debug_dir /
        "episode_final_validation_raw.txt"
    )

    raw_path.write_text(
        raw,
        encoding="utf-8",
    )

    try:
        result = extract_first_json_value(raw)

        # ------------------------------------------------------------
        # SYSTEM CANONICAL EPISODE FINAL VALIDATION LOCK
        # ------------------------------------------------------------

        result["episode_id"] = (
            builder["episode"]["episode_id"]
        )

        validate_json(
            result,
            schemas_dir /
            "episode_final_validation.schema.json",
        )

        scene_checks = result.get("scene_checks", [])

        if len(scene_checks) != 20:
            raise ValueError(
                "Episode final validation scene count mismatch: "
                f"expected=20 actual={len(scene_checks)}"
            )

        expected_ids = [
            f"S{i:03d}"
            for i in range(1, 21)
        ]

        actual_ids = [
            item.get("scene_id")
            for item in scene_checks
        ]

        if actual_ids != expected_ids:
            raise ValueError(
                "Episode final validation scene_id sequence mismatch"
            )

        fail_issues = [
            issue
            for issue in result.get("issues", [])
            if issue.get("severity") == "fail"
        ]

        if (
            fail_issues
            and result.get("overall_pass") is True
        ):
            raise ValueError(
                "Episode final validation contradiction: "
                "fail issue exists but overall_pass=true"
            )

        if (
            result.get("severity") == "fail"
            and result.get("overall_pass") is True
        ):
            raise ValueError(
                "Episode final validation contradiction: "
                "severity=fail but overall_pass=true"
            )

        if (
            master_reality_validation.get("overall_pass")
            is not True
        ):
            raise ValueError(
                "Episode final validation cannot pass because "
                "Master Reality Validation failed"
            )

        failed_semantics = [
            item
            for item in dialogue_semantic_validations
            if item.get("overall_pass") is not True
        ]

        if failed_semantics:
            raise ValueError(
                "Episode final validation cannot pass because "
                f"{len(failed_semantics)} Dialogue Semantic "
                "Validation result(s) failed"
            )

    except Exception:
        print(
            "[오류] Episode Final Validator 원문 저장: "
            f"{raw_path}",
            file=sys.stderr,
        )
        raise

    print(
        "[PASS] EPISODE FINAL VALIDATION: "
        f'severity={result["severity"]}, '
        f'overall_pass={result["overall_pass"]}'
    )

    return result



def generate_production_scene(
    *,
    builder,
    master_script_scene,
    dialogue,
    prior_production_context,
    prompts_dir,
    schemas_dir,
    model,
    api_key,
    debug_dir,
):
    episode = builder["episode"]
    protagonist = builder["protagonist"]

    scene_id = master_script_scene["scene_id"]
    location_ref = master_script_scene["location_ref"]

    location = next(
        (
            item
            for item in builder["locations"]
            if item["location_id"] == location_ref
        ),
        None,
    )

    if location is None:
        raise ValueError(
            f"{scene_id}: Production Scene location not found: "
            f"{location_ref}"
        )

    payload = {
        "SERIES_BIBLE": builder["series_bible"],
        "EPISODE": episode,
        "PROTAGONIST": protagonist,
        "LOCATION": location,
        "MASTER_SCRIPT_SCENE": master_script_scene,
        "DIALOGUE": dialogue,
        "PRIOR_PRODUCTION_CONTEXT": (
            prior_production_context
        ),
        "OUTPUT_SCHEMA_SUMMARY": load_json(
            schemas_dir / "production_scene.schema.json"
        ),
    }

    print(
        f"\n[PRODUCTION SCENE {scene_id}] "
        "DeepSeek 호출 중..."
    )

    raw = call_deepseek(
        load_text(
            prompts_dir /
            "37_VISUAL_PRODUCTION_PLANNER.md"
        ),
        payload,
        model,
        api_key,
    )

    debug_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    raw_path = (
        debug_dir /
        f"production_scene_{scene_id}_raw.txt"
    )

    raw_path.write_text(
        raw,
        encoding="utf-8",
    )

    try:
        result = extract_first_json_value(raw)

        # ------------------------------------------------------------
        # SYSTEM CANONICAL PRODUCTION SCENE LOCK
        # Structural values come from canonical Script Production.
        # ------------------------------------------------------------

        result["episode_id"] = episode["episode_id"]
        result["scene_id"] = scene_id
        result["sequence"] = master_script_scene["sequence"]
        result["location_ref"] = location_ref
        result["protagonist_ref"] = (
            protagonist["character_id"]
        )

        # Production constraints are system-owned.
        result["production_constraints"] = {
            "preserve_character_identity": True,
            "preserve_location_identity": True,
            "preserve_story_continuity": True,
            "allow_new_characters": False,
            "allow_new_locations": False,
        }

        characters = result.get("characters", [])

        protagonist_entries = [
            item
            for item in characters
            if item.get("role") == "protagonist"
        ]

        if len(protagonist_entries) != 1:
            raise ValueError(
                f"{scene_id}: expected exactly 1 protagonist "
                f"in Production Scene, got "
                f"{len(protagonist_entries)}"
            )

        protagonist_entry = protagonist_entries[0]

        if (
            protagonist_entry.get("character_ref")
            != protagonist["character_id"]
        ):
            raise ValueError(
                f"{scene_id}: protagonist character_ref mismatch"
            )

        if (
            protagonist_entry.get("local_character_id")
            is not None
        ):
            raise ValueError(
                f"{scene_id}: protagonist "
                "local_character_id must be null"
            )

        if (
            protagonist_entry.get("gender")
            != protagonist["identity"]["gender"]
        ):
            raise ValueError(
                f"{scene_id}: protagonist gender mismatch"
            )

        if master_script_scene["monologue"]:
            local_b = [
                item
                for item in characters
                if item.get("local_character_id") == "B"
            ]

            if local_b:
                raise ValueError(
                    f"{scene_id}: monologue must not contain "
                    "scene-local B"
                )

        else:
            local_b = [
                item
                for item in characters
                if item.get("local_character_id") == "B"
            ]

            if len(local_b) != 1:
                raise ValueError(
                    f"{scene_id}: dialogue scene expected exactly "
                    f"1 scene-local B, got {len(local_b)}"
                )

            b = local_b[0]

            if b.get("character_ref") is not None:
                raise ValueError(
                    f"{scene_id}: scene-local B "
                    "character_ref must be null"
                )

            if b.get("gender") != dialogue["b_gender"]:
                raise ValueError(
                    f"{scene_id}: scene-local B gender mismatch"
                )

        # Validate action actor references.
        valid_actor_refs = {
            protagonist["character_id"]
        }

        if not master_script_scene["monologue"]:
            valid_actor_refs.add("B")

        for action in result.get("actions", []):
            actor_ref = action.get("actor_ref")

            if actor_ref not in valid_actor_refs:
                raise ValueError(
                    f"{scene_id}: invalid action actor_ref: "
                    f"{actor_ref}"
                )

        validate_json(
            result,
            schemas_dir / "production_scene.schema.json",
        )

    except Exception:
        print(
            f"[오류] Production Scene 원문 저장: {raw_path}",
            file=sys.stderr,
        )
        raise

    print(
        f"[PASS] PRODUCTION SCENE {scene_id}: "
        "production_scene.schema.json"
    )

    return result




def generate_shots(
    *,
    builder,
    production_scene,
    dialogue,
    prior_shot_context,
    prompts_dir,
    schemas_dir,
    model,
    api_key,
    debug_dir,
):
    episode = builder["episode"]

    scene_id = production_scene["scene_id"]
    location_ref = production_scene["location_ref"]

    location = next(
        (
            item
            for item in builder["locations"]
            if item["location_id"] == location_ref
        ),
        None,
    )

    if location is None:
        raise ValueError(
            f"{scene_id}: Shot Planner location not found: "
            f"{location_ref}"
        )

    payload = {
        "EPISODE": episode,
        "PRODUCTION_SCENE": production_scene,
        "DIALOGUE": dialogue,
        "CHARACTER_REGISTRY": [
            builder["protagonist"]
        ],
        "LOCATION": location,
        "PRIOR_SHOT_CONTEXT": prior_shot_context,
        "OUTPUT_SCHEMA_SUMMARY": load_json(
            schemas_dir / "shot.schema.json"
        ),
    }

    print(
        f"\n[SHOT PLANNER {scene_id}] "
        "DeepSeek 호출 중..."
    )

    raw = call_deepseek(
        load_text(
            prompts_dir / "39_SHOT_PLANNER.md"
        ),
        payload,
        model,
        api_key,
    )

    debug_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    raw_path = (
        debug_dir /
        f"shots_{scene_id}_raw.txt"
    )

    raw_path.write_text(
        raw,
        encoding="utf-8",
    )

    try:
        result = extract_first_json_value(raw)

        if not isinstance(result, list):
            raise ValueError(
                f"{scene_id}: Shot Planner must return JSON array"
            )

        if not result:
            raise ValueError(
                f"{scene_id}: Shot Planner returned zero shots"
            )

        # --------------------------------------------------------
        # Canonical runtime actor references allowed in this Scene
        # --------------------------------------------------------

        valid_actor_refs = set()

        for character in production_scene["characters"]:
            character_ref = character.get("character_ref")
            local_character_id = character.get(
                "local_character_id"
            )

            if character_ref is not None:
                valid_actor_refs.add(character_ref)
            elif local_character_id is not None:
                valid_actor_refs.add(local_character_id)
            else:
                raise ValueError(
                    f"{scene_id}: Production Scene character "
                    "has no runtime actor reference"
                )

        valid_prop_ids = {
            item["prop_id"]
            for item in production_scene.get("props", [])
        }

        valid_line_ids = {
            item["line_id"]
            for item in dialogue.get("lines", [])
        }

        expected_shot_ids = [
            f"SHOT_{i:03d}"
            for i in range(1, len(result) + 1)
        ]

        for index, shot in enumerate(
            result,
            start=1,
        ):
            # ----------------------------------------------------
            # SYSTEM CANONICAL SHOT LOCK
            # ----------------------------------------------------

            shot["episode_id"] = episode["episode_id"]
            shot["scene_id"] = scene_id
            shot["shot_id"] = f"SHOT_{index:03d}"
            shot["sequence"] = index
            shot["location_ref"] = location_ref

            shot["constraints"] = {
                "preserve_character_identity": True,
                "preserve_location_identity": True,
                "preserve_prop_state": True,
                "allow_new_characters": False,
                "allow_new_locations": False,
                "allow_story_changes": False,
            }

            character_refs = shot.get(
                "character_refs",
                [],
            )

            invalid_refs = [
                ref
                for ref in character_refs
                if ref not in valid_actor_refs
            ]

            if invalid_refs:
                raise ValueError(
                    f"{scene_id}/{shot['shot_id']}: "
                    "invalid character_refs: "
                    f"{invalid_refs}"
                )

            primary_actor_ref = (
                shot.get("action", {})
                .get("primary_actor_ref")
            )

            if primary_actor_ref not in character_refs:
                raise ValueError(
                    f"{scene_id}/{shot['shot_id']}: "
                    "primary_actor_ref must exist in "
                    "character_refs"
                )

            if primary_actor_ref not in valid_actor_refs:
                raise ValueError(
                    f"{scene_id}/{shot['shot_id']}: "
                    "invalid primary_actor_ref: "
                    f"{primary_actor_ref}"
                )

            supporting = (
                shot.get("emotion", {})
                .get("supporting", {})
            )

            invalid_supporting_refs = [
                ref
                for ref in supporting
                if ref not in valid_actor_refs
            ]

            if invalid_supporting_refs:
                raise ValueError(
                    f"{scene_id}/{shot['shot_id']}: "
                    "invalid emotion.supporting refs: "
                    f"{invalid_supporting_refs}"
                )

            shot_prop_ids = [
                item.get("prop_id")
                for item in shot.get("props", [])
            ]

            invalid_props = [
                prop_id
                for prop_id in shot_prop_ids
                if prop_id not in valid_prop_ids
            ]

            if invalid_props:
                raise ValueError(
                    f"{scene_id}/{shot['shot_id']}: "
                    f"invalid props: {invalid_props}"
                )

            dialogue_alignment = shot.get(
                "dialogue_alignment"
            )

            if dialogue_alignment is not None:
                line_ids = dialogue_alignment.get(
                    "line_ids",
                    [],
                )

                invalid_lines = [
                    line_id
                    for line_id in line_ids
                    if line_id not in valid_line_ids
                ]

                if invalid_lines:
                    raise ValueError(
                        f"{scene_id}/{shot['shot_id']}: "
                        "invalid dialogue line_ids: "
                        f"{invalid_lines}"
                    )

            validate_json(
                shot,
                schemas_dir / "shot.schema.json",
            )

        actual_shot_ids = [
            shot["shot_id"]
            for shot in result
        ]

        if actual_shot_ids != expected_shot_ids:
            raise ValueError(
                f"{scene_id}: Shot ID sequence mismatch"
            )

        actual_sequences = [
            shot["sequence"]
            for shot in result
        ]

        expected_sequences = list(
            range(1, len(result) + 1)
        )

        if actual_sequences != expected_sequences:
            raise ValueError(
                f"{scene_id}: Shot sequence mismatch"
            )

        # --------------------------------------------------------
        # Intra-scene Shot continuity structural check
        # --------------------------------------------------------

        for previous, current in zip(
            result,
            result[1:],
        ):
            previous_end = (
                previous["action"]["end_state"]
            )

            current_start = (
                current["action"]["start_state"]
            )

            if not previous_end:
                raise ValueError(
                    f"{scene_id}/{previous['shot_id']}: "
                    "end_state must not be empty before "
                    "another Shot"
                )

            if not current_start:
                raise ValueError(
                    f"{scene_id}/{current['shot_id']}: "
                    "start_state must not be empty"
                )

    except Exception:
        print(
            f"[오류] Shot Planner 원문 저장: {raw_path}",
            file=sys.stderr,
        )
        raise

    print(
        f"[PASS] SHOT PLANNER {scene_id}: "
        f"{len(result)} shot(s)"
    )

    return result



def generate_visual_continuity(
    *,
    builder,
    master_script_scene,
    production_scene,
    shot,
    previous_visual_continuity,
    next_shot_context,
    prompts_dir,
    schemas_dir,
    model,
    api_key,
    debug_dir,
):
    episode = builder["episode"]
    protagonist = builder["protagonist"]

    scene_id = production_scene["scene_id"]
    shot_id = shot["shot_id"]
    location_ref = production_scene["location_ref"]

    # ------------------------------------------------------------
    # Resolve canonical location
    # ------------------------------------------------------------

    location = next(
        (
            item
            for item in builder["locations"]
            if item["location_id"] == location_ref
        ),
        None,
    )

    if location is None:
        raise ValueError(
            f"{scene_id}/{shot_id}: "
            f"Visual Continuity location not found: "
            f"{location_ref}"
        )

    # ------------------------------------------------------------
    # Canonical runtime actor registry for this Scene
    #
    # Persistent:
    #   CHAR_JIEUN_001 -> protagonist registry object
    #
    # Scene-local:
    #   B -> Production Scene character data
    # ------------------------------------------------------------

    character_data = []

    valid_actor_refs = set()

    for character in production_scene["characters"]:
        character_ref = character.get("character_ref")
        local_character_id = character.get(
            "local_character_id"
        )

        if character_ref is not None:
            runtime_ref = character_ref
        elif local_character_id is not None:
            runtime_ref = local_character_id
        else:
            raise ValueError(
                f"{scene_id}: Production Scene character "
                "has no runtime actor reference"
            )

        valid_actor_refs.add(runtime_ref)

        if runtime_ref == protagonist["character_id"]:
            character_data.append(protagonist)
        else:
            character_data.append(character)

    # ------------------------------------------------------------
    # Input structural contract
    # ------------------------------------------------------------

    if shot["episode_id"] != episode["episode_id"]:
        raise ValueError(
            f"{scene_id}/{shot_id}: "
            "Shot episode_id mismatch"
        )

    if shot["scene_id"] != scene_id:
        raise ValueError(
            f"{scene_id}/{shot_id}: "
            "Shot scene_id mismatch"
        )

    if shot["location_ref"] != location_ref:
        raise ValueError(
            f"{scene_id}/{shot_id}: "
            "Shot location_ref mismatch"
        )

    for ref in shot["character_refs"]:
        if ref not in valid_actor_refs:
            raise ValueError(
                f"{scene_id}/{shot_id}: "
                f"invalid Shot actor ref: {ref}"
            )

    valid_prop_ids = {
        item["prop_id"]
        for item in production_scene.get(
            "props",
            [],
        )
    }

    # ------------------------------------------------------------
    # Payload
    # ------------------------------------------------------------

    payload = {
        "PROTAGONIST": protagonist,
        "CHARACTER_DATA": character_data,
        "LOCATION": location,
        "MASTER_SCRIPT_SCENE": master_script_scene,
        "PRODUCTION_SCENE": production_scene,
        "SHOT": shot,
        "CURRENT_SHOT_ACTOR_REFS": list(
            shot["character_refs"]
        ),
        "PREVIOUS_VISUAL_CONTINUITY": (
            previous_visual_continuity
        ),
        "NEXT_SHOT_CONTEXT": next_shot_context,
        "OUTPUT_SCHEMA_SUMMARY": load_json(
            schemas_dir
            / "visual_continuity.schema.json"
        ),
    }

    print(
        f"\n[VISUAL CONTINUITY "
        f"{scene_id}/{shot_id}] "
        "DeepSeek 호출 중..."
    )

    raw = call_deepseek(
        load_text(
            prompts_dir
            / "40_VISUAL_CONTINUITY_MANAGER.md"
        ),
        payload,
        model,
        api_key,
    )

    debug_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    raw_path = (
        debug_dir
        / f"visual_continuity_"
          f"{scene_id}_{shot_id}_raw.txt"
    )

    raw_path.write_text(
        raw,
        encoding="utf-8",
    )

    try:
        result = extract_first_json_value(raw)

        if not isinstance(result, dict):
            raise ValueError(
                f"{scene_id}/{shot_id}: "
                "Visual Continuity must return "
                "JSON object"
            )

        # --------------------------------------------------------
        # SYSTEM CANONICAL ID LOCK
        # --------------------------------------------------------

        result["episode_id"] = episode["episode_id"]
        result["scene_id"] = scene_id
        result["shot_id"] = shot_id

        # --------------------------------------------------------
        # Character reference validation
        # --------------------------------------------------------

        character_states = result.get(
            "character_states",
            [],
        )

        continuity_actor_refs = []

        for state in character_states:
            ref = state.get("character_ref")

            if ref not in valid_actor_refs:
                raise ValueError(
                    f"{scene_id}/{shot_id}: "
                    "invalid continuity character_ref: "
                    f"{ref}"
                )

            if ref not in shot["character_refs"]:
                raise ValueError(
                    f"{scene_id}/{shot_id}: "
                    "continuity character not present "
                    f"in current Shot: {ref}"
                )

            if state.get("identity_lock") is not True:
                raise ValueError(
                    f"{scene_id}/{shot_id}: "
                    f"identity_lock must be true: {ref}"
                )

            continuity_actor_refs.append(ref)

        if len(continuity_actor_refs) != len(
            set(continuity_actor_refs)
        ):
            raise ValueError(
                f"{scene_id}/{shot_id}: "
                "duplicate character_states"
            )

        missing_actor_refs = (
            set(shot["character_refs"])
            - set(continuity_actor_refs)
        )

        if missing_actor_refs:
            raise ValueError(
                f"{scene_id}/{shot_id}: "
                "missing continuity character states: "
                f"{sorted(missing_actor_refs)}"
            )

        # --------------------------------------------------------
        # Location validation
        # --------------------------------------------------------

        location_state = result.get(
            "location_state",
            {},
        )

        if (
            location_state.get("location_ref")
            != location_ref
        ):
            raise ValueError(
                f"{scene_id}/{shot_id}: "
                "Visual Continuity location_ref "
                "mismatch"
            )

        if (
            location_state.get("identity_lock")
            is not True
        ):
            raise ValueError(
                f"{scene_id}/{shot_id}: "
                "location identity_lock must be true"
            )

        # --------------------------------------------------------
        # Prop validation
        # --------------------------------------------------------

        continuity_prop_ids = []

        for prop in result.get(
            "prop_states",
            [],
        ):
            prop_id = prop.get("prop_id")

            if prop_id not in valid_prop_ids:
                raise ValueError(
                    f"{scene_id}/{shot_id}: "
                    "invalid continuity prop: "
                    f"{prop_id}"
                )

            continuity_prop_ids.append(prop_id)

            owner_ref = prop.get("owner_ref")

            if (
                owner_ref is not None
                and owner_ref not in valid_actor_refs
            ):
                raise ValueError(
                    f"{scene_id}/{shot_id}: "
                    "invalid prop owner_ref: "
                    f"{owner_ref}"
                )

        if len(continuity_prop_ids) != len(
            set(continuity_prop_ids)
        ):
            raise ValueError(
                f"{scene_id}/{shot_id}: "
                "duplicate prop_states"
            )

        # --------------------------------------------------------
        # Mandatory lock validation
        # --------------------------------------------------------

        locks = result.get("locks", {})

        for lock_name in (
            "character_identity",
            "location_identity",
            "timeline",
            "story_state",
        ):
            if locks.get(lock_name) is not True:
                raise ValueError(
                    f"{scene_id}/{shot_id}: "
                    f"{lock_name} lock must be true"
                )

        # --------------------------------------------------------
        # Previous continuity structural validation
        # --------------------------------------------------------

        links = result.get(
            "continuity_links",
            {},
        )

        # --------------------------------------------------------
        # SYSTEM CANONICAL CONTINUITY LINK LOCK
        #
        # previous/next IDs are deterministic structural facts.
        # Never trust or preserve model-generated values here.
        # Canonicalize BEFORE strict validation.
        # --------------------------------------------------------

        if previous_visual_continuity is None:
            canonical_previous_scene = None
            canonical_previous_shot = None
        else:
            canonical_previous_scene = (
                previous_visual_continuity["scene_id"]
            )
            canonical_previous_shot = (
                previous_visual_continuity["shot_id"]
            )

        if next_shot_context is None:
            canonical_next_scene = None
            canonical_next_shot = None
        else:
            canonical_next_scene = (
                next_shot_context["scene_id"]
            )
            canonical_next_shot = (
                next_shot_context["shot_id"]
            )

        links["previous_scene_id"] = (
            canonical_previous_scene
        )
        links["previous_shot_id"] = (
            canonical_previous_shot
        )
        links["next_scene_id"] = (
            canonical_next_scene
        )
        links["next_shot_id"] = (
            canonical_next_shot
        )

        if previous_visual_continuity is None:
            if links.get("previous_scene_id") is not None:
                raise ValueError(
                    f"{scene_id}/{shot_id}: "
                    "first continuity state cannot "
                    "have previous_scene_id"
                )

            if links.get("previous_shot_id") is not None:
                raise ValueError(
                    f"{scene_id}/{shot_id}: "
                    "first continuity state cannot "
                    "have previous_shot_id"
                )

        else:
            expected_previous_scene = (
                previous_visual_continuity[
                    "scene_id"
                ]
            )

            expected_previous_shot = (
                previous_visual_continuity[
                    "shot_id"
                ]
            )

            if (
                links.get("previous_scene_id")
                != expected_previous_scene
            ):
                raise ValueError(
                    f"{scene_id}/{shot_id}: "
                    "previous_scene_id mismatch: "
                    f"{links.get('previous_scene_id')} "
                    "!= "
                    f"{expected_previous_scene}"
                )

            if (
                links.get("previous_shot_id")
                != expected_previous_shot
            ):
                raise ValueError(
                    f"{scene_id}/{shot_id}: "
                    "previous_shot_id mismatch: "
                    f"{links.get('previous_shot_id')} "
                    "!= "
                    f"{expected_previous_shot}"
                )

        # --------------------------------------------------------
        # Next continuity structural validation
        # --------------------------------------------------------

        if next_shot_context is None:
            expected_next_scene = None
            expected_next_shot = None
        else:
            expected_next_scene = (
                next_shot_context["scene_id"]
            )
            expected_next_shot = (
                next_shot_context["shot_id"]
            )

        if (
            links.get("next_scene_id")
            != expected_next_scene
        ):
            raise ValueError(
                f"{scene_id}/{shot_id}: "
                "next_scene_id mismatch: "
                f"{links.get('next_scene_id')} "
                "!= "
                f"{expected_next_scene}"
            )

        if (
            links.get("next_shot_id")
            != expected_next_shot
        ):
            raise ValueError(
                f"{scene_id}/{shot_id}: "
                "next_shot_id mismatch: "
                f"{links.get('next_shot_id')} "
                "!= "
                f"{expected_next_shot}"
            )

        # --------------------------------------------------------
        # Schema validation
        # --------------------------------------------------------

        validate_json(
            result,
            schemas_dir
            / "visual_continuity.schema.json",
        )

    except Exception:
        print(
            "[오류] Visual Continuity 원문 저장: "
            f"{raw_path}",
            file=sys.stderr,
        )
        raise

    print(
        f"[PASS] VISUAL CONTINUITY "
        f"{scene_id}/{shot_id}"
    )

    return result


def generate_production_scene_final_validation(
    *,
    builder,
    master_script,
    dialogues,
    production_scenes,
    prompts_dir,
    schemas_dir,
    model,
    api_key,
    debug_dir,
):
    payload = {
        "SERIES_BIBLE": builder["series_bible"],
        "EPISODE": builder["episode"],
        "PROTAGONIST": builder["protagonist"],
        "AVAILABLE_LOCATIONS": builder["locations"],
        "MASTER_SCRIPT": master_script,
        "DIALOGUES": dialogues,
        "PRODUCTION_SCENES": production_scenes,
        "OUTPUT_SCHEMA_SUMMARY": load_json(
            schemas_dir
            / "production_scene_final_validation.schema.json"
        ),
    }

    print(
        "\n[PRODUCTION SCENE FINAL VALIDATION] "
        "DeepSeek 호출 중..."
    )

    raw = call_deepseek(
        load_text(
            prompts_dir
            / "38_PRODUCTION_SCENE_FINAL_VALIDATOR.md"
        ),
        payload,
        model,
        api_key,
    )

    debug_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    raw_path = (
        debug_dir
        / "production_scene_final_validation_raw.txt"
    )

    raw_path.write_text(
        raw,
        encoding="utf-8",
    )

    try:
        result = extract_first_json_value(raw)

        result["episode_id"] = (
            builder["episode"]["episode_id"]
        )

        validate_json(
            result,
            schemas_dir
            / "production_scene_final_validation.schema.json",
        )

        scene_checks = result.get("scene_checks", [])

        if len(scene_checks) != 20:
            raise ValueError(
                "Production final validation scene count mismatch: "
                f"expected=20 actual={len(scene_checks)}"
            )

        expected_ids = [
            f"S{i:03d}"
            for i in range(1, 21)
        ]

        actual_ids = [
            item.get("scene_id")
            for item in scene_checks
        ]

        if actual_ids != expected_ids:
            raise ValueError(
                "Production final validation "
                "scene_id sequence mismatch"
            )

        fail_issues = [
            issue
            for issue in result.get("issues", [])
            if issue.get("severity") == "fail"
        ]

        if (
            fail_issues
            and result.get("overall_pass") is True
        ):
            raise ValueError(
                "Production final validation contradiction: "
                "fail issue exists but overall_pass=true"
            )

        if (
            result.get("severity") == "fail"
            and result.get("overall_pass") is True
        ):
            raise ValueError(
                "Production final validation contradiction: "
                "severity=fail but overall_pass=true"
            )

    except Exception:
        print(
            "[오류] Production Scene Final Validator "
            f"원문 저장: {raw_path}",
            file=sys.stderr,
        )
        raise

    print(
        "[PASS] PRODUCTION SCENE FINAL VALIDATION: "
        f'severity={result["severity"]}, '
        f'overall_pass={result["overall_pass"]}'
    )

    return result




def load_reference_asset(
    asset_id,
    *,
    series_dir,
    schemas_dir,
):
    """
    Resolve one provider-neutral ManyLangs reference asset.
    This function does NOT call VIDU.
    """

    asset_path = (
        series_dir
        / "reference_assets"
        / f"{asset_id}.json"
    )

    if not asset_path.exists():
        raise FileNotFoundError(
            f"Reference asset not found: {asset_path}"
        )

    asset = load_json(asset_path)

    validate_json(
        asset,
        schemas_dir / "reference_asset.schema.json",
    )

    if asset["asset_id"] != asset_id:
        raise ValueError(
            "Reference asset ID mismatch: "
            f"{asset['asset_id']} != {asset_id}"
        )

    if asset["provider_neutral"] is not True:
        raise ValueError(
            f"{asset_id}: provider_neutral must be true"
        )

    return asset


def resolve_reference_assets(
    asset_ids,
    *,
    expected_owner_ref,
    series_dir,
    schemas_dir,
):
    """
    Resolve and validate a canonical reference-asset list.
    No provider API call is performed here.
    """

    if len(asset_ids) != len(set(asset_ids)):
        raise ValueError(
            f"{expected_owner_ref}: duplicate reference asset IDs"
        )

    assets = []

    for asset_id in asset_ids:
        asset = load_reference_asset(
            asset_id,
            series_dir=series_dir,
            schemas_dir=schemas_dir,
        )

        if asset["owner_ref"] != expected_owner_ref:
            raise ValueError(
                f"{asset_id}: owner mismatch: "
                f"{asset['owner_ref']} != "
                f"{expected_owner_ref}"
            )

        if (
            asset["usage"]["allow_generation_reference"]
            is not True
        ):
            raise ValueError(
                f"{asset_id}: generation reference disabled"
            )

        assets.append(asset)

    return assets



def build_vidu_reference_payload(
    *,
    vidu_ready,
    series_dir,
    schemas_dir,
    model="viduq3-turbo",
):
    """
    Convert one validated provider-neutral VIDU-ready object
    into the actual VIDU reference2video request payload.

    This function does NOT call VIDU.
    """

    if vidu_ready["generation"]["provider"] != "vidu":
        raise ValueError(
            "VIDU payload requires provider=vidu"
        )

    if vidu_ready["generation"]["mode"] != "reference_guided":
        raise ValueError(
            "VIDU payload requires reference_guided mode"
        )

    # --------------------------------------------------------
    # Resolve provider-neutral reference assets
    # --------------------------------------------------------

    images = []

    for actor in vidu_ready["actors"]:

        asset_ids = actor.get(
            "reference_asset_ids",
            [],
        )

        if not asset_ids:
            continue

        assets = resolve_reference_assets(
            asset_ids,
            expected_owner_ref=actor["actor_ref"],
            series_dir=series_dir,
            schemas_dir=schemas_dir,
        )

        for asset in assets:

            source = asset["source"]
            kind = source["kind"]
            value = source["value"]

            if kind == "public_url":
                images.append(value)

            elif kind == "local_file":
                # Local paths cannot be sent directly to VIDU.
                # Conversion to Base64/public URL happens before
                # actual provider submission.
                raise ValueError(
                    f"{asset['asset_id']}: local_file reference "
                    "must be converted to public_url or Base64 "
                    "before VIDU submission"
                )

            else:
                raise ValueError(
                    f"{asset['asset_id']}: unsupported "
                    f"source kind: {kind}"
                )

    if not images:
        raise ValueError(
            "VIDU reference2video requires at least "
            "one resolved reference image"
        )

    if len(images) > 7:
        raise ValueError(
            "VIDU reference2video supports at most "
            "7 reference images"
        )

    duration = vidu_ready[
        "generation"
    ]["duration_seconds"]

    if int(duration) != duration:
        raise ValueError(
            "VIDU duration must resolve to integer seconds"
        )

    duration = int(duration)

    if model in {
        "viduq3",
        "viduq3-turbo",
    }:
        if not 3 <= duration <= 16:
            raise ValueError(
                f"{model}: duration must be 3-16 seconds"
            )

    elif model == "viduq3-mix":
        if not 1 <= duration <= 16:
            raise ValueError(
                "viduq3-mix: duration must be 1-16 seconds"
            )

    elif model in {
        "viduq2",
        "viduq2-pro",
    }:
        if not 1 <= duration <= 10:
            raise ValueError(
                f"{model}: unsupported duration {duration}"
            )

    prompt = (
        vidu_ready
        .get("prompt", {})
        .get("final_prompt", "")
        .strip()
    )

    if not prompt:
        raise ValueError(
            "VIDU final_prompt missing"
        )

    if len(prompt) > 5000:
        raise ValueError(
            "VIDU prompt exceeds 5000 characters"
        )

    payload = {
        "model": model,
        "images": images,
        "prompt": prompt,
        "duration": duration,
        "aspect_ratio": vidu_ready[
            "generation"
        ]["aspect_ratio"],
        "resolution": vidu_ready[
            "generation"
        ]["resolution"],
        "audio": False,
    }

    return payload


def generate_vidu_ready(
    *,
    builder,
    production_scene,
    shot,
    visual_continuity,
    prompts_dir,
    schemas_dir,
    model,
    api_key,
    debug_dir,
):
    episode = builder["episode"]

    scene_id = shot["scene_id"]
    shot_id = shot["shot_id"]

    if production_scene["scene_id"] != scene_id:
        raise ValueError(
            f"{scene_id}/{shot_id}: production scene mismatch"
        )

    if visual_continuity["scene_id"] != scene_id:
        raise ValueError(
            f"{scene_id}/{shot_id}: continuity scene mismatch"
        )

    if visual_continuity["shot_id"] != shot_id:
        raise ValueError(
            f"{scene_id}/{shot_id}: continuity shot mismatch"
        )

    payload = {
        "PRODUCTION_SCENE": production_scene,
        "SHOT": shot,
        "VISUAL_CONTINUITY": visual_continuity,
        "OUTPUT_SCHEMA_SUMMARY": load_json(
            schemas_dir / "vidu_ready.schema.json"
        ),
    }

    print(
        f"\n[VIDU READY {scene_id}/{shot_id}] "
        "DeepSeek 호출 중..."
    )

    raw = call_deepseek(
        load_text(
            prompts_dir / "41_VIDU_PROMPT_COMPILER.md"
        ),
        payload,
        model,
        api_key,
    )

    debug_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    raw_path = (
        debug_dir
        / f"vidu_ready_{scene_id}_{shot_id}_raw.txt"
    )

    raw_path.write_text(
        raw,
        encoding="utf-8",
    )

    try:
        result = extract_first_json_value(raw)

        # --------------------------------------------------------
        # SYSTEM CANONICAL VIDU-READY LOCK
        # --------------------------------------------------------

        result["episode_id"] = episode["episode_id"]
        result["scene_id"] = scene_id
        result["shot_id"] = shot_id
        result["sequence"] = shot["sequence"]

        result["generation"] = {
            "provider": "vidu",
            "duration_seconds": shot["duration_seconds"],
            "aspect_ratio": "16:9",
            "resolution": "1080p",
            "mode": "reference_guided",
        }

        # --------------------------------------------------------
        # SOURCE REFS
        # provenance only; not provider asset refs
        # --------------------------------------------------------

        result["source_refs"] = {
            "production_scene": (
                f"02_visual/production_scenes/{scene_id}.json"
            ),
            "shot": (
                f"03_shots/{scene_id}/{shot_id}.json"
            ),
            "visual_continuity": (
                f"04_visual_continuity/{scene_id}/{shot_id}.json"
            ),
        }

        # --------------------------------------------------------
        # CANONICAL ACTOR SET
        # --------------------------------------------------------

        expected_actor_refs = set(
            shot["character_refs"]
        )

        continuity_states = {
            item["character_ref"]: item
            for item in visual_continuity[
                "character_states"
            ]
        }

        if set(continuity_states) != expected_actor_refs:
            raise ValueError(
                f"{scene_id}/{shot_id}: "
                "continuity actor set does not match Shot"
            )

        actor_results = result.get("actors", [])

        actual_actor_refs = {
            item.get("actor_ref")
            for item in actor_results
        }

        if actual_actor_refs != expected_actor_refs:
            raise ValueError(
                f"{scene_id}/{shot_id}: "
                "VIDU-ready actor exact-match failure: "
                f"{actual_actor_refs} != {expected_actor_refs}"
            )

        # Lock actor values to canonical continuity state.
        for actor in actor_results:
            ref = actor["actor_ref"]
            state = continuity_states[ref]

            actor["identity_lock"] = True
            actor["appearance"] = list(
                state["appearance"]
            )
            actor["hair"] = list(
                state["hair"]
            )
            actor["clothing"] = list(
                state["clothing"]
            )
            actor["carried_items"] = list(
                state["carried_items"]
            )
            actor["body_state"] = list(
                state["body_state"]
            )
            actor["emotion"] = state["emotion"]

            if ref.startswith("CHAR_"):
                actor["identity_type"] = "persistent"

                if (
                    ref
                    == builder["protagonist"]["character_id"]
                ):
                    actor["reference_asset_ids"] = list(
                        builder["protagonist"]
                        ["production"]
                        ["reference_asset_ids"]
                    )
                else:
                    actor["reference_asset_ids"] = []
            else:
                actor["identity_type"] = "scene_local"
                actor["reference_asset_ids"] = []

        # --------------------------------------------------------
        # CANONICAL LOCATION
        # --------------------------------------------------------

        location_state = visual_continuity[
            "location_state"
        ]

        if (
            location_state["location_ref"]
            != shot["location_ref"]
        ):
            raise ValueError(
                f"{scene_id}/{shot_id}: "
                "location mismatch before VIDU-ready compile"
            )

        result["location"] = {
            "location_ref": shot["location_ref"],
            "identity_lock": True,
            "current_zone": (
                location_state["current_zone"]
            ),
            "persistent_features": list(
                location_state[
                    "persistent_features"
                ]
            ),
            "orientation_state": list(
                location_state[
                    "orientation_state"
                ]
            ),
            "reference_asset_ids": [],
        }

        # --------------------------------------------------------
        # CANONICAL PROPS
        # --------------------------------------------------------

        result["props"] = [
            {
                "prop_id": item["prop_id"],
                "owner_ref": item["owner_ref"],
                "state": item["state"],
                "position": item["position"],
                "visible": item["visible"],
                "continuity_lock": (
                    item["continuity_lock"]
                ),
            }
            for item in visual_continuity[
                "prop_states"
            ]
        ]

        # --------------------------------------------------------
        # CANONICAL CONTINUITY LINKS
        # --------------------------------------------------------

        links = visual_continuity[
            "continuity_links"
        ]

        result["continuity"] = {
            "carry_in": list(
                shot["continuity"]["carry_in"]
            ),
            "carry_out": list(
                links["carry_out"]
            ),
            "must_match_previous_shot": (
                shot["continuity"][
                    "must_match_previous_shot"
                ]
            ),
            "previous_scene_id": (
                links["previous_scene_id"]
            ),
            "previous_shot_id": (
                links["previous_shot_id"]
            ),
            "next_scene_id": (
                links["next_scene_id"]
            ),
            "next_shot_id": (
                links["next_shot_id"]
            ),
        }

        # --------------------------------------------------------
        # FINAL STRUCTURAL CHECKS
        # --------------------------------------------------------

        if (
            result["generation"]["duration_seconds"]
            != shot["duration_seconds"]
        ):
            raise ValueError(
                f"{scene_id}/{shot_id}: "
                "duration mismatch"
            )

        if (
            result["location"]["location_ref"]
            != shot["location_ref"]
        ):
            raise ValueError(
                f"{scene_id}/{shot_id}: "
                "VIDU-ready location mismatch"
            )

        if not result.get(
            "prompt",
            {},
        ).get("final_prompt"):
            raise ValueError(
                f"{scene_id}/{shot_id}: "
                "final_prompt missing"
            )

        validate_json(
            result,
            schemas_dir / "vidu_ready.schema.json",
        )

    except Exception:
        print(
            f"[오류] VIDU Ready 원문 저장: {raw_path}",
            file=sys.stderr,
        )
        raise

    print(
        f"[PASS] VIDU READY {scene_id}/{shot_id}"
    )

    return result


def main():
    parser = argparse.ArgumentParser(
        description="ManyLangs Longform v2 pipeline"
    )

    parser.add_argument("--category", required=True)
    parser.add_argument("--genre", required=True)
    parser.add_argument("--topic", required=True)

    parser.add_argument(
        "--target-lang",
        required=True,
        choices=["en", "es", "fr", "pt", "jp", "kr", "zh", "ru"],
    )

    parser.add_argument(
        "--level",
        required=True,
        choices=["A1", "A2", "B1", "B2", "C1", "C2"],
    )

    parser.add_argument(
        "--episode-number",
        type=int,
        default=1,
    )

    parser.add_argument(
        "--series-id",
        default=None,
        help="Optional stable series ID. If omitted, generated deterministically.",
    )

    parser.add_argument("--tone", default=None)
    parser.add_argument("--setting", default=None)

    parser.add_argument(
        "--protagonist-gender",
        choices=["female", "male"],
        default=None,
    )

    parser.add_argument(
        "--protagonist-name",
        default=None,
    )

    parser.add_argument(
        "--model",
        default=MODEL_DEFAULT,
    )

    parser.add_argument(
        "--prompts-dir",
        type=Path,
        default=DEFAULT_PROMPTS_DIR,
    )

    parser.add_argument(
        "--schemas-dir",
        type=Path,
        default=DEFAULT_SCHEMAS_DIR,
    )

    parser.add_argument(
        "--series-root",
        type=Path,
        default=DEFAULT_SERIES_ROOT,
    )

    parser.add_argument(
        "--stop-after-master",
        action="store_true",
        help="현재 v2 구축 단계: Master Script 저장 후 종료",
    )

    args = parser.parse_args()

    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        raise RuntimeError("DEEPSEEK_API_KEY 환경변수가 없습니다.")

    system_ids = build_system_ids(args)

    print("===== SYSTEM IDS =====")
    print("category_id:", system_ids["category_id"])
    print("series_id:", system_ids["series_id"])
    print("episode_id:", system_ids["episode_id"])
    print("protagonist_id:", system_ids["protagonist_id"])

    content_request = make_content_request(args)

    validate_json(
        content_request,
        args.schemas_dir / "content_request.schema.json",
    )

    print("[PASS] CONTENT_REQUEST")

    temp_debug_dir = BASE_DIR / "logs" / "v2_debug"

    bootstrap = generate_bootstrap(
        content_request,
        system_ids,
        args.prompts_dir,
        args.schemas_dir,
        args.model,
        api_key,
        temp_debug_dir,
    )

    builder = generate_series_objects(
        content_request,
        bootstrap,
        args.prompts_dir,
        args.schemas_dir,
        args.model,
        api_key,
        temp_debug_dir,
    )

    series_dir, episode_dir = save_series_builder_outputs(
        args.series_root,
        builder,
    )

    save_json(
        episode_dir / "01_script" / "content_request.json",
        content_request,
    )

    save_json(
        episode_dir / "01_script" / "series_bootstrap.json",
        bootstrap,
    )

    protagonist_ref = builder["protagonist"]["character_id"]

    continuity_path = series_dir / "continuity_state.json"
    learning_history_path = series_dir / "learning_history.json"

    if continuity_path.exists():
        continuity_state = load_json(continuity_path)
    else:
        continuity_state = initialize_continuity_state(
            builder["series_bible"]["series_id"],
            builder["episode"]["episode_id"],
            protagonist_ref,
        )
        validate_json(
            continuity_state,
            args.schemas_dir / "continuity_state.schema.json",
        )
        save_json(continuity_path, continuity_state)

    if learning_history_path.exists():
        learning_history = load_json(learning_history_path)
    else:
        learning_history = initialize_learning_history(
            builder["series_bible"]["series_id"],
            builder["episode"]["language_context"]["target_language"],
            builder["episode"]["language_context"]["cefr_level"],
        )
        validate_json(
            learning_history,
            args.schemas_dir / "learning_history.schema.json",
        )
        save_json(learning_history_path, learning_history)

    scene_plan = generate_scene_plan(
        builder=builder,
        continuity_state=continuity_state,
        learning_history=learning_history,
        prompts_dir=args.prompts_dir,
        schemas_dir=args.schemas_dir,
        model=args.model,
        api_key=api_key,
        debug_dir=temp_debug_dir,
    )

    save_json(
        episode_dir / "01_script" / "scene_plan.json",
        scene_plan,
    )

    master_script = generate_master_script(
        builder=builder,
        scene_plan=scene_plan,
        continuity_state=continuity_state,
        learning_history=learning_history,
        prompts_dir=args.prompts_dir,
        schemas_dir=args.schemas_dir,
        model=args.model,
        api_key=api_key,
        debug_dir=temp_debug_dir,
    )

    save_json(
        episode_dir / "01_script" / "master_script.json",
        master_script,
    )

    master_reality_validation = (
        generate_master_script_reality_validation(
            builder=builder,
            scene_plan=scene_plan,
            master_script=master_script,
            prompts_dir=args.prompts_dir,
            schemas_dir=args.schemas_dir,
            model=args.model,
            api_key=api_key,
            debug_dir=temp_debug_dir,
        )
    )

    save_json(
        episode_dir
        / "01_script"
        / "master_script_reality_validation.json",
        master_reality_validation,
    )

    if (
        master_reality_validation["overall_pass"]
        is not True
    ):
        raise ValueError(
            "MASTER_SCRIPT Reality Gate failed: "
            f'severity={master_reality_validation["severity"]}, '
            f'issues={len(master_reality_validation["issues"])}'
        )

    print()
    print("===== V2 MASTER STAGE COMPLETE =====")
    print("series:", series_dir)
    print("episode:", episode_dir)
    print(
        "master script:",
        episode_dir / "01_script" / "master_script.json",
    )
    print()
    print("===== DIALOGUE FULL 20-SCENE GENERATION =====")

    dialogue_dir = episode_dir / "01_script" / "dialogues"

    dialogues = []
    dialogue_semantic_validations = []
    prior_dialogue_context = []

    for scene in master_script["scenes"]:
        scene_id = scene["scene_id"]

        dialogue = generate_dialogue(
            builder=builder,
            master_script_scene=scene,
            prior_dialogue_context=prior_dialogue_context,
            prompts_dir=args.prompts_dir,
            schemas_dir=args.schemas_dir,
            model=args.model,
            api_key=api_key,
            debug_dir=temp_debug_dir,
        )

        save_json(
            dialogue_dir / f"{scene_id}.json",
            dialogue,
        )

        # ------------------------------------------------------------
        # DIALOGUE SEMANTIC VALIDATION
        # Validate each generated Dialogue against canonical upstream
        # data before advancing dialogue continuity.
        # ------------------------------------------------------------

        semantic_validation = generate_dialogue_semantic_validation(
            builder=builder,
            master_script_scene=scene,
            dialogue=dialogue,
            prior_dialogue_context=prior_dialogue_context,
            prompts_dir=args.prompts_dir,
            schemas_dir=args.schemas_dir,
            model=args.model,
            api_key=api_key,
            debug_dir=temp_debug_dir,
        )

        semantic_dir = (
            episode_dir
            / "01_script"
            / "dialogue_semantic_validations"
        )

        save_json(
            semantic_dir / f"{scene_id}.json",
            semantic_validation,
        )

        # ------------------------------------------------------------
        # DIALOGUE SEMANTIC GATE
        # warning is allowed because overall_pass remains True.
        # fail blocks the pipeline before continuity advances.
        # ------------------------------------------------------------

        if semantic_validation["overall_pass"] is not True:
            raise ValueError(
                f"{scene_id}: Dialogue Semantic Gate failed: "
                f'severity={semantic_validation["severity"]}, '
                f'issues={len(semantic_validation["issues"])}'
            )

        dialogues.append(dialogue)
        dialogue_semantic_validations.append(
            semantic_validation
        )

        prior_dialogue_context = [
            {
                "scene_id": dialogue["scene_id"],
                "mode": dialogue["mode"],
                "lines": dialogue["lines"],
                "scene_state": dialogue["scene_state"],
            }
        ]

        print(
            "saved:",
            dialogue_dir / f"{scene_id}.json",
        )

    if len(dialogues) != len(master_script["scenes"]):
        raise ValueError(
            "Dialogue scene count mismatch: "
            f'master={len(master_script["scenes"])}, '
            f'dialogues={len(dialogues)}'
        )

    print()
    print(
        "PASS: Dialogue generation complete:",
        len(dialogues),
        "scenes",
    )

    print()
    print("===== V2 DIALOGUE STAGE COMPLETE =====")
    print("dialogues:", dialogue_dir)

    # ------------------------------------------------------------
    # LEARNING GENERATION
    # Validated Dialogue is the sole source of truth.
    # ------------------------------------------------------------

    print()
    print("===== LEARNING GENERATION =====")

    learning_dir = episode_dir / "01_script" / "learning"
    learnings = []

    for scene, dialogue in zip(master_script["scenes"], dialogues):
        scene_id = scene["scene_id"]

        if dialogue["scene_id"] != scene_id:
            raise ValueError(
                "Learning dialogue mismatch: "
                f'master={scene_id}, dialogue={dialogue["scene_id"]}'
            )

        learning = generate_learning(
            builder=builder,
            master_script_scene=scene,
            dialogue=dialogue,
            learning_history=learning_history,
            prompts_dir=args.prompts_dir,
            schemas_dir=args.schemas_dir,
            model=args.model,
            api_key=api_key,
            debug_dir=temp_debug_dir,
        )

        if learning["scene_id"] != scene_id:
            raise ValueError(f"{scene_id}: Learning scene mismatch")
        if learning["episode_id"] != dialogue["episode_id"]:
            raise ValueError(f"{scene_id}: Learning episode mismatch")
        if learning["target_language"] != dialogue["target_language"]:
            raise ValueError(f"{scene_id}: Learning target language mismatch")
        if learning["cefr_level"] != dialogue["cefr_level"]:
            raise ValueError(f"{scene_id}: Learning CEFR mismatch")

        dialogue_line_ids = {line["line_id"] for line in dialogue["lines"]}

        for item in learning["key_expressions"]:
            if not set(item["source_line_ids"]).issubset(dialogue_line_ids):
                raise ValueError(
                    f"{scene_id}: Learning source_line_ids invalid"
                )

            source_texts = [
                line["text"]
                for line in dialogue["lines"]
                if line["line_id"] in item["source_line_ids"]
            ]
            if not any(item["expression"] in t for t in source_texts):
                raise ValueError(
                    f"{scene_id}: Learning expression not found "
                    "in declared source dialogue line"
                )

        save_json(learning_dir / f"{scene_id}.json", learning)
        learnings.append(learning)

        print(
            "saved:",
            learning_dir / f"{scene_id}.json",
            "| expressions:",
            len(learning["key_expressions"]),
        )

    if len(learnings) != len(master_script["scenes"]):
        raise ValueError(
            "Learning scene count mismatch: "
            f'master={len(master_script["scenes"])}, '
            f'learning={len(learnings)}'
        )

    print()
    print("PASS: Learning generation complete:", len(learnings), "scenes")
    print("learning:", learning_dir)
    print()

    # ------------------------------------------------------------
    # EPISODE FINAL VALIDATION
    # All 20 canonical dialogues and semantic validation results
    # are checked together before Visual Production.
    # ------------------------------------------------------------

    if len(dialogue_semantic_validations) != len(
        master_script["scenes"]
    ):
        raise ValueError(
            "Dialogue semantic validation count mismatch: "
            f'master={len(master_script["scenes"])}, '
            f'semantic={len(dialogue_semantic_validations)}'
        )

    episode_final_validation = (
        generate_episode_final_validation(
            builder=builder,
            scene_plan=scene_plan,
            master_script=master_script,
            master_reality_validation=(
                master_reality_validation
            ),
            dialogues=dialogues,
            dialogue_semantic_validations=(
                dialogue_semantic_validations
            ),
            prompts_dir=args.prompts_dir,
            schemas_dir=args.schemas_dir,
            model=args.model,
            api_key=api_key,
            debug_dir=temp_debug_dir,
        )
    )

    save_json(
        episode_dir
        / "01_script"
        / "episode_final_validation.json",
        episode_final_validation,
    )

    # ------------------------------------------------------------
    # EPISODE FINAL GATE
    # warning is allowed.
    # fail blocks Visual Production.
    # ------------------------------------------------------------

    if episode_final_validation["overall_pass"] is not True:
        raise ValueError(
            "Episode Final Gate failed: "
            f'severity={episode_final_validation["severity"]}, '
            f'issues={len(episode_final_validation["issues"])}'
        )

    print()
    print("===== SCRIPT PRODUCTION COMPLETE =====")
    print(
        "episode final validation:",
        episode_dir
        / "01_script"
        / "episode_final_validation.json",
    )
    print("PASS: ready for Visual Production")

    # ------------------------------------------------------------
    # VISUAL PRODUCTION SCENE GENERATION
    #
    # Generate canonical Production Scene JSON for all 20 scenes.
    # Each scene receives the previous Production Scene as
    # continuity context.
    # ------------------------------------------------------------

    print()
    print("===== VISUAL PRODUCTION SCENE GENERATION =====")

    production_scene_dir = (
        episode_dir
        / "02_visual"
        / "production_scenes"
    )

    production_scenes = []
    prior_production_context = []

    for scene, dialogue in zip(
        master_script["scenes"],
        dialogues,
    ):
        scene_id = scene["scene_id"]

        if dialogue["scene_id"] != scene_id:
            raise ValueError(
                "Production Scene dialogue mismatch: "
                f'master={scene_id}, '
                f'dialogue={dialogue["scene_id"]}'
            )

        production_scene = generate_production_scene(
            builder=builder,
            master_script_scene=scene,
            dialogue=dialogue,
            prior_production_context=(
                prior_production_context
            ),
            prompts_dir=args.prompts_dir,
            schemas_dir=args.schemas_dir,
            model=args.model,
            api_key=api_key,
            debug_dir=temp_debug_dir,
        )

        save_json(
            production_scene_dir / f"{scene_id}.json",
            production_scene,
        )

        production_scenes.append(
            production_scene
        )

        prior_production_context = [
            {
                "scene_id": production_scene["scene_id"],
                "sequence": production_scene["sequence"],
                "location_ref": (
                    production_scene["location_ref"]
                ),
                "characters": (
                    production_scene["characters"]
                ),
                "environment": (
                    production_scene["environment"]
                ),
                "props": (
                    production_scene["props"]
                ),
                "visual_continuity": (
                    production_scene["visual_continuity"]
                ),
            }
        ]

        print(
            "saved:",
            production_scene_dir / f"{scene_id}.json",
        )

    if len(production_scenes) != len(
        master_script["scenes"]
    ):
        raise ValueError(
            "Production Scene count mismatch: "
            f'master={len(master_script["scenes"])}, '
            f'production={len(production_scenes)}'
        )

    expected_scene_ids = [
        scene["scene_id"]
        for scene in master_script["scenes"]
    ]

    actual_scene_ids = [
        scene["scene_id"]
        for scene in production_scenes
    ]

    if actual_scene_ids != expected_scene_ids:
        raise ValueError(
            "Production Scene sequence mismatch"
        )

    print()
    print(
        "PASS: Production Scene generation complete:",
        len(production_scenes),
        "scenes",
    )

    print()
    print("===== V2 VISUAL PRODUCTION STAGE 1 COMPLETE =====")
    print(
        "production scenes:",
        production_scene_dir,
    )

    # ============================================================
    # PRODUCTION SCENE FINAL VALIDATION
    # ============================================================

    print()
    print("===== PRODUCTION SCENE FINAL VALIDATION =====")

    production_final_validation = (
        generate_production_scene_final_validation(
            builder=builder,
            master_script=master_script,
            dialogues=dialogues,
            production_scenes=production_scenes,
            prompts_dir=args.prompts_dir,
            schemas_dir=args.schemas_dir,
            model=args.model,
            api_key=api_key,
            debug_dir=temp_debug_dir,
        )
    )

    save_json(
        episode_dir
        / "02_visual"
        / "production_scene_final_validation.json",
        production_final_validation,
    )

    if production_final_validation["overall_pass"] is not True:
        raise ValueError(
            "Production Scene Final Gate failed: "
            f'severity={production_final_validation["severity"]}, '
            f'issues={len(production_final_validation.get("issues", []))}'
        )

    print("PASS: Production Scene Final Gate")

    # ============================================================
    # SHOT GENERATION
    # ============================================================

    print()
    print("===== SHOT GENERATION =====")

    shots_root = episode_dir / "03_shots"

    all_shots = []
    prior_shot_context = []

    for scene, production_scene, dialogue in zip(
        master_script["scenes"],
        production_scenes,
        dialogues,
    ):
        scene_id = scene["scene_id"]
        scene_shot_dir = shots_root / scene_id

        existing_paths = sorted(
            scene_shot_dir.glob("SHOT_*.json")
        )

        existing_shots = []
        existing_valid = bool(existing_paths)

        if existing_valid:
            try:
                for shot_path in existing_paths:
                    shot = load_json(shot_path)
                    validate_json(
                        shot,
                        args.schemas_dir / "shot.schema.json",
                    )

                    if shot["scene_id"] != scene_id:
                        raise ValueError(
                            f"{shot_path}: scene_id mismatch"
                        )

                    existing_shots.append(shot)

            except Exception as exc:
                print(
                    f"{scene_id}: existing Shots invalid; "
                    f"regenerating ({exc})"
                )
                existing_valid = False
                existing_shots = []

        if existing_valid:
            shots = existing_shots
            print(
                f"{scene_id}: SKIP valid existing "
                f"| shots={len(shots)}"
            )
        else:
            shots = generate_shots(
                builder=builder,
                production_scene=production_scene,
                dialogue=dialogue,
                prior_shot_context=prior_shot_context,
                prompts_dir=args.prompts_dir,
                schemas_dir=args.schemas_dir,
                model=args.model,
                api_key=api_key,
                debug_dir=temp_debug_dir,
            )

            for shot in shots:
                save_json(
                    scene_shot_dir / f'{shot["shot_id"]}.json',
                    shot,
                )

        all_shots.extend(shots)

        prior_shot_context = [
            {
                "scene_id": shot["scene_id"],
                "shot_id": shot["shot_id"],
                "sequence": shot["sequence"],
                "action": shot["action"],
                "continuity": shot["continuity"],
            }
            for shot in shots
        ]

    print(
        "PASS: Shot generation complete:",
        len(all_shots),
        "shots",
    )

    # ============================================================
    # BUILD GLOBAL SHOT ORDER
    # ============================================================

    ordered_shots = []

    production_by_scene = {
        item["scene_id"]: item
        for item in production_scenes
    }

    master_by_scene = {
        item["scene_id"]: item
        for item in master_script["scenes"]
    }

    for scene in master_script["scenes"]:
        scene_id = scene["scene_id"]

        scene_paths = sorted(
            (shots_root / scene_id).glob("SHOT_*.json")
        )

        if not scene_paths:
            raise ValueError(
                f"{scene_id}: no Shot JSON files"
            )

        for shot_path in scene_paths:
            shot = load_json(shot_path)

            validate_json(
                shot,
                args.schemas_dir / "shot.schema.json",
            )

            ordered_shots.append(shot)

    # ============================================================
    # VISUAL CONTINUITY
    # ============================================================

    print()
    print("===== VISUAL CONTINUITY GENERATION =====")

    visual_root = episode_dir / "04_visual_continuity"
    previous_visual_continuity = None
    visual_results = []

    for index, shot in enumerate(ordered_shots):
        scene_id = shot["scene_id"]
        shot_id = shot["shot_id"]

        if index + 1 < len(ordered_shots):
            next_shot = ordered_shots[index + 1]
            next_shot_context = {
                "scene_id": next_shot["scene_id"],
                "shot_id": next_shot["shot_id"],
            }
        else:
            next_shot_context = None

        visual_path = (
            visual_root / scene_id / f"{shot_id}.json"
        )

        use_existing = False

        if visual_path.exists():
            try:
                visual = load_json(visual_path)

                validate_json(
                    visual,
                    args.schemas_dir
                    / "visual_continuity.schema.json",
                )

                if (
                    visual["scene_id"] == scene_id
                    and visual["shot_id"] == shot_id
                ):
                    use_existing = True

            except Exception:
                use_existing = False

        if use_existing:
            print(
                f"{scene_id}/{shot_id}: "
                "SKIP valid existing continuity"
            )
        else:
            visual = generate_visual_continuity(
                builder=builder,
                master_script_scene=master_by_scene[scene_id],
                production_scene=production_by_scene[scene_id],
                shot=shot,
                previous_visual_continuity=(
                    previous_visual_continuity
                ),
                next_shot_context=next_shot_context,
                prompts_dir=args.prompts_dir,
                schemas_dir=args.schemas_dir,
                model=args.model,
                api_key=api_key,
                debug_dir=temp_debug_dir,
            )

            save_json(
                visual_path,
                visual,
            )

        previous_visual_continuity = visual
        visual_results.append(visual)

    print(
        "PASS: Visual Continuity complete:",
        len(visual_results),
        "shots",
    )

    # ============================================================
    # VIDU READY
    # ============================================================

    print()
    print("===== VIDU READY GENERATION =====")

    vidu_root = episode_dir / "05_vidu_ready"
    vidu_results = []

    for shot, visual in zip(
        ordered_shots,
        visual_results,
    ):
        scene_id = shot["scene_id"]
        shot_id = shot["shot_id"]

        vidu_path = (
            vidu_root / scene_id / f"{shot_id}.json"
        )

        use_existing = False

        if vidu_path.exists():
            try:
                vidu_ready = load_json(vidu_path)

                validate_json(
                    vidu_ready,
                    args.schemas_dir / "vidu_ready.schema.json",
                )

                if (
                    vidu_ready["scene_id"] == scene_id
                    and vidu_ready["shot_id"] == shot_id
                ):
                    use_existing = True

            except Exception:
                use_existing = False

        if use_existing:
            print(
                f"{scene_id}/{shot_id}: "
                "SKIP valid existing VIDU-ready"
            )
        else:
            vidu_ready = generate_vidu_ready(
                builder=builder,
                production_scene=production_by_scene[scene_id],
                shot=shot,
                visual_continuity=visual,
                prompts_dir=args.prompts_dir,
                schemas_dir=args.schemas_dir,
                model=args.model,
                api_key=api_key,
                debug_dir=temp_debug_dir,
            )

            save_json(
                vidu_path,
                vidu_ready,
            )

        vidu_results.append(vidu_ready)

    if len(vidu_results) != len(ordered_shots):
        raise ValueError(
            "VIDU-ready count mismatch: "
            f"shots={len(ordered_shots)} "
            f"vidu={len(vidu_results)}"
        )

    print()
    print("===== V2 VIDU READY COMPLETE =====")
    print("scenes:", len(master_script["scenes"]))
    print("shots:", len(ordered_shots))
    print("vidu-ready:", len(vidu_results))
    print("output:", vidu_root)


if __name__ == "__main__":
    main()
