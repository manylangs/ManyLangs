# -*- coding: utf-8 -*-
"""
Day 8 — 앱 시각화 연동 테스트 스크립트
- progress.json → (동기화) → synced_progress.json
- progress / accuracy / tone 간단 차트 출력(각각 단일 플롯)
주의: 이 스크립트는 Firebase 없이 '로컬 동기화'만 시뮬레이션합니다.
"""
import json
from pathlib import Path
from datetime import datetime, timezone
import matplotlib.pyplot as plt

BASE = Path(__file__).resolve().parent
SRC = BASE / "progress.json"
DST = BASE / "synced_progress.json"

def load_progress():
    with open(SRC, "r", encoding="utf-8") as f:
        return json.load(f)

def save_progress(data, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def simulate_sync(data):
    """
    실제 환경에서는:
    - 모바일: progress.json → Firestore 업로드
    - PC(Electron): Firestore → 로컬 synced_progress.json
    여기서는 last_update, progress 값을 소폭 갱신하여 동기화 효과를 시뮬레이션합니다.
    """
    data = dict(data)  # shallow copy
    data["progress"] = min(1.0, round(data.get("progress", 0) + 0.02, 4))
    data["last_update"] = datetime.now(timezone.utc).isoformat()
    return data

def make_plot_progress(val):
    """
    단일 플롯 원칙: 진행률만 표시
    """
    plt.figure()
    plt.bar(["progress"], [val])
    plt.ylim(0, 1)
    plt.title("Progress")
    plt.savefig(BASE / "progress_chart.png", dpi=144, bbox_inches="tight")
    plt.close()

def make_plot_accuracy(val):
    plt.figure()
    plt.bar(["accuracy"], [val])
    plt.ylim(0, 1)
    plt.title("Accuracy")
    plt.savefig(BASE / "accuracy_chart.png", dpi=144, bbox_inches="tight")
    plt.close()

def make_plot_tone(val):
    plt.figure()
    plt.bar(["tone"], [val])
    plt.ylim(0, 1)
    plt.title("Tone")
    plt.savefig(BASE / "tone_chart.png", dpi=144, bbox_inches="tight")
    plt.close()

if __name__ == "__main__":
    data = load_progress()
    synced = simulate_sync(data)
    save_progress(synced, DST)

    # 시각화 (각각 단일 플롯 규칙 준수)
    make_plot_progress(synced.get("progress", 0))
    metrics = synced.get("metrics", {})
    make_plot_accuracy(metrics.get("accuracy", 0))
    make_plot_tone(metrics.get("tone", 0))

    print("✅ 동기화 완료 →", DST.name)
    print("✅ 차트 생성 완료 → progress_chart.png, accuracy_chart.png, tone_chart.png")
