import json
import difflib

# ✅ Compact Feedback Logic (서버리스 발음 교정 테스트)
target_sentence = "안녕하세요, 만나서 반갑습니다."
stt_result = "안녀하세요 만나서 방갑습니다"

# 간단한 유사도 비교 함수
def similarity(a, b):
    return difflib.SequenceMatcher(None, a, b).ratio()

accuracy = round(similarity(target_sentence, stt_result) * 100, 2)

feedback = {
    "target_sentence": target_sentence,
    "stt_result": stt_result,
    "accuracy": accuracy,
    "tone_deviation": 0.12,
    "missing_phonemes": ["ㄴ", "ㅂ"],
    "hint": "‘안녕하세요’의 초성 ‘ㄴ’ 발음이 약합니다."
}

# JSON 파일 저장
with open(r"D:\ManyLangs\ai_feedback_test\feedback.json", "w", encoding="utf-8") as f:
    json.dump(feedback, f, ensure_ascii=False, indent=2)

print(f"✅ Compact Feedback Logic 테스트 완료 — 정확도: {accuracy}%")
