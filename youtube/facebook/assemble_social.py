#!/usr/bin/env python3
"""
assemble_social.py

Facebook / Instagram / X 용 mp4를 만든다.

assemble_video.py(YouTube용)와 거의 동일하지만 다음이 다르다:

  - "CC  Turn on subtitles" 안내 텍스트를 이미지에 번인하지 않는다.
    (YouTube CC 트랙 개념이 없는 플랫폼이라 그 안내 자체가 의미 없음)
  - 결과물을 원본 conversation/{lang}/{base}/ 폴더에 섞어 넣지 않고,
    이 스크립트가 있는 facebook/ 폴더 아래
        facebook/{Language}/{Series}/{Level}/{topic}/{topic}.insta.mp4
        facebook/{Language}/{Series}/{Level}/{topic}/{topic}.fx.mp4
    경로에 별도로 저장한다. (post_facebook.py 가 기대하는 구조와 동일)
  - 최종본을 2개 만든다. 본편(이미지+오디오)은 완전히 동일하고, 마지막에
    붙는 CTA 아웃트로 이미지만 서로 다르다:
      .insta.mp4 -> conversation/outro_cta.png (인스타그램용)
      .fx.mp4    -> conversation/outro_cta_facebook.png (페이스북/X용)
    본편 인코딩(가장 무거운 단계)은 한 번만 수행하고, 그 결과물에
    서로 다른 아웃트로만 각각 이어 붙여 2개를 뽑는다.

6장의 이미지({base}_001.png ~ {base}_006.png)와
target SRT의 문장별 타이밍, MP3 오디오는 conversation/{lang}/{level}_{topic}/
폴더에서 그대로 읽어온다 (소스 위치는 바뀌지 않음).

사용 (대화형):

cd /Users/junghasuk/Desktop/ManyLangs/web/youtube/facebook

python3 assemble_social.py

  1) 지원 언어 번호 목록에서 번호 입력
  2) 시리즈 선택 (Conversation / Vocabulary / Idiom / Real Life Situations)
  3) conversation/{lang}/ 아래 a1_~c2_ 로 시작하는 하위 폴더를
     번호로 보여주고 선택
  4) 선택한 폴더로 소셜용 mp4 2개(.insta.mp4, .fx.mp4)를
     facebook/{Language}/{Series}/{Level}/{topic}/ 아래 조립
"""

import re
import subprocess
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
CONVERSATION_DIR = BASE_DIR.parent / "conversation"
OUTPUT_ROOT_DIR = BASE_DIR

OUTPUT_WIDTH = 1080
OUTPUT_HEIGHT = 1920
FPS = 30
MAX_ZOOM = 1.04

# 최종본 2개가 각각 사용하는 아웃트로 자산과 파일명 접미사.
# (접미사, 아웃트로 이미지 경로) 튜플 리스트 -- 순서대로 처리한다.
OUTRO_VARIANTS = [
    ("insta", CONVERSATION_DIR / "outro_cta.png"),
    ("fx", CONVERSATION_DIR / "outro_cta_facebook.png"),
]
OUTRO_DURATION = 1.5

SRT_TIME_RE = re.compile(
    r"(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*"
    r"(\d{2}):(\d{2}):(\d{2}),(\d{3})"
)

# 언어 코드 -> facebook/{Language}/ 폴더명
# (post_facebook.py 의 LANGUAGES["name"] 과 동일하게 맞춰야 함)
#
# 다른 파이프라인 스크립트(youtube_upload.py, assemble_video.py,
# watermark 스크립트 등)와 동일하게, 내부 관리 코드는 이 딕셔너리의 키를
# 그대로 쓴다 (일본어는 내부적으로 "jp"). 새 언어를 추가/삭제/순서 변경
# 하고 싶으면 이 딕셔너리만 수정하면 되고, 언어 선택 메뉴의 번호는 등록
# 순서대로 자동으로 매겨진다.
LANGUAGE_NAMES = {
    "en": "English",
    "kr": "Korean",
    "jp": "Japanese",
    "zh": "Chinese",
    "es": "Spanish",
    "fr": "French",
    "pt": "Portuguese",
    "de": "German",
    "ru": "Russian",
}

# 시리즈 목록. 나중에 새 시리즈가 생기면 여기에만 추가하면 됨.
SERIES_OPTIONS = [
    "Conversation",
    "Vocabulary",
    "Idiom",
    "Real Life Situations",
]

LEVEL_PREFIX_RE = re.compile(r"^(a1|a2|b1|b2|c1|c2)_", re.IGNORECASE)


def run(cmd, description):
    print(f"\n  [ffmpeg] {description}")
    print(f"  명령어: {' '.join(cmd)}")

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.stderr:
        print(result.stderr[-2000:])

    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg 실패: {description}")

    return result


def _srt_ts_to_ms(h, m, s, ms):
    return int(h) * 3_600_000 + int(m) * 60_000 + int(s) * 1000 + int(ms)


def parse_timings_from_srt(srt_path):
    text = Path(srt_path).read_text(encoding="utf-8")
    timings = []

    for match in SRT_TIME_RE.finditer(text):
        h1, m1, s1, ms1, h2, m2, s2, ms2 = match.groups()
        start_ms = _srt_ts_to_ms(h1, m1, s1, ms1)
        end_ms = _srt_ts_to_ms(h2, m2, s2, ms2)
        timings.append((start_ms, end_ms))

    return timings


def make_motion_filter(index, duration_s):
    frames = max(int(round(duration_s * FPS)), 1)
    zoom_step = (MAX_ZOOM - 1.0) / max(frames - 1, 1)

    filter_string = (
        f"[{index}:v]"
        f"scale=2160:3840:"
        f"force_original_aspect_ratio=increase,"
        f"crop=2160:3840,"
        f"zoompan="
        f"z='min(1+on*{zoom_step:.10f},{MAX_ZOOM})':"
        f"x='iw/2-(iw/zoom/2)':"
        f"y='ih/2-(ih/zoom/2)':"
        f"d={frames}:"
        f"s=2160x3840:"
        f"fps={FPS},"
        f"scale={OUTPUT_WIDTH}:{OUTPUT_HEIGHT},"
        f"trim=duration={duration_s:.3f},"
        f"setpts=PTS-STARTPTS,"
        f"setsar=1"
        f"[v{index}]"
    )

    return filter_string


def build_main_clip(image_paths, audio_path, line_boundaries_ms, out_path):
    from pydub import AudioSegment

    total_ms = len(AudioSegment.from_file(audio_path))

    inputs = []
    filter_parts = []

    for i, (img, (seg_start_ms, seg_end_ms)) in enumerate(
        zip(image_paths, line_boundaries_ms)
    ):
        duration_s = max((seg_end_ms - seg_start_ms) / 1000.0, 0.1)
        print(f"  이미지 {i + 1:03d}: {img.name} -> {duration_s:.3f}초")

        inputs += ["-i", str(img)]
        filter_parts.append(make_motion_filter(i, duration_s))

    concat_inputs = "".join(f"[v{i}]" for i in range(len(image_paths)))

    filter_complex = (
        ";".join(filter_parts)
        + ";"
        + concat_inputs
        + f"concat=n={len(image_paths)}:v=1:a=0[outv]"
    )

    video_only_path = out_path.with_name(out_path.stem + "_video_only.mp4")

    cmd_video = [
        "ffmpeg", "-y",
        *inputs,
        "-filter_complex", filter_complex,
        "-map", "[outv]",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-r", str(FPS),
        "-t", f"{total_ms / 1000:.3f}",
        str(video_only_path),
    ]

    run(cmd_video, "비디오 생성 (전환 + 미세 줌, CC 안내 없음)")

    cmd_audio = [
        "ffmpeg", "-y",
        "-i", str(video_only_path),
        "-i", str(audio_path),
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "128k",
        "-ar", "48000",
        "-ac", "2",
        "-map", "0:v",
        "-map", "1:a",
        "-shortest",
        str(out_path),
    ]

    run(cmd_audio, "오디오 붙이기")

    video_only_path.unlink(missing_ok=True)


def normalize_outro(src_path, out_path, duration):
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1",
        "-i", str(src_path),
        "-f", "lavfi",
        "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
        "-filter_complex",
        (
            f"[0:v]"
            f"scale={OUTPUT_WIDTH}:{OUTPUT_HEIGHT}:"
            f"force_original_aspect_ratio=decrease,"
            f"pad={OUTPUT_WIDTH}:{OUTPUT_HEIGHT}:(ow-iw)/2:(oh-ih)/2,"
            f"fps={FPS},"
            f"setsar=1"
            f"[v]"
        ),
        "-map", "[v]",
        "-map", "1:a",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-r", str(FPS),
        "-c:a", "aac",
        "-b:a", "128k",
        "-ar", "48000",
        "-ac", "2",
        "-t", f"{duration:.3f}",
        "-shortest",
        str(out_path),
    ]

    run(cmd, f"{src_path.name} -> {duration:.1f}초 아웃트로")


def concat_clips(clip_paths, out_path, workdir, list_filename):
    list_file = workdir / list_filename

    list_file.write_text(
        "".join(f"file '{p.resolve()}'\n" for p in clip_paths),
        encoding="utf-8",
    )

    cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(list_file),
        "-c", "copy",
        str(out_path),
    ]

    run(cmd, f"{len(clip_paths)}개 클립 concat -> {out_path.name}")

    list_file.unlink(missing_ok=True)


def build_variant(main_clip, outro_asset, final_path, out_dir, suffix):
    """main_clip(본편, 공용)에 outro_asset을 붙여 final_path 하나를 만든다.
    outro_asset이 없으면 아웃트로 없이 main_clip을 그대로 복사해 final_path로 남긴다.
    main_clip 자체는 여기서 지우지 않는다 (다른 variant에서도 재사용해야 하므로)."""
    if outro_asset.exists():
        norm_outro = out_dir / f"_outro_norm_{suffix}.mp4"
        normalize_outro(outro_asset, norm_outro, OUTRO_DURATION)

        concat_clips(
            [main_clip, norm_outro],
            final_path,
            out_dir,
            list_filename=f"_concat_list_{suffix}.txt",
        )

        norm_outro.unlink(missing_ok=True)
    else:
        print(f"  [건너뜀] {suffix}용 아웃트로 자산 없음 ({outro_asset}) -- 본편만 저장")
        if final_path.exists():
            final_path.unlink()
        import shutil
        shutil.copy2(main_clip, final_path)

    print(f"  [완성] {suffix} -> {final_path}")


def assemble(item_dir, series_name):
    raw = Path(item_dir)

    if raw.is_absolute():
        src_dir = raw
    else:
        src_dir = (CONVERSATION_DIR / raw).resolve()

    if not src_dir.exists():
        raise FileNotFoundError(f"소스 폴더가 없습니다:\n{src_dir}")

    base = src_dir.name  # 예: a1_airport_greetings (소스 파일명은 그대로 사용)
    lang_code = src_dir.parent.name

    level_match = LEVEL_PREFIX_RE.match(base)
    if not level_match:
        raise ValueError(f"레벨을 폴더명에서 찾을 수 없습니다:\n{base}")

    level = level_match.group(1).upper()
    topic_name = LEVEL_PREFIX_RE.sub("", base)  # 레벨 접두사 제거 -> 출력 폴더/파일명
    language_name = LANGUAGE_NAMES.get(lang_code, lang_code)

    out_dir = OUTPUT_ROOT_DIR / language_name / series_name / level / topic_name
    out_dir.mkdir(parents=True, exist_ok=True)

    audio_path = src_dir / f"{base}.mp3"
    srt_path = src_dir / f"{base}.target.srt"
    image_paths = [src_dir / f"{base}_{i:03d}.png" for i in range(1, 7)]

    for p in [audio_path, srt_path, *image_paths]:
        if not p.exists():
            raise FileNotFoundError(f"필요한 파일 없음: {p}")

    timings = parse_timings_from_srt(srt_path)

    if len(timings) != 6:
        raise ValueError(
            f"target SRT에서 6개 타이밍을 못 찾음 (찾은 개수: {len(timings)})"
        )

    from pydub import AudioSegment

    total_ms = len(AudioSegment.from_file(audio_path))

    line_boundaries_ms = []

    for i, (start_ms, _end_ms) in enumerate(timings):
        if i + 1 < len(timings):
            next_start_ms = timings[i + 1][0]
        else:
            next_start_ms = total_ms

        line_boundaries_ms.append((start_ms, next_start_ms))

    print("\n[이미지 타이밍]")
    for i, (start_ms, end_ms) in enumerate(line_boundaries_ms, start=1):
        print(
            f"  {i:03d}: {start_ms / 1000:.3f}s -> {end_ms / 1000:.3f}s "
            f"({(end_ms - start_ms) / 1000:.3f}s)"
        )

    # 본편(이미지+오디오)은 두 최종본이 공유하는 공용 소스 -- 한 번만 만든다.
    main_clip = out_dir / f"{topic_name}.main.mp4"
    build_main_clip(image_paths, audio_path, line_boundaries_ms, main_clip)

    # 본편 하나에 서로 다른 아웃트로 2개를 각각 붙여 최종본 2개를 뽑는다.
    final_paths = []
    for suffix, outro_asset in OUTRO_VARIANTS:
        final_path = out_dir / f"{topic_name}.{suffix}.mp4"
        build_variant(main_clip, outro_asset, final_path, out_dir, suffix)
        final_paths.append(final_path)

    main_clip.unlink(missing_ok=True)

    print(f"\n[전체 완성] {len(final_paths)}개 최종본")
    for p in final_paths:
        print(f"  - {p}")

    return final_paths


def prompt_language():
    codes = list(LANGUAGE_NAMES.keys())

    print("\n지원 언어:")
    for i, code in enumerate(codes, start=1):
        print(f"  {i:>2} - {code} ({LANGUAGE_NAMES[code]})")

    choice = input("번호 입력: ").strip()

    if not choice.isdigit() or not (1 <= int(choice) <= len(codes)):
        raise ValueError(f"잘못된 번호: {choice}")

    return codes[int(choice) - 1]


def prompt_series():
    print("\n시리즈 선택:")

    for i, s in enumerate(SERIES_OPTIONS, start=1):
        print(f"  {i} - {s}")

    choice = input("번호 선택: ").strip()

    if not choice.isdigit() or not (1 <= int(choice) <= len(SERIES_OPTIONS)):
        raise ValueError(f"잘못된 번호: {choice}")

    return SERIES_OPTIONS[int(choice) - 1]


def list_language_folders(lang_code):
    lang_dir = CONVERSATION_DIR / lang_code

    if not lang_dir.exists():
        raise FileNotFoundError(f"언어 폴더가 없습니다:\n{lang_dir}")

    folders = [
        d
        for d in sorted(lang_dir.iterdir())
        if d.is_dir() and LEVEL_PREFIX_RE.match(d.name)
    ]

    if not folders:
        raise FileNotFoundError(f"대상 폴더가 없습니다:\n{lang_dir}")

    return folders


def prompt_folder_selection(folders):
    print("\n대상 폴더:")

    for i, d in enumerate(folders, start=1):
        print(f"  {i:>2} - {d.name}")

    choice = input("번호 선택: ").strip()

    if not choice.isdigit() or not (1 <= int(choice) <= len(folders)):
        raise ValueError(f"잘못된 번호: {choice}")

    return folders[int(choice) - 1]


def main():
    print()
    print("========================================")
    print("ManyLangs Social(Facebook/Instagram/X) 영상 조립")
    print("========================================")

    lang_code = prompt_language()
    series_name = prompt_series()
    folders = list_language_folders(lang_code)
    selected_dir = prompt_folder_selection(folders)

    item_dir = f"{lang_code}/{selected_dir.name}"

    print(f"\n[선택됨] {item_dir}  |  시리즈: {series_name}")

    assemble(item_dir, series_name)


if __name__ == "__main__":
    main()