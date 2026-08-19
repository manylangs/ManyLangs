#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import json
import os
import time
import io
from pathlib import Path

from google.cloud import texttospeech
from pydub import AudioSegment

import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from common.config import (  # noqa: E402
    SUPPORTED_LANGS,
    LEVELS,
    LANGUAGE_CODE,
    SAMPLE_RATE,
    VOICE_AB,
    TEXT_FIELD_DEFAULT,
)

from common.usage_tracker import Chirp3UsageTracker  # noqa: E402


VOICE_MAP = VOICE_AB
TEXT_FIELD = TEXT_FIELD_DEFAULT


GAP_INTRA_MS = 350
GAP_SET_END_MS = 650
GAP_INTER_SET_MS = 900


def silence(ms: int) -> AudioSegment:
    return AudioSegment.silent(
        duration=ms,
        frame_rate=SAMPLE_RATE,
    )


def synthesize(
    client,
    text: str,
    lang: str,
    speaker: str,
) -> AudioSegment:

    response = client.synthesize_speech(
        input=texttospeech.SynthesisInput(
            text=text,
        ),
        voice=texttospeech.VoiceSelectionParams(
            language_code=LANGUAGE_CODE[lang],
            name=VOICE_MAP[lang][speaker],
        ),
        audio_config=texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.LINEAR16,
            sample_rate_hertz=SAMPLE_RATE,
        ),
    )

    seg = AudioSegment.from_file(
        io.BytesIO(response.audio_content),
        format="wav",
    )

    return (
        seg
        .set_frame_rate(SAMPLE_RATE)
        .set_channels(1)
        .set_sample_width(2)
    )


def load_sets(
    json_path: Path,
    lang: str,
):
    data = json.loads(
        json_path.read_text(
            encoding="utf-8",
        )
    )

    field = TEXT_FIELD[lang]
    sets = []

    for block in data.get("blocks", []):
        lines = []

        for line in block.get("lines", []):
            speaker = line.get("speaker")

            text = (
                line.get("sentences", {})
                .get(field, "")
                .strip()
            )

            if speaker in ["A", "B"] and text:
                lines.append(
                    {
                        "speaker": speaker,
                        "text": text,
                    }
                )

        if lines:
            sets.append(
                {
                    "set_id": block.get(
                        "set_id",
                        "",
                    ),
                    "lines": lines,
                }
            )

    return sets


def build_one(
    client,
    json_path: Path,
    wav_path: Path,
    cues_path: Path,
    lang: str,
):

    sets = load_sets(
        json_path,
        lang,
    )

    final_audio = AudioSegment.silent(
        duration=0,
        frame_rate=SAMPLE_RATE,
    )

    cues = []
    file_chars = 0

    for set_index, block in enumerate(sets):

        cues.append(
            len(final_audio)
        )

        for line_index, line in enumerate(
            block["lines"]
        ):

            text = line["text"]

            # 실제 Google TTS에 보내는 문자 수
            file_chars += len(text)

            seg = synthesize(
                client=client,
                text=text,
                lang=lang,
                speaker=line["speaker"],
            )

            final_audio += seg

            is_last_line = (
                line_index
                == len(block["lines"]) - 1
            )

            is_last_set = (
                set_index
                == len(sets) - 1
            )

            if not is_last_line:

                final_audio += silence(
                    GAP_INTRA_MS
                )

            else:

                final_audio += silence(
                    GAP_SET_END_MS
                )

                if not is_last_set:
                    final_audio += silence(
                        GAP_INTER_SET_MS
                    )

    wav_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    final_audio.export(
        wav_path,
        format="wav",
    )

    cues_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    cues_path.write_text(
        json.dumps(
            {
                "setStartMs": cues,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    return (
        len(sets),
        len(final_audio),
        file_chars,
    )


def iter_targets(
    content_root: Path,
    lang: str,
    level: str,
    chapter: str,
):

    levels = (
        [level]
        if level
        else LEVELS
    )

    for lv in levels:

        level_dir = (
            content_root
            / "conversation"
            / lang
            / lv
        )

        if not level_dir.exists():

            print(
                f"[MISS LEVEL] "
                f"{level_dir}"
            )

            continue

        if chapter:

            chapters = [
                chapter.zfill(3)
            ]

        else:

            chapters = sorted(
                [
                    p.name
                    for p
                    in level_dir.iterdir()
                    if p.is_dir()
                ]
            )

        for ch in chapters:

            base = (
                level_dir
                / ch
            )

            json_path = (
                base
                / "data"
                / f"conversation_{ch}.runtime.json"
            )

            wav_path = (
                base
                / "audio"
                / f"conversation_{lv}_{ch}.wav"
            )

            cues_path = (
                base
                / "audio"
                / f"conversation_{lv}_{ch}.cues.json"
            )

            yield (
                lv,
                ch,
                json_path,
                wav_path,
                cues_path,
            )


def run(
    lang: str,
    level: str = "",
    chapter: str = "",
    overwrite: bool = False,
    content_root: str = "/Users/junghasuk/Desktop/content",
    service_account: str = (
        "/Users/junghasuk/Desktop/"
        "ManyLangs/web/tts/tts-generator.json"
    ),
    tracker=None,
    print_final=True,
):

    started = time.time()

    # ---------------------------------------------------------
    # Tracker
    # ---------------------------------------------------------

    own_tracker = False

    if tracker is None:
        tracker = Chirp3UsageTracker()
        own_tracker = True

    series_start_chars = (
        tracker.mark_series_start()
    )

    # ---------------------------------------------------------
    # Google TTS
    # ---------------------------------------------------------

    os.environ[
        "GOOGLE_APPLICATION_CREDENTIALS"
    ] = service_account

    client = (
        texttospeech
        .TextToSpeechClient()
    )

    content_root = Path(
        content_root
    )

    created = 0
    skipped = 0
    missing = 0
    errors = 0

    print()
    print("=" * 70)
    print(
        "ManyLangs Conversation TTS Builder"
    )
    print("=" * 70)

    print(
        "Language :",
        lang,
    )

    print(
        "Level    :",
        level or "ALL",
    )

    print(
        "Chapter  :",
        chapter or "ALL",
    )

    print(
        "Voice A  :",
        VOICE_MAP[lang]["A"],
    )

    print(
        "Voice B  :",
        VOICE_MAP[lang]["B"],
    )

    print("=" * 70)

    # ---------------------------------------------------------
    # Generate
    # ---------------------------------------------------------

    for (
        lv,
        ch,
        json_path,
        wav_path,
        cues_path,
    ) in iter_targets(
        content_root,
        lang,
        level,
        chapter,
    ):

        try:

            if not json_path.exists():

                print(
                    f"[MISS JSON] "
                    f"{lv}/{ch}"
                )

                missing += 1
                continue

            if (
                wav_path.exists()
                and cues_path.exists()
                and not overwrite
            ):

                print(
                    f"[SKIP] "
                    f"{lv}/{ch}"
                )

                skipped += 1
                continue

            (
                set_count,
                duration_ms,
                file_chars,
            ) = build_one(
                client=client,
                json_path=json_path,
                wav_path=wav_path,
                cues_path=cues_path,
                lang=lang,
            )

            # 생성 성공 후 누적
            tracker.add_chars(
                file_chars
            )

            print(
                f"[OK] "
                f"{lv}/{ch} "
                f"sets={set_count} "
                f"duration_ms={duration_ms}"
            )

            tracker.print_file(
                (
                    f"conversation "
                    f"{lv}/{ch}"
                ),
                file_chars,
            )

            created += 1

        except Exception as e:

            print(
                f"[ERROR] "
                f"{lv}/{ch} "
                f"{e}"
            )

            errors += 1

    # ---------------------------------------------------------
    # Series summary
    # ---------------------------------------------------------

    print()

    print("=" * 70)
    print("DONE")
    print("Created :", created)
    print("Skipped :", skipped)
    print("Missing :", missing)
    print("Errors  :", errors)

    print(
        "Elapsed :",
        round(
            time.time() - started,
            1,
        ),
        "s",
    )

    print("=" * 70)

    tracker.print_series(
        "CONVERSATION",
        series_start_chars,
    )

    # 단독 실행이면 여기서 최종값 표시.
    # 통합 실행에서는 마지막 시리즈에서만 표시 가능.
    if print_final:
        tracker.print_final()

    return tracker


def main():

    parser = argparse.ArgumentParser(
        description=(
            "ManyLangs Conversation "
            "TTS Builder"
        )
    )

    parser.add_argument(
        "--lang",
        required=True,
        choices=SUPPORTED_LANGS,
    )

    parser.add_argument(
        "--level",
        default="",
    )

    parser.add_argument(
        "--chapter",
        default="",
    )

    parser.add_argument(
        "--overwrite",
        action="store_true",
    )

    parser.add_argument(
        "--content_root",
        default=(
            "/Users/junghasuk/"
            "Desktop/content"
        ),
    )

    parser.add_argument(
        "--service_account",
        default=(
            "/Users/junghasuk/Desktop/"
            "ManyLangs/web/tts/"
            "tts-generator.json"
        ),
    )

    args = parser.parse_args()

    run(
        lang=args.lang,
        level=args.level,
        chapter=args.chapter,
        overwrite=args.overwrite,
        content_root=args.content_root,
        service_account=args.service_account,
        tracker=None,
        print_final=True,
    )


if __name__ == "__main__":
    main()