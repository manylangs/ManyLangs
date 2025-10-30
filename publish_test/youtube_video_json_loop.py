import os, json, datetime

# 1) metadata.json 및 TTS/TTI 로그 경로
metadata_path = "D:/ManyLangs/publish_log/metadata.json"
tts_tti_log = "D:/ManyLangs/youtube_test/output/youtube_tts_tti_log_2025-10-20.txt"

# 2) 결과 저장 폴더
output_dir = "D:/ManyLangs/youtube_test/output/json"
os.makedirs(output_dir, exist_ok=True)

# 3) metadata 불러오기
with open(metadata_path, "r", encoding="utf-8") as f:
    books = json.load(f)

# 4) 각 eBook에 대해 JSON 데이터 생성
for book in books:
    title = book["title"]
    video_json = {
        "title": title,
        "tts_text": f"Welcome to ManyLangs. Today’s sample is {title}.",
        "image_prompt": f"Cover illustration for {title}, modern, minimalistic, educational design.",
        "upload_mode": "sandbox",
        "timestamp": str(datetime.datetime.now())
    }

    json_path = os.path.join(output_dir, f"{title}_video.json")
    with open(json_path, "w", encoding="utf-8") as jf:
        json.dump(video_json, jf, indent=2, ensure_ascii=False)

print(f"✅ YouTube 영상 JSON 데이터 생성 완료 ({len(books)}개) — 폴더: {output_dir}")
