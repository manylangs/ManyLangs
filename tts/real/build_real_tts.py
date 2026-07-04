#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import json
import os
import time
from pathlib import Path

from google.cloud import texttospeech

SUPPORTED_LANGS = ["kr", "en", "es", "fr", "pt"]
LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"]

LANGUAGE_CODE = {
    "kr": "ko-KR",
    "en": "en-US",
    "es": "es-ES",
    "fr": "fr-FR",
    "pt": "pt-PT",
}

BREAK_TIME = "1.8s"
SAMPLE_RATE = 24000


def load_sentences(json_path: Path, lang: str):
    data = json.loads(json_path.read_text(encoding="utf-8"))
    sentences = []

    for block in data.get("blocks", []):
        if block.get("type") != "description":
            continue

        for item in block.get("sentences", []):
            text = item.get("texts", {}).get(lang, "").strip()
            if text:
                sentences.append(text)

    return sentences


def make_ssml(sentences):
    pause = f'<break time="{BREAK_TIME}"/>'
    body = pause.join(sentences)
    return f"<speak>{body}</speak>"


def synthesize(client, ssml, lang):
    response = client.synthesize_speech(
        input=texttospeech.SynthesisInput(ssml=ssml),
        voice=texttospeech.VoiceSelectionParams(
            language_code=LANGUAGE_CODE[lang],
            ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL,
        ),
        audio_config=texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.LINEAR16,
            sample_rate_hertz=SAMPLE_RATE,
        ),
    )
    return response.audio_content


def iter_targets(content_root: Path, lang: str, level: str, chapter: str):
    base = content_root / "real" / lang

    levels = [level] if level else LEVELS

    for lv in levels:
        level_dir = base / lv
        if not level_dir.exists():
            print(f"[MISS LEVEL] {level_dir}")
            continue

        if chapter:
            chapters = [chapter.zfill(3)]
        else:
            chapters = sorted([p.name for p in level_dir.iterdir() if p.is_dir()])

        for ch in chapters:
            json_path = level_dir / ch / "data" / f"{ch}.json"
            wav_path = level_dir / ch / "audio" / f"{ch}.wav"
            yield lv, ch, json_path, wav_path


def main():
    parser = argparse.ArgumentParser(description="ManyLangs REAL TTS Builder")

    parser.add_argument("--lang", required=True, choices=SUPPORTED_LANGS)
    parser.add_argument("--level", default="")
    parser.add_argument("--chapter", default="")
    parser.add_argument("--overwrite", action="store_true")

    parser.add_argument(
        "--content_root",
        default="/Users/junghasuk/Desktop/content",
    )

    parser.add_argument(
        "--service_account",
        default="/Users/junghasuk/Desktop/ManyLangs/web/tts/tts-generator.json",
    )

    args = parser.parse_args()

    started = time.time()

    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = args.service_account
    client = texttospeech.TextToSpeechClient()

    content_root = Path(args.content_root)

    made = 0
    skipped = 0
    errors = 0
    missing = 0

    print("=" * 70)
    print("ManyLangs REAL TTS Builder")
    print("=" * 70)
    print("Language     :", args.lang)
    print("Level        :", args.level or "ALL")
    print("Chapter      :", args.chapter or "ALL")
    print("Content Root :", content_root)
    print("=" * 70)

    for lv, ch, json_path, wav_path in iter_targets(
        content_root,
        args.lang,
        args.level,
        args.chapter,
    ):
        try:
            if not json_path.exists():
                print(f"[MISS JSON] {lv}/{ch} {json_path}")
                missing += 1
                continue

            if wav_path.exists() and not args.overwrite:
                print(f"[SKIP] {lv}/{ch}")
                skipped += 1
                continue

            sentences = load_sentences(json_path, args.lang)

            if not sentences:
                print(f"[NO TEXT] {lv}/{ch}")
                errors += 1
                continue

            ssml = make_ssml(sentences)
            audio = synthesize(client, ssml, args.lang)

            wav_path.parent.mkdir(parents=True, exist_ok=True)
            wav_path.write_bytes(audio)

            print(f"[OK] {lv}/{ch} -> {wav_path}")
            made += 1

        except Exception as e:
            print(f"[ERROR] {lv}/{ch} {e}")
            errors += 1

    elapsed = time.time() - started

    print("=" * 70)
    print("DONE")
    print("Created :", made)
    print("Skipped :", skipped)
    print("Missing :", missing)
    print("Errors  :", errors)
    print(f"Elapsed : {elapsed:.1f}s")
    print("=" * 70)


if __name__ == "__main__":
    main()
