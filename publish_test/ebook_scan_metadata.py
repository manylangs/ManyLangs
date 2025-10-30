import os, json, datetime

# 1) ebook 폴더 경로
ebook_dir = "D:/ManyLangs/ebook"
log_dir = "D:/ManyLangs/publish_log"
os.makedirs(log_dir, exist_ok=True)

# 2) ebook 폴더에서 PDF 파일 스캔
pdf_files = [f for f in os.listdir(ebook_dir) if f.lower().endswith(".pdf")]

# 3) metadata.json 자동 생성
metadata_list = []
for pdf in pdf_files:
    title = os.path.splitext(pdf)[0]
    metadata = {
        "title": title,
        "authors": ["정하석"],
        "language": "ko",
        "publisher": "ManyLangs Publishing",
        "description": f"Auto-generated metadata for {title}",
        "isbn": f"9781985{datetime.datetime.now().strftime('%d%H%M')}",
        "file_path": os.path.join(ebook_dir, pdf),
        "upload_mode": "sandbox"
    }
    metadata_list.append(metadata)

# 4) metadata.json 파일 저장
metadata_path = os.path.join(log_dir, "metadata.json")
with open(metadata_path, "w", encoding="utf-8") as f:
    json.dump(metadata_list, f, indent=2, ensure_ascii=False)

# 5) 로그 기록
log_path = os.path.join(log_dir, f"ebook_scan_log_{datetime.date.today()}.txt")
with open(log_path, "a", encoding="utf-8") as log:
    log.write(f"[{datetime.datetime.now()}] 📘 eBook PDF 파일 {len(pdf_files)}개 스캔 완료\n")
    log.write(f"metadata.json 생성 경로: {metadata_path}\n\n")

print(f"✅ PDF {len(pdf_files)}개 스캔 및 metadata.json 생성 완료 (sandbox)")
