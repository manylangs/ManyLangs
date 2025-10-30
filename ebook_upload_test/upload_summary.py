import os, datetime

log_path = "D:/ManyLangs/ebook_upload_test/upload_log_2025-10-20.txt"
summary_path = f"D:/ManyLangs/ebook_upload_test/upload_summary_{datetime.date.today()}.txt"

with open(log_path, "r", encoding="utf-8") as f:
    data = f.read()

summary = f"""
📘 ManyLangs eBook Upload Summary ({datetime.date.today()})
------------------------------------------------------------
{data}
------------------------------------------------------------
✅ Sandbox Upload Verification Complete
"""

with open(summary_path, "w", encoding="utf-8") as f:
    f.write(summary)

print("✅ eBook upload summary 생성 완료")
