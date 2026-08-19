#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import json
import os
import time
from pathlib import Path

from google.cloud import texttospeech

import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from common.config import (  # noqa: E402
    SUPPORTED_LANGS,
    LEVELS,
    LANGUAGE_CODE,
    SAMPLE_RATE,
    VOICE_SINGLE,
    TEXT_FIELD_REAL,
)

from common.usage_tracker import Chirp3UsageTracker  # noqa: E402


VOICE_MAP = VOICE_SINGLE
TEXT_FIELD = TEXT_FIELD_REAL

BREAK_TIME = "1.8s"


def load_sentences(
    json_path: Path,
    lang: str,
):
    data = json.loads(
        json_path.read_text(
            encoding="utf-8",
        )
    )

    field = TEXT_FIELD[lang]
    sentences = []

    for block in data.get("blocks", []):

        if block.get("type") != "description":
            continue

        for item in block.get("sentences", []):

            text = (
                item.get("texts", {})
                .get(field, "")
                .strip()
            )

            if text:
                sentences.append(text)

    return sentences


def make_ssml(sentences):

    pause = (
        f'<break time="{BREAK_TIME}"/>'
    )

    body = pause.join(sentences)

    return (
        f"<speak>{body}</speak>"
    )


def synthesize(
    client,
    ssml: str,
    lang: str,
):

    response = client.synthesize_speech(
        input=texttospeech.SynthesisInput(
            ssml=ssml,
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

    return response.audio_content


def iter_targets(
    content_root: Path,
    lang: str,
    level: str,
    chapter: str,
):

    base = (
        content_root
        / "real"
        / lang
    )

    levels = (
        [level]
        if level
        else LEVELS
    )

    for lv in levels:

        level_dir = (
            base
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

            chapter_dir = (
                level_dir
                / ch
            )

            json_path = (
                chapter_dir
                / "data"
                / "data.json"
            )

            wav_path = (
                chapter_dir
                / "audio"
                / f"{ch}.wav"
            )

            yield (
                lv,
                ch,
                json_path,
                wav_path,
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
        "ManyLangs REAL TTS Builder"
    )
    print("=" * 70)

    print(
        "Language     :",
        lang,
    )

    print(
        "Level        :",
        level or "ALL",
    )

    print(
        "Chapter      :",
        chapter or "ALL",
    )

    print(
        "Voice        :",
        VOICE_MAP[lang]["default"],
    )

    print(
        "Break        :",
        BREAK_TIME,
    )

    print(
        "Content Root :",
        content_root,
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
                    f"{lv}/{ch} "
                    f"{json_path}"
                )

                missing += 1
                continue

            if (
                wav_path.exists()
                and not overwrite
            ):

                print(
                    f"[SKIP] "
                    f"{lv}/{ch}"
                )

                skipped += 1
                continue

            sentences = load_sentences(
                json_path,
                lang,
            )

            if not sentences:

                print(
                    f"[NO TEXT] "
                    f"{lv}/{ch}"
                )

                errors += 1
                continue

            # 실제 콘텐츠 문자만 사용량으로 계산
            file_chars = sum(
                len(text)
                for text in sentences
            )

            ssml = make_ssml(
                sentences
            )

            audio = synthesize(
                client=client,
                ssml=ssml,
                lang=lang,
            )

            wav_path.parent.mkdir(
                parents=True,
                exist_ok=True,
            )

            wav_path.write_bytes(
                audio
            )

            # 생성 성공 후에만 누적
            tracker.add_chars(
                file_chars
            )

            print(
                f"[OK] "
                f"{lv}/{ch} "
                f"sentences={len(sentences)} "
                f"chars={file_chars} "
                f"-> {wav_path}"
            )

            tracker.print_file(
                f"real {lv}/{ch}",
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

    elapsed = (
        time.time()
        - started
    )

    print()

    print("=" * 70)
    print("DONE")
    print("Created :", created)
    print("Skipped :", skipped)
    print("Missing :", missing)
    print("Errors  :", errors)

    print(
        f"Elapsed : "
        f"{elapsed:.1f}s"
    )

    print("=" * 70)

    tracker.print_series(
        "REAL",
        series_start_chars,
    )

    if print_final:
        tracker.print_final()

    return tracker


def main():

    parser = argparse.ArgumentParser(
        description=(
            "ManyLangs REAL "
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