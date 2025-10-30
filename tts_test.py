from google.cloud import texttospeech
import json, os

# Google TTS 키 경로 지정
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"D:\ManyLangs\keys\google_tts_key.json"

# JSON 파일 열기 (BOM 문제 방지)
with open(r"D:\ManyLangs\tts_layer.json", "r", encoding="utf-8-sig") as f:
    config = json.load(f)

# 테스트용 한국어 문장
lang = "ko"
text = "안녕하세요, ManyLangs 테스트입니다."
voice_name = config[lang]["voice"]

# TTS 요청
client = texttospeech.TextToSpeechClient()
synthesis_input = texttospeech.SynthesisInput(text=text)
voice = texttospeech.VoiceSelectionParams(language_code=lang, name=voice_name)
audio_config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3)

# 음성 생성 및 저장
response = client.synthesize_speech(
    input=synthesis_input,
    voice=voice,
    audio_config=audio_config
)

output_path = r"D:\ManyLangs\output\tts_test\ko_test.mp3"
with open(output_path, "wb") as out:
    out.write(response.audio_content)

print(f"✅ TTS 생성 완료: {output_path}")

