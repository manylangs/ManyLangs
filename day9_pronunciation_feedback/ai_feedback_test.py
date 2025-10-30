# -*- coding: utf-8 -*-
"""
Day 9 — Step 1: Compact Feedback Logic 시뮬레이션
발음 정확도(accuracy)와 톤(tone) 데이터를 생성하여 feedback.json에 저장
"""

import json
from pathlib import Path
from datetime import datetime, timezone
import random

BASE = Path(__file__).resolve().parent
OUTPUT = BASE / "feedback.json"

def generate_feedback():
    # Compact Feedback Logic 시뮬레이션 (서버리스 구조 동일)
    accuracy = round(random.uniform(0.65, 0.95), 2)
    tone = round(random.uniform(0.60, 0.95), 2)

    if accuracy >= 0.85:
        level = "Excellent"
        color = "green"
    elif accuracy >= 0.70:
        level = "Needs practice"
        color = "yellow"
    else:
        level = "Re-record"
        color = "red"

    data = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "accuracy": accuracy,
        "tone": tone,
        "level": level,
        "color": color
    }
    return data

if __name__ == "__main__":
    feedback = generate_feedback()
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(feedback, f, ensure_ascii=False, indent=2)

    print("✅ feedback.json 생성 완료:")
    print(json.dumps(feedback, indent=2, ensure_ascii=False))
