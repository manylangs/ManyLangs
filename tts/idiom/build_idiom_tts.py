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

SUPPORTED_LANGS = ["en"]
LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"]

LANGUAGE_CODE = {"en": "en-US"}

VOICE_MAP = {
    "en": {
        "default": "en-US-Neural2-F",
    },
}

SAMPLE_RATE = 24000

GAP_INTRA_MS = 1800
GAP_AFTER_EXPRESSION_MS = 1800
GAP_SET_END_MS = 650
GAP_INTER_SET_MS = 900


def silence(ms: int) -> AudioSegment:
    return AudioSegment.silent(duration=ms, frame_rate=SAMPLE_RATE)


def synthesize(client, text: str, lang: str) -> AudioSegment:
    response = client.synthesize_speech(
        input=texttospeech.SynthesisInput(text=text),
        voice=texttospeech.VoiceSelectionParams(
            language_code=LANGUAGE_CODE[lang],
            name=VOICE_MAP[lang]["default"],
        ),
        audio_config=texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.LINEAR16,
            sample_rate_hertz=SAMPLE_RATE,
        ),
    )

    seg = AudioSegment.from_file(io.BytesIO(response.audio_content), format="wav")
    return seg.set_frame_rate(SAMPLE_RATE).set_channels(1).set_sample_width(2)


def load_sets(json_path: Path, lang: str):
    data = json.loads(json_path.read_text(encoding="utf-8"))
    sets = []

    for block in data.get("blocks", []):
        texts = []

        expression = block.get("expression", {}).get(lang, "").strip()
        if expression:
            texts.append(expression)

        explanation = block.get("explanation", {}).get(lang, "").strip()
        if explanation:
            texts.append(explanation)

        for ex in block.get("examples", []):
            text = ex.get(lang, "").strip()
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
    return f"{h:02d}:{m:02d}:{s:02d}"


def build_one(client, json_path: Path, wav_path: Path, cues_path: Path, lang: str):
    sets = load_sets(json_path, lang)

    final_audio = AudioSegment.silent(duration=0, frame_rate=SAMPLE_RATE)
    cues = []

    for set_index, texts in enumerate(sets):
        cues.append(len(final_audio))

        for text_index, text in enumerate(texts):
            seg = synthesize(client, text, lang)
            final_audio += seg

            is_last_text = text_index == len(texts) - 1
            is_last_set = set_index == len(sets) - 1

            if not is_last_text:
                if text_index == 0:
                    final_audio += silence(GAP_AFTER_EXPRESSION_MS)
                else:
                    final_audio += silence(GAP_INTRA_MS)
            else:
                final_audio += silence(GAP_SET_END_MS)
                if not is_last_set:
                    final_audio += silence(GAP_INTER_SET_MS)

    wav_path.parent.mkdir(parents=True, exist_ok=True)
    final_audio.export(wav_path, format="wav")

    cues_path.parent.mkdir(parents=True, exist_ok=True)
    cues_path.write_text(
        json.dumps({"setStartMs": cues}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    return len(sets), len(final_audio)


def iter_targets(content_root: Path, lang: str, level: str, chapter: str):
    levels = [level] if level else LEVELS

    for lv in levels:
        level_dir = content_root / "idiom" / lang / lv
        if not level_dir.exists():
            print(f"[MISS LEVEL] {level_dir}")
            continue

        if chapter:
            chapters = [chapter.zfill(3)]
        else:
            chapters = sorted([p.name for p in level_dir.iterdir() if p.is_dir()])

        for ch in chapters:
            base = level_dir / ch
            json_path = base / "data" / "data.json"
            wav_path = base / "audio" / f"idiom_{lv}_{ch}.wav"
            cues_path = base / "audio" / f"idiom_{lv}_{ch}.cues.json"
            yield lv, ch, json_path, wav_path, cues_path


def main():
    parser = argparse.ArgumentParser(description="ManyLangs Idiom TTS Builder")

    parser.add_argument("--lang", required=True, choices=SUPPORTED_LANGS)
    parser.add_argument("--level", default="")
    parser.add_argument("--chapter", default="")
    parser.add_argument("--overwrite", action="store_true")

    parser.add_argument("--content_root", default="/Users/junghasuk/Desktop/content")
    parser.add_argument(
        "--service_account",
        default="/Users/junghasuk/Desktop/ManyLangs/web/tts/tts-generator.json",
    )

    args = parser.parse_args()

    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = args.service_account
    client = texttospeech.TextToSpeechClient()

    content_root = Path(args.content_root)

    created = 0
    skipped = 0
    missing = 0
    errors = 0
    started = time.time()

    print("=" * 70)
    print("ManyLangs Idiom TTS Builder")
    print("=" * 70)
    print("Language :", args.lang)
    print("Level    :", args.level or "ALL")
    print("Chapter  :", args.chapter or "ALL")
    print("=" * 70)

    for lv, ch, json_path, wav_path, cues_path in iter_targets(
        content_root, args.lang, args.level, args.chapter
    ):
        try:
            if not json_path.exists():
                print(f"[MISS JSON] {lv}/{ch}")
                missing += 1
                continue

            if wav_path.exists() and cues_path.exists() and not args.overwrite:
                print(f"[SKIP] {lv}/{ch}")
                skipped += 1
                continue

            set_count, duration_ms = build_one(
                client=client,
                json_path=json_path,
                wav_path=wav_path,
                cues_path=cues_path,
                lang=args.lang,
            )

            print(
                f"[OK] {lv}/{ch} blocks={set_count} "
                f"duration={format_duration(duration_ms)} ({duration_ms}ms)"
            )
            created += 1

        except Exception as e:
            print(f"[ERROR] {lv}/{ch} {e}")
            errors += 1

    print("=" * 70)
    print("DONE")
    print("Created :", created)
    print("Skipped :", skipped)
    print("Missing :", missing)
    print("Errors  :", errors)
    print("Elapsed :", round(time.time() - started, 1), "s")
    print("=" * 70)


if __name__ == "__main__":
    main()