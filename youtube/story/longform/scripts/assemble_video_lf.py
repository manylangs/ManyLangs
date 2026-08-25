#!/usr/bin/env python3
"""
assemble_video_lf.py

story/longform 20씬 에피소드를 하나의 세로형 mp4로 합본한다.
assemble_video.py의 핵심 로직(make_motion_filter, build_main_clip,
normalize_outro, concat_clips)을 씬 단위로 반복 적용하고,
scene_plan의 location이 바뀌는 지점에 전환 카드를 자동 삽입한다.

전제 (기존 결정 사항):
  - 말풍선 이미지는 GPT로 수동 제작 (자동 생성 없음)
  - 이미지 파일명 규칙: scenes/{scene_id}/{scene_id}_{line_no:03d}.png
    (예: scenes/005/005_001.png ~ 005_006.png, 씬마다 줄수 가변)
  - 오디오: scenes/{scene_id}/{scene_id}.mp3
  - target SRT: scenes/{scene_id}/{scene_id}.target.srt
  - 씬별 실제 줄수는 scenes/{scene_id}/{scene_id}.json의
    blocks[0]["lines"] 길이로 확인 (scene_plan 대신 실제 산출물 기준)

전환 카드:
  - scene_plan[i]["location"] != scene_plan[i-1]["location"]일 때만 삽입
  - 이미지 생성 없이 ffmpeg lavfi 색상 배경 + drawtext로 즉시 생성 (비용 0)
  - 길이 1.5초 고정, 모션 없음 (기존 합의: 모션 최소화 원칙)

사용:
cd /Users/junghasuk/Desktop/ManyLangs/web/youtube/story/longform/scripts
python3 assemble_video_lf.py /path/to/ep_dir
"""

import argparse
import json
import re
import subprocess
from pathlib import Path

OUTPUT_WIDTH = 1080
OUTPUT_HEIGHT = 1920
FPS = 30
MAX_ZOOM = 1.04

DEFAULT_OUTRO_ASSET = "outro_cta.png"
OUTRO_DURATION = 1.5
TRANSITION_CARD_DURATION = 1.5

CC_TEXT = "CC  Turn on subtitles"
CC_FONT_SIZE = 46
WATERMARK_Y = 1404
CC_WATERMARK_GAP = 70

SRT_TIME_RE = re.compile(
    r"(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*"
    r"(\d{2}):(\d{2}):(\d{2}),(\d{3})"
)


# ---------------------------------------------------------------------------
# ffmpeg 실행 (assemble_video.py 그대로)
# ---------------------------------------------------------------------------

def run(cmd, description):
    print(f"\n  [ffmpeg] {description}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.stderr:
        print(result.stderr[-2000:])
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg 실패: {description}")
    return result


# ---------------------------------------------------------------------------
# SRT 파싱 (assemble_video.py 그대로)
# ---------------------------------------------------------------------------

def _srt_ts_to_ms(h, m, s, ms):
    return int(h) * 3_600_000 + int(m) * 60_000 + int(s) * 1000 + int(ms)


def parse_timings_from_srt(srt_path):
    text = Path(srt_path).read_text(encoding="utf-8")
    timings = []
    for match in SRT_TIME_RE.finditer(text):
        h1, m1, s1, ms1, h2, m2, s2, ms2 = match.groups()
        timings.append((_srt_ts_to_ms(h1, m1, s1, ms1), _srt_ts_to_ms(h2, m2, s2, ms2)))
    return timings


def escape_drawtext_text(value):
    return (
        value.replace("\\", "\\\\")
        .replace("'", r"\\'")
        .replace(":", r"\\:")
        .replace("%", r"\\%")
    )


def find_font():
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial Bold.ttf",
        "/Library/Fonts/Arial.ttf",
    ]
    for font in candidates:
        if Path(font).exists():
            return font
    return None


# ---------------------------------------------------------------------------
# 이미지 모션 필터 (assemble_video.py 그대로 -- 이미지 개수 무관하게 동작)
# ---------------------------------------------------------------------------

def make_motion_filter(index, duration_s, font_path=None):
    frames = max(int(round(duration_s * FPS)), 1)
    zoom_step = (MAX_ZOOM - 1.0) / max(frames - 1, 1)

    filter_string = (
        f"[{index}:v]"
        f"scale=2160:3840:force_original_aspect_ratio=increase,"
        f"crop=2160:3840,"
        f"zoompan=z='min(1+on*{zoom_step:.10f},{MAX_ZOOM})':"
        f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
        f"d={frames}:s=2160x3840:fps={FPS},"
        f"scale={OUTPUT_WIDTH}:{OUTPUT_HEIGHT},"
        f"trim=duration={duration_s:.3f},setpts=PTS-STARTPTS,setsar=1"
    )

    escaped_font = None
    if font_path:
        escaped_font = font_path.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")

    cc_drawtext = "drawtext="
    if escaped_font:
        cc_drawtext += f"fontfile='{escaped_font}':"
    cc_drawtext += (
        f"text='{escape_drawtext_text(CC_TEXT)}':"
        f"fontsize={CC_FONT_SIZE}:fontcolor=white:"
        f"borderw=3:bordercolor=black@0.75:"
        f"box=1:boxcolor=black@0.45:boxborderw=18:"
        f"x=(w-text_w)/2:y={WATERMARK_Y}-{CC_WATERMARK_GAP}-text_h"
    )

    return filter_string + "," + cc_drawtext + f"[v{index}]"


# ---------------------------------------------------------------------------
# 씬 하나 -> 짧은 mp4 (assemble_video.py의 build_main_clip을 그대로,
# 이미지 개수는 씬마다 가변)
# ---------------------------------------------------------------------------

def build_scene_clip(image_paths, audio_path, line_boundaries_ms, out_path):
    from pydub import AudioSegment

    total_ms = len(AudioSegment.from_file(audio_path))
    font_path = find_font()

    inputs = []
    filter_parts = []
    for i, (img, (seg_start_ms, seg_end_ms)) in enumerate(zip(image_paths, line_boundaries_ms)):
        duration_s = max((seg_end_ms - seg_start_ms) / 1000.0, 0.1)
        print(f"  이미지 {i + 1:03d}: {img.name} -> {duration_s:.3f}초")
        inputs += ["-i", str(img)]
        filter_parts.append(make_motion_filter(i, duration_s, font_path))

    concat_inputs = "".join(f"[v{i}]" for i in range(len(image_paths)))
    filter_complex = (
        ";".join(filter_parts) + ";" + concat_inputs
        + f"concat=n={len(image_paths)}:v=1:a=0[outv]"
    )

    video_only_path = out_path.with_name(out_path.stem + "_video_only.mp4")

    run([
        "ffmpeg", "-y", *inputs,
        "-filter_complex", filter_complex,
        "-map", "[outv]",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", str(FPS),
        "-t", f"{total_ms / 1000:.3f}",
        str(video_only_path),
    ], "씬 비디오 생성")

    run([
        "ffmpeg", "-y",
        "-i", str(video_only_path),
        "-i", str(audio_path),
        "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
        "-ar", "48000", "-ac", "2",
        "-map", "0:v", "-map", "1:a", "-shortest",
        str(out_path),
    ], "오디오 붙이기")

    video_only_path.unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# 전환 카드 (장소가 바뀔 때만 삽입, 이미지 생성 없이 즉시 만듦)
# ---------------------------------------------------------------------------

def build_transition_card(location_text, out_path, duration=TRANSITION_CARD_DURATION):
    font_path = find_font()
    escaped_font = None
    if font_path:
        escaped_font = font_path.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")

    drawtext = "drawtext="
    if escaped_font:
        drawtext += f"fontfile='{escaped_font}':"
    drawtext += (
        f"text='{escape_drawtext_text(location_text)}':"
        f"fontsize=64:fontcolor=white:"
        f"borderw=0:box=0:"
        f"x=(w-text_w)/2:y=(h-text_h)/2"
    )

    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", f"color=c=black:s={OUTPUT_WIDTH}x{OUTPUT_HEIGHT}:d={duration}:r={FPS}",
        "-f", "lavfi",
        "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
        "-vf", drawtext,
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2",
        "-t", f"{duration:.3f}",
        "-shortest",
        str(out_path),
    ]
    run(cmd, f"전환 카드: {location_text}")


# ---------------------------------------------------------------------------
# 아웃트로 (assemble_video.py 그대로)
# ---------------------------------------------------------------------------

def normalize_outro(src_path, out_path, duration):
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-i", str(src_path),
        "-f", "lavfi",
        "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
        "-filter_complex", (
            f"[0:v]scale={OUTPUT_WIDTH}:{OUTPUT_HEIGHT}:force_original_aspect_ratio=decrease,"
            f"pad={OUTPUT_WIDTH}:{OUTPUT_HEIGHT}:(ow-iw)/2:(oh-ih)/2,fps={FPS},setsar=1[v]"
        ),
        "-map", "[v]", "-map", "1:a",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", str(FPS),
        "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2",
        "-t", f"{duration:.3f}", "-shortest",
        str(out_path),
    ]
    run(cmd, f"{src_path.name} -> {duration:.1f}초 아웃트로")


def concat_clips(clip_paths, out_path, workdir):
    list_file = workdir / "_concat_list.txt"
    list_file.write_text(
        "".join(f"file '{p.resolve()}'\n" for p in clip_paths), encoding="utf-8"
    )
    run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", str(list_file), "-c", "copy", str(out_path),
    ], f"{len(clip_paths)}개 클립 concat")
    list_file.unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# 씬 하나 조립 (이미지 경로 + SRT 타이밍 확인 후 build_scene_clip 호출)
# ---------------------------------------------------------------------------

def assemble_scene(scene_dir, scene_id):
    audio_path = scene_dir / f"{scene_id}.mp3"
    srt_path = scene_dir / f"{scene_id}.target.srt"
    runtime_json_path = scene_dir / f"{scene_id}.json"

    for p in [audio_path, srt_path, runtime_json_path]:
        if not p.exists():
            raise FileNotFoundError(f"필요한 파일 없음: {p}")

    line_count = len(json.loads(runtime_json_path.read_text(encoding="utf-8"))["blocks"][0]["lines"])
    image_paths = [scene_dir / f"{scene_id}_{i:03d}.png" for i in range(1, line_count + 1)]
    for p in image_paths:
        if not p.exists():
            raise FileNotFoundError(f"씬 {scene_id} 이미지 없음: {p} (GPT 수동 제작 필요)")

    timings = parse_timings_from_srt(srt_path)
    if len(timings) != line_count:
        raise ValueError(f"씬 {scene_id}: SRT 타이밍 {len(timings)}개 != 줄수 {line_count}")

    from pydub import AudioSegment
    total_ms = len(AudioSegment.from_file(audio_path))

    line_boundaries_ms = []
    for i, (start_ms, _end_ms) in enumerate(timings):
        next_start_ms = timings[i + 1][0] if i + 1 < len(timings) else total_ms
        line_boundaries_ms.append((start_ms, next_start_ms))

    scene_clip = scene_dir / f"{scene_id}.scene.mp4"
    build_scene_clip(image_paths, audio_path, line_boundaries_ms, scene_clip)
    return scene_clip


# ---------------------------------------------------------------------------
# 전체 에피소드 조립
# ---------------------------------------------------------------------------

def assemble_episode(ep_dir, outro_asset=None):
    ep_dir = Path(ep_dir)
    episode_json_path = ep_dir / "episode.json"
    if not episode_json_path.exists():
        raise FileNotFoundError(f"episode.json 없음: {episode_json_path}")

    episode = json.loads(episode_json_path.read_text(encoding="utf-8"))
    episode_id = episode["episode_id"]
    scene_plan = episode["scene_plan"]

    clips_to_concat = []
    prev_location = None

    print(f"\n[에피소드 조립] {episode_id} -- 총 {len(scene_plan)}씬")

    for spec in scene_plan:
        scene_id = spec["scene_id"]
        location = spec.get("location")

        if location and location != prev_location:
            card_path = ep_dir / "scenes" / scene_id / f"{scene_id}.transition.mp4"
            build_transition_card(location, card_path)
            clips_to_concat.append(card_path)
        prev_location = location

        scene_dir = ep_dir / "scenes" / scene_id
        scene_clip = assemble_scene(scene_dir, scene_id)
        clips_to_concat.append(scene_clip)

    common_assets_dir = Path(__file__).resolve().parent
    outro_asset = Path(outro_asset) if outro_asset else common_assets_dir / DEFAULT_OUTRO_ASSET
    if outro_asset.exists():
        norm_outro = ep_dir / "_outro_norm.mp4"
        normalize_outro(outro_asset, norm_outro, OUTRO_DURATION)
        clips_to_concat.append(norm_outro)
    else:
        print(f"  [건너뜀] outro 자산 없음 ({outro_asset})")

    final_path = ep_dir / f"{episode_id}.final.mp4"
    concat_clips(clips_to_concat, final_path, ep_dir)

    for p in clips_to_concat:
        p.unlink(missing_ok=True)

    print(f"\n[완성] {final_path}")
    return final_path


def main():
    parser = argparse.ArgumentParser(description="story/longform 20씬 -> 최종 mp4 합본")
    parser.add_argument("ep_dir", help="episode.json이 있는 에피소드 폴더 경로")
    parser.add_argument("--outro", default=None)
    args = parser.parse_args()
    assemble_episode(args.ep_dir, outro_asset=args.outro)


if __name__ == "__main__":
    main()
