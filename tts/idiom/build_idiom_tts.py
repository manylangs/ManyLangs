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
    VOICE_SINGLE,
    TEXT_FIELD_DEFAULT,
)

from common.usage_tracker import Chirp3UsageTracker  # noqa: E402


VOICE_MAP = VOICE_SINGLE
TEXT_FIELD = TEXT_FIELD_DEFAULT


GAP_INTRA_MS = 1800
GAP_AFTER_EXPRESSION_MS = 1800
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
) -> AudioSegment:

    response = client.synthesize_speech(
        input=texttospeech.SynthesisInput(
            text=text,
        ),
        voice=texttospeech.VoiceSelectionParams(
            language_code=LANGUAGE_CODE[lang],
            name=VOICE_MAP[lang]["default"],
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
        texts = []

        # Idiom expression은 원문(target)을 사용
        expression = (
            block.get("expression", {})
            .get("target", "")
            .strip()
        )

        if expression:
            texts.append(expression)

        # 설명은 선택 언어 사용
        explanation = (
            block.get("explanation", {})
            .get(field, "")
            .strip()
        )

        if explanation:
            texts.append(explanation)

        # 예문도 선택 언어 사용
        for ex in block.get("examples", []):

            text = (
                ex.get(field, "")
                .strip()
            )

            if text:
                texts.append(text)

        if texts:
            sets.append(texts)

    return sets


def format_duration(ms: int) -> str:

    total_sec = ms // 1000

    h = total_sec // 3600
    m = (total_sec % 3600) // 60
    s = total_sec % 60

    return (
        f"{h:02d}:"
        f"{m:02d}:"
        f"{s:02d}"
    )


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

    # 이 오디오 파일에서 실제 Google TTS로 보내는 총 문자 수
    file_chars = 0

    for set_index, texts in enumerate(sets):

        cues.append(
            len(final_audio)
        )

        for text_index, text in enumerate(texts):

            # 실제 API에 전송하는 문자열 기준
            file_chars += len(text)

            seg = synthesize(
                client=client,
                text=text,
                lang=lang,
            )

            final_audio += seg

            is_last_text = (
                text_index
                == len(texts) - 1
            )

            is_last_set = (
                set_index
                == len(sets) - 1
            )

            if not is_last_text:

                if text_index == 0:

                    final_audio += silence(
                        GAP_AFTER_EXPRESSION_MS
                    )

                else:

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
            / "idiom"
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
                    for p in level_dir.iterdir()
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
                / "data.json"
            )

            wav_path = (
                base
                / "audio"
                / f"idiom_{lv}_{ch}.wav"
            )

            cues_path = (
                base
                / "audio"
                / f"idiom_{lv}_{ch}.cues.json"
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

    if tracker is None:
        tracker = Chirp3UsageTracker()

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
        "ManyLangs Idiom TTS Builder"
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
        "Voice    :",
        VOICE_MAP[lang]["default"],
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

            # 성공적으로 생성된 파일만 사용량에 반영
            tracker.add_chars(
                file_chars
            )

            print(
                f"[OK] "
                f"{lv}/{ch} "
                f"blocks={set_count} "
                f"duration="
                f"{format_duration(duration_ms)} "
                f"({duration_ms}ms)"
            )

            tracker.print_file(
                f"idiom {lv}/{ch}",
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
        "IDIOM",
        series_start_chars,
    )

    if print_final:
        tracker.print_final()

    return tracker


def main():

    parser = argparse.ArgumentParser(
        description=(
            "ManyLangs Idiom "
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