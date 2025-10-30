import firebase_admin
from firebase_admin import credentials, firestore
import json, datetime

# Firebase 키 경로
cred = credentials.Certificate(r"D:\ManyLangs\keys\firebase_key.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# progress.json 불러오기
with open(r"D:\ManyLangs\progress.json", "r", encoding="utf-8") as f:
    progress_data = json.load(f)

# Firestore에 업로드
user_id = progress_data["user_id"]
progress_data["last_updated"] = datetime.datetime.utcnow().isoformat()

db.collection("progress").document(user_id).set(progress_data)

print(f"✅ Firestore 업로드 완료: {user_id}")
