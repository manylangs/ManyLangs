import os, datetime

# 1) 로그 경로 설정
log_dir = "D:/ManyLangs/publish_log"
upload_log_path = os.path.join(log_dir, f"upload_log_{datetime.date.today()}.txt")
summary_path = os.path.join(log_dir, f"upload_summary_{datetime.date.today()}.txt")

# 2) 업로드 로그 불러오기
if not os.path.exists(upload_log_path):
    print("❌ 업로드 로그 파일을 찾을 수 없습니다.")
else:
    with open(upload_log_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    # 3) 성공 항목만 추출
    success_list = [line for line in lines if "업로드 성공" in line]

    # 4) 요약 리포트 작성
    with open(summary_path, "w", encoding="utf-8") as summary:
        summary.write("📘 ManyLangs eBook Upload Summary (Sandbox)\n")
        summary.write(f"생성일: {datetime.datetime.now()}\n\n")
        summary.write(f"총 업로드 성공: {len(success_list)}권\n\n")
        for line in success_list:
            summary.write(line)

    print(f"✅ 업로드 검수 요약 리포트 생성 완료\n📄 경로: {summary_path}")
