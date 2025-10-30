from openai import OpenAI
import firebase_admin
from firebase_admin import credentials, firestore
import json, os, sys

# ✅ UTF-8 출력 설정
sys.stdout.reconfigure(encoding='utf-8')

# ✅ Firebase 연결
cred = credentials.Certificate(r"D:\ManyLangs\keys\firebase_key.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# ✅ OpenAI 클라이언트 (환경 변수 방식)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ✅ 작문 데이터 로드
with open(r"D:\ManyLangs\writing_sample.json", "r", encoding="utf-8") as f:
    data = json.load(f)

prompt = f"다음 문장의 문법과 자연스러움을 평가하고 수정안을 제시해 주세요:\n\n{data['input_text']}"
prompt = prompt.encode('utf-8', 'ignore').decode('utf-8')

# ✅ 최신 API 호출
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": prompt}],
    temperature=0.3
)

feedback = response.choices[0].message.content

# ✅ Firestore 저장
data["ai_feedback"] = feedback
data["score"] = 95
db.collection("writing_feedback").document(data["user_id"]).set(data)

print("✅ Writing AI 피드백 저장 완료!")

