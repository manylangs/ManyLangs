import os, json, datetime

# 1) metadata.json 경로
metadata_path = "D:/ManyLangs/publish_log/metadata.json"

# 2) 결과 저장 폴더 생성
output_dir = "D:/ManyLangs/youtube_test/output"
os.makedirs(output_dir, exist_ok=True)

# 3) eBook 문장 하나만 가져오기 (샘플)
with open(metadata_path, "r", encoding="utf-8") as f:
    books = json.load(f)

sample = books[0] if books else None

if not sample:
    print("❌ metadata.json을 찾을 수 없습니다.")
else:
    title = sample["title"]
    tts_text = f"Welcome to ManyLangs YouTube Test. Today’s sample is {title}."
    image_prompt = f"Cover illustration for {title}, modern, minimalistic, educational design."

    # 4) TTS/TTI 시뮬레이션 로그 작성
    log_path = os.path.join(output_dir, f"youtube_tts_tti_log_{datetime.date.today()}.txt")
    with open(log_path, "a", encoding="utf-8") as log:
        log.write(f"[{datetime.datetime.now()}] 🎙️ TTS 생성 완료: {tts_text}\n")
        log.write(f"[{datetime.datetime.now()}] 🖼️ TTI 생성 완료: {image_prompt}\n\n")

    print(f"✅ TTS/TTI 시뮬레이션 완료 — {title}")
    print(f"📄 로그 경로: {log_path}")
