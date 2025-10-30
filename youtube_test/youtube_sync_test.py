import os, datetime, json

# 테스트용 데이터 (TTI · TTS · STT 루프 시뮬레이션)
youtube_test_data = {
    "video_title": "ManyLangs Grammar Sync Test",
    "modules": ["TTI", "TTS", "STT"],
    "status": "sandbox simulated",
    "timestamp": str(datetime.datetime.now())
}

# 로그 폴더 준비
log_dir = "D:/ManyLangs/youtube_test"
os.makedirs(log_dir, exist_ok=True)
log_path = os.path.join(log_dir, f"youtube_log_{datetime.date.today()}.txt")

# 로그 기록
with open(log_path, "a", encoding="utf-8") as f:
    f.write(f"[{datetime.datetime.now()}] YouTube sync sandbox test complete\n")
    f.write(json.dumps(youtube_test_data, indent=2, ensure_ascii=False) + "\n\n")

print("✅ YouTube sandbox sync 루프 완료")
