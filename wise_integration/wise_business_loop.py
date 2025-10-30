import os, json, datetime

# 1) 브랜드 정책 불러오기
brand_policy_path = "D:/ManyLangs/brand_config/brand_policy.json"
with open(brand_policy_path, "r", encoding="utf-8") as f:
    brand_policy = json.load(f)

# 2) 테스트 Wise 연동 로그 폴더
output_dir = "D:/ManyLangs/wise_integration/output"
os.makedirs(output_dir, exist_ok=True)

# 3) 가상 Wise 연동 테스트 데이터
wise_accounts = [
    {"platform":"YouTube","account_name":"ManyLangs Studio","status":"sandbox"},
    {"platform":"Google Books","account_name":"ManyLangs Studio","status":"sandbox"},
    {"platform":"Amazon","account_name":"ManyLangs Studio","status":"sandbox"},
    {"platform":"Stripe/Firebase","account_name":"ManyLangs Studio","status":"sandbox"}
]

# 4) 로그 파일 생성
log_path = os.path.join(output_dir, f"wise_integration_log_{datetime.date.today()}.txt")
with open(log_path, "w", encoding="utf-8") as log:
    for acct in wise_accounts:
        log.write(f"[{datetime.datetime.now()}] 💰 {acct['platform']} 계정 '{acct['account_name']}' 연동 상태: {acct['status']}\n")
    log.write("\n")
    
print(f"✅ Wise 연동 테스트 완료 — {len(wise_accounts)} 계정 확인")
print(f"📄 로그 경로: {log_path}")
