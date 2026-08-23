#!/usr/bin/env python3
"""
assemble_video.py

6장의 이미지({base}_001.png ~ {base}_006.png)와
target SRT의 문장별 타이밍, MP3 오디오를 이용해
세로형 YouTube Shorts 영상을 만든다.

최종 구조:

001 (CC 안내)
002 (CC 안내)
003 (CC 안내)
004 (CC 안내)
005 (CC 안내)
006 (CC 안내)
outro_cta.png

인트로는 사용하지 않는다.

각 이미지에는 ChatGPT에서 target 문장 말풍선이 이미 들어가 있으므로
ffmpeg에서 학습 문장 자막은 별도로 번인하지 않는다.

001~006 모든 이미지에
"CC  Turn on subtitles"
안내를 고정 표시한다.

CC 안내 위치는 화면 상단이 아니라, make_bubbles.py가 그리는
하단 워터마크(www.manylangs.studio) 바로 위, 일정 간격을 두고 배치한다.
워터마크는 이미지 자체에 이미 합성되어 있어 정확한 픽셀 좌표를
스크립트가 알 수 없으므로, make_bubbles.py의 워터마크 계산식을
1080x1920 기준으로 재현해 얻은 근사치(WATERMARK_Y)를 사용하고,
오차에 대비해 간격(CC_WATERMARK_GAP)을 넉넉하게 둔다.

실제 자막 문장은 영상에 번인하지 않는다.
YouTube에 업로드한 SRT/CC 트랙을 사용자가 CC 버튼으로 켜서 본다.

각 이미지는 해당 문장 구간 동안 부드럽게
1.000 -> 1.040배까지 확대된다.

001 -> 002 -> 003 -> 004 -> 005 -> 006 순서로
SRT 타이밍에 맞춰 정확하게 전환한다.

학습언어 자막은 추후 YouTube CC 자막 트랙으로 별도 업로드한다.

사용:

cd /Users/junghasuk/Desktop/ManyLangs/web/youtube/conversation

python3 assemble_video.py en/a1_ordering_cafe
"""

import argparse
import re
import subprocess
from pathlib import Path


# ==========================================================
# 기본 설정
# ==========================================================

OUTPUT_WIDTH = 1080
OUTPUT_HEIGHT = 1920
FPS = 30

# 이미지 확대
MAX_ZOOM = 1.04

# 언어 공통 아웃트로
DEFAULT_OUTRO_ASSET = "outro_cta.png"

# 아웃트로 표시 시간
OUTRO_DURATION = 1.5

# 001~006 모두 표시되는 CC 안내
CC_TEXT = "CC  Turn on subtitles"
CC_FONT_SIZE = 46

# ------------------------------------------------------------
# CC 안내 위치 (워터마크 바로 위)
# ------------------------------------------------------------
#
# make_bubbles.py의 워터마크 계산 로직
# (SITE_FONT_RATIO=0.026 / SITE_BOTTOM_MARGIN_RATIO=0.245 /
#  SITE_BOX_PAD_Y_RATIO=0.010, 1080x1920 기준)을 재현해서 얻은
# 워터마크 박스 "상단" y좌표 근사치.
#
# 원본 이미지가 정확히 1080x1920이 아니거나 폰트 렌더링이
# 미세하게 다르면 실제 워터마크 위치와 몇 px 오차가 날 수 있으므로,
# 이 값은 "대략적인" 기준선으로 취급하고 CC_WATERMARK_GAP을
# 넉넉하게 잡아 겹치지 않도록 여유를 둔다.
WATERMARK_Y = 1404

# CC 안내 하단과 워터마크 상단 사이 여유 간격 (px)
# 오차 대비 넉넉하게 설정
CC_WATERMARK_GAP = 70


SRT_TIME_RE = re.compile(
    r"(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*"
    r"(\d{2}):(\d{2}):(\d{2}),(\d{3})"
)


# ==========================================================
# ffmpeg 실행
# ==========================================================

def run(cmd, description):

    print(f"\n  [ffmpeg] {description}")
    print(f"  명령어: {' '.join(cmd)}")

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True
    )

    if result.stderr:
        print(result.stderr[-2000:])

    if result.returncode != 0:
        raise RuntimeError(
            f"ffmpeg 실패: {description}"
        )

    return result


# ==========================================================
# SRT 시간 변환
# ==========================================================

def _srt_ts_to_ms(h, m, s, ms):

    return (
        int(h) * 3_600_000
        + int(m) * 60_000
        + int(s) * 1000
        + int(ms)
    )


def parse_timings_from_srt(srt_path):
    """
    target SRT에서
    (start_ms, end_ms) 타이밍을 읽는다.
    """

    text = Path(srt_path).read_text(
        encoding="utf-8"
    )

    timings = []

    for match in SRT_TIME_RE.finditer(text):

        (
            h1, m1, s1, ms1,
            h2, m2, s2, ms2
        ) = match.groups()

        start_ms = _srt_ts_to_ms(
            h1, m1, s1, ms1
        )

        end_ms = _srt_ts_to_ms(
            h2, m2, s2, ms2
        )

        timings.append(
            (start_ms, end_ms)
        )

    return timings


def parse_entries_from_srt(srt_path):
    """
    SRT에서 (start_ms, end_ms, text) 목록을 읽는다.
    여러 줄 자막은 한 줄로 합친다.
    """
    raw = Path(srt_path).read_text(encoding="utf-8-sig")
    blocks = re.split(r"\n\s*\n", raw.strip())
    entries = []

    for block in blocks:
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if not lines:
            continue

        time_index = next(
            (i for i, line in enumerate(lines) if "-->" in line),
            None
        )
        if time_index is None:
            continue

        match = SRT_TIME_RE.search(lines[time_index])
        if not match:
            continue

        h1, m1, s1, ms1, h2, m2, s2, ms2 = match.groups()
        start_ms = _srt_ts_to_ms(h1, m1, s1, ms1)
        end_ms = _srt_ts_to_ms(h2, m2, s2, ms2)
        subtitle = " ".join(lines[time_index + 1:]).strip()

        entries.append((start_ms, end_ms, subtitle))

    return entries


def escape_drawtext_text(value):
    """
    ffmpeg drawtext의 text='...' 안에 안전하게 들어가도록 escape한다.
    """
    return (
        value
        .replace("\\", "\\\\")
        .replace("'", r"\\'")
        .replace(":", r"\\:")
        .replace("%", r"\\%")
    )


def find_translation_srt(item_dir, base, target_srt):
    """
    item_dir의 상위 언어 폴더명을 이용해 번역 SRT를 자동 선택한다.

    예:
    conversation/en/a1_ordering_at_a_cafe
        -> a1_ordering_at_a_cafe.en.srt

    conversation/kr/a1_xxx
        -> a1_xxx.kr.srt
    """

    item_dir = Path(item_dir)

    # 현재 대화 폴더의 부모 폴더 = 언어 코드
    lang = item_dir.parent.name

    translation_srt = (
        item_dir
        / f"{base}.{lang}.srt"
    )

    if not translation_srt.exists():
        raise FileNotFoundError(
            "현재 언어 폴더에 대응하는 번역 SRT를 "
            "찾지 못했습니다:\n"
            f"{translation_srt}"
        )

    return translation_srt

# ==========================================================
# 폰트 찾기
# ==========================================================

def find_font():

    candidates = [

        # macOS
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",

        "/Library/Fonts/Arial Bold.ttf",
        "/Library/Fonts/Arial.ttf",
    ]

    for font in candidates:

        p = Path(font)

        if p.exists():
            return str(p)

    return None


# ==========================================================
# 이미지 움직임 필터
# ==========================================================

def make_motion_filter(
    index,
    duration_s,
    font_path=None
):
    """
    각 이미지를 부드럽게 확대한다.

    2160x3840 고해상도 공간에서 zoompan을 수행한 뒤
    최종 1080x1920으로 다운스케일한다.

    001~006 모든 이미지에는
    CC Turn on subtitles 안내만 고정 표시한다.
    안내 위치는 하단 워터마크 바로 위, 여유 간격을 두고 배치한다.

    실제 YouTube CC 자막은 영상 픽셀이 아니라
    YouTube 플레이어가 별도로 렌더링한다.
    """

    frames = max(
        int(round(duration_s * FPS)),
        1
    )

    zoom_step = (
        (MAX_ZOOM - 1.0)
        / max(frames - 1, 1)
    )

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
    )

    escaped_font = None
    if font_path:
        escaped_font = (
            font_path
            .replace("\\", "\\\\")
            .replace(":", "\\:")
            .replace("'", "\\'")
        )

    # CC 안내: 001~006 모두 표시
    # y좌표는 ffmpeg drawtext가 런타임에 계산하는 text_h(실제 렌더링된
    # CC 텍스트 높이)를 그대로 이용해서, 폰트가 달라져도 워터마크와의
    # 간격이 항상 CC_WATERMARK_GAP만큼 정확히 유지되도록 한다.
    cc_drawtext = "drawtext="
    if escaped_font:
        cc_drawtext += f"fontfile='{escaped_font}':"

    cc_drawtext += (
        f"text='{escape_drawtext_text(CC_TEXT)}':"
        f"fontsize={CC_FONT_SIZE}:"
        f"fontcolor=white:"
        f"borderw=3:"
        f"bordercolor=black@0.75:"
        f"box=1:"
        f"boxcolor=black@0.45:"
        f"boxborderw=18:"
        f"x=(w-text_w)/2:"
        f"y={WATERMARK_Y}-{CC_WATERMARK_GAP}-text_h"
    )

    filter_string += "," + cc_drawtext

    filter_string += f"[v{index}]"
    return filter_string


# ==========================================================
# 본문 영상 생성
# ==========================================================

def build_main_clip(
    image_paths,
    audio_path,
    line_boundaries_ms,
    out_path
):
    """
    6장의 이미지를 각각 움직이는 짧은 클립으로 만든 뒤

    001
    002
    003
    004
    005
    006

    순서대로 연결한다.

    001~006 모두 CC 안내만 표시한다.

    그 후 MP3 오디오를 붙인다.
    """

    from pydub import AudioSegment

    total_ms = len(
        AudioSegment.from_file(
            audio_path
        )
    )

    font_path = find_font()

    if font_path:

        print(
            f"\n[CC 안내 폰트] {font_path}"
        )

    else:

        print(
            "\n[경고] Arial 폰트를 찾지 못했습니다."
        )

    # ------------------------------------------------------
    # 1. 이미지 입력
    # ------------------------------------------------------

    inputs = []
    filter_parts = []

    for i, (
        img,
        (seg_start_ms, seg_end_ms)
    ) in enumerate(
        zip(
            image_paths,
            line_boundaries_ms
        )
    ):

        duration_s = max(
            (
                seg_end_ms
                - seg_start_ms
            ) / 1000.0,
            0.1
        )

        print(
            f"  이미지 {i + 1:03d}: "
            f"{img.name} "
            f"-> {duration_s:.3f}초"
        )

        inputs += [
            "-i",
            str(img)
        ]

        filter_parts.append(
            make_motion_filter(
                i,
                duration_s,
                font_path
            )
        )

    # ------------------------------------------------------
    # 2. 6개 이미지 연결
    # ------------------------------------------------------

    concat_inputs = "".join(
        f"[v{i}]"
        for i in range(
            len(image_paths)
        )
    )

    filter_complex = (
        ";".join(filter_parts)
        + ";"
        + concat_inputs
        + (
            f"concat="
            f"n={len(image_paths)}:"
            f"v=1:a=0"
            f"[outv]"
        )
    )

    video_only_path = (
        out_path.with_name(
            out_path.stem
            + "_video_only.mp4"
        )
    )

    cmd_video = [

        "ffmpeg",
        "-y",

        *inputs,

        "-filter_complex",
        filter_complex,

        "-map",
        "[outv]",

        "-c:v",
        "libx264",

        "-pix_fmt",
        "yuv420p",

        "-r",
        str(FPS),

        "-t",
        f"{total_ms / 1000:.3f}",

        str(video_only_path),
    ]

    run(
        cmd_video,
        "비디오 생성 "
        "(001~006 CC 안내 + 전환 + 미세 줌)"
    )

    # ------------------------------------------------------
    # 3. MP3 오디오 붙이기
    # ------------------------------------------------------

    cmd_audio = [

        "ffmpeg",
        "-y",

        "-i",
        str(video_only_path),

        "-i",
        str(audio_path),

        "-c:v",
        "copy",

        "-c:a",
        "aac",

        "-b:a",
        "128k",

        "-ar",
        "48000",

        "-ac",
        "2",

        "-map",
        "0:v",

        "-map",
        "1:a",

        "-shortest",

        str(out_path),
    ]

    run(
        cmd_audio,
        "오디오 붙이기"
    )

    # 임시 비디오 삭제

    video_only_path.unlink(
        missing_ok=True
    )


# ==========================================================
# 아웃트로 이미지 -> 영상
# ==========================================================

def normalize_outro(
    src_path,
    out_path,
    duration
):
    """
    outro PNG/JPG 한 장을 지정 시간 동안 표시되는

    1080x1920
    30fps
    H.264
    AAC 48kHz stereo

    무음 MP4로 변환한다.
    """

    cmd = [

        "ffmpeg",
        "-y",

        "-loop",
        "1",

        "-i",
        str(src_path),

        "-f",
        "lavfi",

        "-i",
        (
            "anullsrc="
            "channel_layout=stereo:"
            "sample_rate=48000"
        ),

        "-filter_complex",
        (
            f"[0:v]"
            f"scale="
            f"{OUTPUT_WIDTH}:"
            f"{OUTPUT_HEIGHT}:"
            f"force_original_aspect_ratio=decrease,"
            f"pad="
            f"{OUTPUT_WIDTH}:"
            f"{OUTPUT_HEIGHT}:"
            f"(ow-iw)/2:"
            f"(oh-ih)/2,"
            f"fps={FPS},"
            f"setsar=1"
            f"[v]"
        ),

        "-map",
        "[v]",

        "-map",
        "1:a",

        "-c:v",
        "libx264",

        "-pix_fmt",
        "yuv420p",

        "-r",
        str(FPS),

        "-c:a",
        "aac",

        "-b:a",
        "128k",

        "-ar",
        "48000",

        "-ac",
        "2",

        "-t",
        f"{duration:.3f}",

        "-shortest",

        str(out_path),
    ]

    run(
        cmd,
        f"{src_path.name} -> "
        f"{duration:.1f}초 아웃트로"
    )


# ==========================================================
# 클립 연결
# ==========================================================

def concat_clips(
    clip_paths,
    out_path,
    workdir
):
    """
    main + outro 연결
    """

    list_file = (
        workdir
        / "_concat_list.txt"
    )

    list_file.write_text(
        "".join(
            (
                f"file "
                f"'{p.resolve()}'\n"
            )
            for p in clip_paths
        ),
        encoding="utf-8"
    )

    cmd = [

        "ffmpeg",
        "-y",

        "-f",
        "concat",

        "-safe",
        "0",

        "-i",
        str(list_file),

        "-c",
        "copy",

        str(out_path)
    ]

    run(
        cmd,
        f"{len(clip_paths)}개 클립 concat"
    )

    list_file.unlink(
        missing_ok=True
    )


# ==========================================================
# 전체 조립
# ==========================================================

def assemble(
    item_dir,
    outro_asset=None
):

    item_dir = Path(
        item_dir
    )

    base = item_dir.name

    # ------------------------------------------------------
    # 파일 경로
    # ------------------------------------------------------

    audio_path = (
        item_dir
        / f"{base}.mp3"
    )

    srt_path = (
        item_dir
        / f"{base}.target.srt"
    )

    final_path = (
        item_dir
        / f"{base}.final.mp4"
    )

    image_paths = [

        (
            item_dir
            / f"{base}_{i:03d}.png"
        )

        for i in range(1, 7)
    ]

    # ------------------------------------------------------
    # 필수 파일 확인
    # ------------------------------------------------------

    for p in [

        audio_path,
        srt_path,
        *image_paths

    ]:

        if not p.exists():

            raise FileNotFoundError(
                f"필요한 파일 없음: {p}"
            )

    # ------------------------------------------------------
    # SRT 타이밍
    # ------------------------------------------------------

    timings = (
        parse_timings_from_srt(
            srt_path
        )
    )

    if len(timings) != 6:

        raise ValueError(
            "target SRT에서 "
            "6개 타이밍을 못 찾음 "
            f"(찾은 개수: {len(timings)})"
        )

    from pydub import AudioSegment

    total_ms = len(
        AudioSegment.from_file(
            audio_path
        )
    )

    # ------------------------------------------------------
    # 이미지 표시 구간
    #
    # 001: 1번 문장 시작 -> 2번 문장 시작
    # 002: 2번 문장 시작 -> 3번 문장 시작
    # ...
    # 006: 6번 문장 시작 -> 오디오 끝
    # ------------------------------------------------------

    line_boundaries_ms = []

    for i, (
        start_ms,
        _end_ms
    ) in enumerate(timings):

        if i + 1 < len(timings):

            next_start_ms = (
                timings[i + 1][0]
            )

        else:

            next_start_ms = (
                total_ms
            )

        line_boundaries_ms.append(
            (
                start_ms,
                next_start_ms
            )
        )

    # ------------------------------------------------------
    # 타이밍 표시
    # ------------------------------------------------------

    print("\n[이미지 타이밍]")

    for i, (
        start_ms,
        end_ms
    ) in enumerate(
        line_boundaries_ms,
        start=1
    ):

        print(
            f"  {i:03d}: "
            f"{start_ms / 1000:.3f}s "
            f"-> "
            f"{end_ms / 1000:.3f}s "
            f"("
            f"{(end_ms-start_ms)/1000:.3f}s"
            f")"
        )

    # ------------------------------------------------------
    # 본문 영상
    # ------------------------------------------------------

    main_clip = (
        item_dir
        / f"{base}.main.mp4"
    )

    build_main_clip(
        image_paths,
        audio_path,
        line_boundaries_ms,
        main_clip
    )

    # ------------------------------------------------------
    # 공통 outro 위치
    #
    # assemble_video.py와 같은 conversation/ 폴더
    # ------------------------------------------------------

    common_assets_dir = (
        Path(__file__).resolve().parent
    )

    outro_asset = (

        Path(outro_asset)

        if outro_asset

        else (
            common_assets_dir
            / DEFAULT_OUTRO_ASSET
        )
    )

    clips_to_concat = []

    # 본문부터 시작
    # INTRO 없음

    clips_to_concat.append(
        main_clip
    )

    # ------------------------------------------------------
    # outro
    # ------------------------------------------------------

    if outro_asset.exists():

        norm_outro = (
            item_dir
            / "_outro_norm.mp4"
        )

        normalize_outro(
            outro_asset,
            norm_outro,
            OUTRO_DURATION
        )

        clips_to_concat.append(
            norm_outro
        )

    else:

        print(
            "  [건너뜀] "
            "outro 자산 없음 "
            f"({outro_asset})"
        )

    # ------------------------------------------------------
    # 최종 영상
    # ------------------------------------------------------

    if len(clips_to_concat) == 1:

        if final_path.exists():
            final_path.unlink()

        main_clip.rename(
            final_path
        )

    else:

        concat_clips(
            clips_to_concat,
            final_path,
            item_dir
        )

        for p in clips_to_concat:

            if p != main_clip:

                p.unlink(
                    missing_ok=True
                )

        main_clip.unlink(
            missing_ok=True
        )

    print(
        f"\n[완성] {final_path}"
    )

    return final_path


# ==========================================================
# 실행
# ==========================================================

def main():

    parser = argparse.ArgumentParser(
        description=(
            "001~006 CC 안내 + "
            "6장 이미지 미세 줌 + "
            "target 오디오 + "
            "outro -> 최종 mp4"
        )
    )

    parser.add_argument(
        "item_dir",
        help=(
            "shorts_pipeline.py가 만든 "
            "{filename_base} 폴더 경로"
        )
    )

    parser.add_argument(
        "--outro",
        default=None
    )

    args = parser.parse_args()

    assemble(
        args.item_dir,
        outro_asset=args.outro
    )


if __name__ == "__main__":
    main()