from google.cloud import texttospeech
import os

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"D:\ManyLangs\keys\google_tts_key.json"

client = texttospeech.TextToSpeechClient()

input_path = r"D:\ManyLangs\tts_sentences.txt"
output_dir = r"D:\ManyLangs\output\tts_test"

with open(input_path, "r", encoding="utf-8") as f:
    lines = [line.strip() for line in f if line.strip()]

for i, text in enumerate(lines, start=1):
    synthesis_input = texttospeech.SynthesisInput(text=text)
    voice = texttospeech.VoiceSelectionParams(language_code="ko", name="ko-KR-Wavenet-A")
    audio_config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3)

    response = client.synthesize_speech(input=synthesis_input, voice=voice, audio_config=audio_config)

    output_path = os.path.join(output_dir, f"ko_test_{i}.mp3")
    with open(output_path, "wb") as out:
        out.write(response.audio_content)
    print(f"✅ 문장 {i} 변환 완료 → {output_path}")

print("🎧 모든 테스트 음성 생성 완료!")
