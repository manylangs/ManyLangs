import os, json, datetime

upload_dir = "D:/ManyLangs/ebook_upload_test"
os.makedirs(upload_dir, exist_ok=True)

ebook_file = "lesson_sample.epub"

upload_result = {
    "google_books": "sandbox upload simulated",
    "amazon_kdp": "sandbox upload simulated",
    "file": ebook_file,
    "timestamp": str(datetime.datetime.now())
}

log_path = os.path.join(upload_dir, f"upload_log_{datetime.date.today()}.txt")

with open(log_path, "a", encoding="utf-8") as f:
    f.write(f"[{datetime.datetime.now()}] eBook sandbox upload complete\n")
    f.write(json.dumps(upload_result, indent=2, ensure_ascii=False) + "\n\n")

print("✅ eBook sandbox upload 루프 완료")
