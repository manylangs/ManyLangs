#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import sys
import time
from pathlib import Path

# tts 폴더를 import 경로에 추가
TTS_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(TTS_ROOT))

from common.config import SUPPORTED_LANGS
from common.usage_tracker import Chirp3UsageTracker

from conversation.build_conversation_tts import run as run_conversation
from voca.build_voca_tts import run as run_voca
from idiom.build_idiom_tts import run as run_idiom
from real.build_real_tts import run as run_real


def main():
    parser = argparse.ArgumentParser(
        description="ManyLangs ALL TTS Builder"
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
        default="/Users/junghasuk/Desktop/content",
    )

    parser.add_argument(
        "--service_account",
        default=(
            "/Users/junghasuk/Desktop/"
            "ManyLangs/web/tts/tts-generator.json"
        ),
    )

    args = parser.parse_args()

    started = time.time()

    print()
    print("=" * 70)
    print("ManyLangs ALL TTS Builder")
    print("=" * 70)
    print("Language :", args.lang)
    print("Level    :", args.level or "ALL")
    print("Chapter  :", args.chapter or "ALL")
    print("Series   : Conversation -> Voca -> Idiom -> Real")
    print("=" * 70)

    # 처음 한 번만 누적 사용량 입력
    tracker = Chirp3UsageTracker()

    common_args = {
        "lang": args.lang,
        "level": args.level,
        "chapter": args.chapter,
        "overwrite": args.overwrite,
        "content_root": args.content_root,
        "service_account": args.service_account,
        "tracker": tracker,
        "print_final": False,
    }

    print()
    print("#" * 70)
    print("# 1/4 CONVERSATION")
    print("#" * 70)

    run_conversation(**common_args)

    print()
    print("#" * 70)
    print("# 2/4 VOCA")
    print("#" * 70)

    run_voca(**common_args)

    print()
    print("#" * 70)
    print("# 3/4 IDIOM")
    print("#" * 70)

    run_idiom(**common_args)

    print()
    print("#" * 70)
    print("# 4/4 REAL")
    print("#" * 70)

    run_real(**common_args)

    elapsed = time.time() - started

    print()
    print("=" * 70)
    print("ALL 4 TTS SERIES COMPLETE")
    print("=" * 70)
    print("Language :", args.lang)
    print("Level    :", args.level or "ALL")
    print("Chapter  :", args.chapter or "ALL")
    print("Elapsed  :", round(elapsed, 1), "s")
    print("=" * 70)

    # 4종 전체가 끝난 뒤 최종값 한 번 출력
    tracker.print_final()


if __name__ == "__main__":
    main()
