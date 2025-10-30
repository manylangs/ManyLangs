import os, json, datetime

# 1) metadata.json 불러오기
metadata_path = "D:/ManyLangs/publish_log/metadata.json"
log_dir = "D:/ManyLangs/publish_log"
os.makedirs(log_dir, exist_ok=True)

with open(metadata_path, "r", encoding="utf-8") as f:
    metadata_list = json.load(f)

# 2) 업로드 루프 (sandbox 모드)
upload_log_path = os.path.join(log_dir, f"upload_log_{datetime.date.today()}.txt")

for data in metadata_list:
    title = data["title"]
    isbn = data["isbn"]
    file_path = data["file_path"]

    # 실제 업로드 대신 가상 로그 출력
    print(f"📘 '{title}' 업로드 시뮬레이션 중...")
    with open(upload_log_path, "a", encoding="utf-8") as log:
        log.write(f"[{datetime.datetime.now()}] ✅ '{title}' 업로드 성공 (sandbox)\n")
        log.write(f"    ISBN: {isbn}\n")
        log.write(f"    파일 경로: {file_path}\n\n")

print(f"✅ 모든 eBook({len(metadata_list)}개) 업로드 시뮬레이션 완료 (sandbox)")
