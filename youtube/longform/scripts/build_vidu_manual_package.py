#!/usr/bin/env python3
import argparse
import json
import shutil
from pathlib import Path

def load_json(path):
    with Path(path).open(encoding="utf-8") as f:
        return json.load(f)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--series-dir", required=True)
    parser.add_argument("--episode-number", type=int, required=True)
    args = parser.parse_args()

    series_dir = Path(args.series_dir)
    episode_dir = series_dir / f"episode_{args.episode_number:03d}"
    vidu_root = episode_dir / "05_vidu_ready"
    out_root = episode_dir / "06_vidu_manual"

    files = sorted(vidu_root.glob("S*/SHOT_*.json"))
    if not files:
        raise FileNotFoundError(f"No VIDU-ready JSON files found: {vidu_root}")

    if out_root.exists():
        shutil.rmtree(out_root)
    out_root.mkdir(parents=True, exist_ok=True)

    total_duration = 0
    manifest_rows = []

    for index, path in enumerate(files, start=1):
        data = load_json(path)
        scene_id = data["scene_id"]
        shot_id = data["shot_id"]
        generation = data["generation"]
        final_prompt = data["prompt"]["final_prompt"].strip()
        negatives = data.get("negative_constraints", [])

        refs = []
        for actor in data.get("actors", []):
            refs.extend(actor.get("reference_asset_ids", []))

        ref_files = []
        for asset_id in refs:
            asset_path = series_dir / "reference_assets" / f"{asset_id}.json"
            asset = load_json(asset_path)
            source = asset["source"]

            if source["kind"] == "local_file":
                source_file = series_dir / source["value"]
                if not source_file.is_file():
                    raise FileNotFoundError(source_file)
                refs_dir = out_root / "_references"
                refs_dir.mkdir(parents=True, exist_ok=True)
                dest = refs_dir / source_file.name
                if not dest.exists():
                    shutil.copy2(source_file, dest)
                ref_files.append(str(Path("_references") / source_file.name))
            else:
                ref_files.append(source["value"])

        duration = generation["duration_seconds"]
        total_duration += duration

        scene_dir = out_root / scene_id
        scene_dir.mkdir(parents=True, exist_ok=True)
        txt_path = scene_dir / f"{shot_id}.txt"

        lines = [
            f"ORDER: {index:03d}/{len(files):03d}",
            f"SCENE: {scene_id}",
            f"SHOT: {shot_id}",
            f"DURATION: {duration} seconds",
            f"ASPECT RATIO: {generation['aspect_ratio']}",
            f"RESOLUTION: {generation['resolution']}",
            "",
            "REFERENCE IMAGE:",
        ]
        lines.extend([f"- {x}" for x in ref_files] or ["- NONE"])
        lines += ["", "PROMPT:", final_prompt, "", "NEGATIVE / DO-NOT-CHANGE NOTES:"]
        lines.extend([f"- {x}" for x in negatives] or ["- NONE"])
        lines += ["", "OUTPUT FILE:", f"{scene_id}_{shot_id}.mp4", ""]

        txt_path.write_text("\n".join(lines), encoding="utf-8")

        manifest_rows.append({
            "order": index,
            "scene_id": scene_id,
            "shot_id": shot_id,
            "duration_seconds": duration,
            "aspect_ratio": generation["aspect_ratio"],
            "resolution": generation["resolution"],
            "reference_files": ref_files,
            "work_file": str(txt_path.relative_to(out_root)),
            "output_file": f"{scene_id}_{shot_id}.mp4",
        })

    manifest = {
        "episode": f"episode_{args.episode_number:03d}",
        "shot_count": len(files),
        "total_duration_seconds": total_duration,
        "total_duration_minutes": round(total_duration / 60, 2),
        "shots": manifest_rows,
    }

    (out_root / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8"
    )

    checklist = [
        f"VIDU MANUAL WORK CHECKLIST - episode_{args.episode_number:03d}",
        "",
        f"TOTAL SHOTS: {len(files)}",
        f"TOTAL SOURCE DURATION: {total_duration} sec",
        "",
    ]
    for row in manifest_rows:
        checklist.append(
            f"[ ] {row['order']:03d}. {row['scene_id']}/{row['shot_id']} "
            f"({row['duration_seconds']}s) -> {row['output_file']}"
        )
    (out_root / "CHECKLIST.txt").write_text("\n".join(checklist) + "\n", encoding="utf-8")

    print("===== VIDU MANUAL PACKAGE PASS =====")
    print("output:", out_root)
    print("shots:", len(files))
    print("total seconds:", total_duration)
    print("total minutes:", round(total_duration / 60, 2))
    print("manifest:", out_root / "manifest.json")
    print("checklist:", out_root / "CHECKLIST.txt")

if __name__ == "__main__":
    main()
