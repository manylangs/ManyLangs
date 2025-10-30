import stripe, json, datetime, os
from dotenv import load_dotenv

# 1) .env 파일 로드
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)

# 2) 환경 변수에서 Stripe 키 읽기
STRIPE_MODE = os.getenv("STRIPE_MODE", "test")
STRIPE_TEST_KEY = os.getenv("STRIPE_TEST_KEY")
STRIPE_CURRENCY = os.getenv("STRIPE_CURRENCY", "usd")

# 3) API 키 설정
stripe.api_key = STRIPE_TEST_KEY

# 4) 헬스체크 (테스트 연결용)
try:
    balance = stripe.Balance.retrieve()
    print("✅ Stripe Test Mode connected successfully.")
    print(f"Account currency: {STRIPE_CURRENCY.upper()}")
except Exception as e:
    print("❌ Stripe connection failed.")
    print(e)
