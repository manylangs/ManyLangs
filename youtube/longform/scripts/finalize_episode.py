#!/usr/bin/env python3
"""
finalize_episode.py

Commit one completed episode into series-level persistence files:

- continuity_state.json
- learning_history.json

Design goals:
- Do not rewrite historical Episode JSONs.
- Use episode.json carry_out_state as the canonical cross-episode story handoff.
- Derive the final physical/location state from the final visual continuity shot when available.
- Aggregate learning expressions by discovering episode JSON files that contain key_expressions.
- Preserve existing series-level memory and increment revisions.
- No AI/API calls.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any


def load_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def unique_strings(items):
    out = []
    seen = set()
    for item in items:
        if not isinstance(item, str):
            continue
        value = item.strip()
        if not value or value in seen:
            continue
        seen.add(value)
        out.append(value)
    return out


def next_expression_number(expressions):
    highest = 0
    for item in expressions:
        value = item.get("expression_id", "")
        m = re.fullmatch(r"EXP_(\d{6})", value)
        if m:
            highest = max(highest, int(m.group(1)))
    return highest + 1


def normalize_expression_key(text):
    return " ".join(text.strip().lower().split())


def discover_learning_entries(episode_dir: Path):
    """
    Discover any episode JSON containing a top-level key_expressions list.

    This deliberately does not depend on one fixed folder name so it can
    survive minor pipeline layout changes.
    """
    entries = []

    for path in sorted(episode_dir.rglob("*.json")):
        try:
            data = load_json(path)
        except Exception:
            continue

        if not isinstance(data, dict):
            continue

        key_expressions = data.get("key_expressions")
        if not isinstance(key_expressions, list):
            continue

        for item in key_expressions:
            if not isinstance(item, dict):
                continue

            expression = item.get("expression")
            meaning = item.get("meaning")

            if not isinstance(expression, str) or not expression.strip():
                continue

            if not isinstance(meaning, str) or not meaning.strip():
                continue

            entries.append(
                {
                    "expression": expression.strip(),
                    "meaning": meaning.strip(),
                    "priority": item.get("priority"),
                    "source_file": str(path),
                }
            )

    return entries


def find_final_visual_continuity(episode_dir: Path):
    """
    Return the chronologically last visual continuity JSON if available.
    Files are ordered by scene and shot identifiers.
    """
    base = episode_dir / "04_visual_continuity"
    paths = sorted(base.glob("S*/SHOT_*.json"))
    if not paths:
        return None, None

    final_path = paths[-1]
    return final_path, load_json(final_path)


def infer_story_state_from_episode(episode):
    continuity = episode.get("continuity", {})
    carry_out = continuity.get("carry_out_state", [])
    return unique_strings(carry_out)


def infer_protagonist_state(final_visual, protagonist_ref):
    state = {
        "current_emotion": "neutral",
        "known_information": [],
        "current_goals": [],
    }

    if not isinstance(final_visual, dict):
        return state

    for char_state in final_visual.get("character_states", []):
        if char_state.get("character_ref") == protagonist_ref:
            emotion = char_state.get("emotion")
            if isinstance(emotion, str) and emotion.strip():
                state["current_emotion"] = emotion.strip()
            break

    story_state = final_visual.get("story_visual_state", {})
    resolved = story_state.get("resolved_visual_facts", [])
    unresolved = story_state.get("unresolved_visual_facts", [])

    state["known_information"] = unique_strings(resolved)

    # We intentionally do not convert unresolved visual facts into goals.
    # Goals must remain semantic story goals, not guessed from visuals.
    state["current_goals"] = []

    return state


def infer_location_state(final_visual, previous_current_location):
    if not isinstance(final_visual, dict):
        return {
            "current_location_ref": previous_current_location,
            "previous_location_ref": previous_current_location,
        }

    location = final_visual.get("location_state", {})
    current = location.get("location_ref")

    return {
        "current_location_ref": current,
        "previous_location_ref": previous_current_location,
    }


def infer_inventory_state(final_visual):
    if not isinstance(final_visual, dict):
        return []

    out = []
    for prop in final_visual.get("prop_states", []):
        prop_id = prop.get("prop_id")
        state = prop.get("state")

        if not isinstance(prop_id, str) or not prop_id:
            continue
        if not isinstance(state, str) or not state:
            continue

        out.append(
            {
                "item_id": prop_id,
                "owner_ref": prop.get("owner_ref"),
                "state": state,
            }
        )
    return out


def infer_unresolved_threads(final_visual, existing_threads):
    """
    Preserve existing explicit threads.

    Visual unresolved facts are not automatically promoted into thread objects,
    because continuity_state.schema requires stable thread IDs and semantic
    story ownership. This avoids inventing IDs or persistent plot threads.
    """
    return existing_threads


def merge_learning_history(history, new_entries, episode_id):
    expressions = history.get("expressions", [])
    by_key = {
        normalize_expression_key(item["expression"]): item
        for item in expressions
        if isinstance(item, dict)
        and isinstance(item.get("expression"), str)
    }

    next_num = next_expression_number(expressions)

    # Deduplicate within this episode.
    per_episode = {}
    for entry in new_entries:
        key = normalize_expression_key(entry["expression"])
        if key not in per_episode:
            per_episode[key] = entry

    for key, entry in per_episode.items():
        if key in by_key:
            item = by_key[key]
            item["last_episode_id"] = episode_id
            item["exposure_count"] = int(item.get("exposure_count", 0)) + 1

            # Treat core/useful expressions as taught; optional as exposure.
            if entry.get("priority") in {"core", "useful"}:
                item["teach_count"] = int(item.get("teach_count", 0)) + 1

            teach_count = int(item.get("teach_count", 0))
            exposure_count = int(item.get("exposure_count", 0))

            if teach_count >= 3 or exposure_count >= 5:
                item["status"] = "established"
            elif teach_count >= 2 or exposure_count >= 2:
                item["status"] = "reinforced"
            else:
                item["status"] = "introduced"

        else:
            taught = entry.get("priority") in {"core", "useful"}
            item = {
                "expression_id": f"EXP_{next_num:06d}",
                "expression": entry["expression"],
                "meaning": entry["meaning"],
                "first_episode_id": episode_id,
                "last_episode_id": episode_id,
                "teach_count": 1 if taught else 0,
                "exposure_count": 1,
                "status": "introduced",
            }
            expressions.append(item)
            by_key[key] = item
            next_num += 1

    history["expressions"] = expressions
    history["metadata"]["revision"] = int(
        history["metadata"].get("revision", 1)
    ) + 1

    return history


def finalize(series_dir: Path, episode_number: int):
    episode_dir = series_dir / f"episode_{episode_number:03d}"
    episode_path = episode_dir / "episode.json"
    continuity_path = series_dir / "continuity_state.json"
    learning_history_path = series_dir / "learning_history.json"

    for required in (
        episode_path,
        continuity_path,
        learning_history_path,
    ):
        if not required.is_file():
            raise FileNotFoundError(required)

    episode = load_json(episode_path)
    continuity = load_json(continuity_path)
    learning_history = load_json(learning_history_path)

    episode_id = episode["episode_id"]
    series_id = episode["series_id"]

    if continuity["series_id"] != series_id:
        raise ValueError("continuity_state series_id mismatch")

    if learning_history["series_id"] != series_id:
        raise ValueError("learning_history series_id mismatch")

    protagonist_ref = continuity["protagonist_ref"]

    final_visual_path, final_visual = find_final_visual_continuity(
        episode_dir
    )

    previous_current_location = continuity.get(
        "location_state", {}
    ).get("current_location_ref")

    carry_out = infer_story_state_from_episode(episode)

    if not carry_out:
        raise ValueError(
            "episode.json continuity.carry_out_state is empty"
        )

    # --------------------------------------------------------
    # CONTINUITY COMMIT
    # --------------------------------------------------------

    continuity["current_episode_id"] = episode_id

    continuity["protagonist_state"] = infer_protagonist_state(
        final_visual,
        protagonist_ref,
    )

    # Carry-out statements are canonical persistent story facts.
    continuity["story_facts"] = unique_strings(
        list(continuity.get("story_facts", [])) + carry_out
    )

    continuity["unresolved_threads"] = infer_unresolved_threads(
        final_visual,
        continuity.get("unresolved_threads", []),
    )

    continuity["inventory_state"] = infer_inventory_state(
        final_visual
    )

    continuity["location_state"] = infer_location_state(
        final_visual,
        previous_current_location,
    )

    continuity["metadata"]["revision"] = int(
        continuity["metadata"].get("revision", 1)
    ) + 1

    # --------------------------------------------------------
    # LEARNING COMMIT
    # --------------------------------------------------------

    learning_entries = discover_learning_entries(episode_dir)

    learning_history = merge_learning_history(
        learning_history,
        learning_entries,
        episode_id,
    )

    # --------------------------------------------------------
    # BACKUPS + SAVE
    # --------------------------------------------------------

    backup_dir = episode_dir / "_finalize_backup"
    backup_dir.mkdir(parents=True, exist_ok=True)

    save_json(
        backup_dir / "continuity_state.before_finalize.json",
        load_json(continuity_path),
    )
    save_json(
        backup_dir / "learning_history.before_finalize.json",
        load_json(learning_history_path),
    )

    save_json(continuity_path, continuity)
    save_json(learning_history_path, learning_history)

    # Small deterministic commit record for audit/debug.
    record = {
        "series_id": series_id,
        "episode_id": episode_id,
        "episode_number": episode_number,
        "final_visual_continuity_source": (
            str(final_visual_path)
            if final_visual_path is not None
            else None
        ),
        "carry_out_committed": carry_out,
        "learning_entries_discovered": len(learning_entries),
        "continuity_revision": continuity["metadata"]["revision"],
        "learning_history_revision": (
            learning_history["metadata"]["revision"]
        ),
    }

    save_json(
        episode_dir / "episode_finalize_commit.json",
        record,
    )

    return record


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--series-dir",
        type=Path,
        required=True,
    )
    parser.add_argument(
        "--episode-number",
        type=int,
        required=True,
    )
    args = parser.parse_args()

    record = finalize(
        args.series_dir,
        args.episode_number,
    )

    print("===== EPISODE FINALIZE COMMIT PASS =====")
    print(json.dumps(record, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
