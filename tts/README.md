# ManyLangs TTS 생성기

시리즈당 생성기 1개, 언어는 `common/config.py`의 상수로만 관리한다.

```
tts/
├── common/
│   └── config.py                  ← 언어 추가 시 이 파일만 수정
├── conversation/build_conversation_tts.py
├── voca/build_voca_tts.py
├── idiom/build_idiom_tts.py
└── real/build_real_tts.py
```

## 실행

```bash
cd /Users/junghasuk/Desktop/ManyLangs/web

python3 tts/voca/build_voca_tts.py         --lang kr --level a1 --chapter 001 --overwrite
python3 tts/idiom/build_idiom_tts.py       --lang es --overwrite
python3 tts/conversation/build_conversation_tts.py --lang fr --overwrite
python3 tts/real/build_real_tts.py         --lang pt --overwrite
```

지원 언어: `en` `kr` `es` `fr` `pt`

## 새 언어 추가 (예: 독일어)

`common/config.py`에서 4곳만 수정한다. **생성 로직은 절대 수정하지 않는다.**

```python
SUPPORTED_LANGS = [..., "de"]
LANGUAGE_CODE["de"] = "de-DE"
TEXT_FIELD_DEFAULT["de"] = "de"    # TEXT_FIELD_REAL["de"] = "de" 도 함께
VOICE_SINGLE["de"] = {"default": "de-DE-Neural2-A"}
VOICE_AB["de"] = {"A": "de-DE-Neural2-A", "B": "de-DE-Neural2-B"}  # A=여성, B=남성
```

이후 절차: 001 하나 생성 → 청취 → cue 확인 → 샘플 3개 업로드 → Viewer 검증 → 전체 생성.

## ⚠️ Real의 TEXT_FIELD 예외 (혼동 주의)

시리즈별로 JSON의 한국어 텍스트 위치가 다르다:

| 시리즈 | kr 텍스트 위치 | 사용하는 매핑 |
|---|---|---|
| voca / idiom / conversation | `"target"` 키 | `TEXT_FIELD_DEFAULT` (kr → `"target"`) |
| **real** | `"kr"` 키 (직접) | `TEXT_FIELD_REAL` (kr → `"kr"`) |

```jsonc
// voca / idiom / conversation
"sentences": { "target": "안녕.", "en": "Hi.", "es": "Hola." }

// real
"texts": { "kr": "안녕.", "en": "Hi.", "es": "Hola." }
```

JSON 스키마 세대 차이에서 온 것으로, 콘텐츠 전체를 재생성하지 않는 한 이 예외를 유지한다.
"왜 Real만 다르지?"라는 의문이 들면 이 문서와 `config.py` 상단 주석을 보면 된다.

## Voice 정책

- 가능한 모든 언어 **Neural2 계열로 통일**
- **예외: pt-PT(유럽 포르투갈어)는 Google TTS에 Neural2가 없음** → Wavenet 사용
  (Neural2는 pt-BR 브라질만 제공. 콘텐츠가 유럽식이므로 pt-PT 유지)
- 단일 목소리 시리즈 = 여성 / conversation은 A=여성, B=남성
- 새 voice는 반드시: Google 지원 목록 확인 → 001 생성 → 청취 검증 후 확정

## 공통 표준 (변경 금지)

- Google Cloud TTS / LINEAR16 / 24000Hz
- 병합은 `AudioSegment.from_file()` + `final_audio += seg` 만 사용 (PCM bytes 직접 병합 금지)
- cue는 세트 시작 직전 `cues.append(len(final_audio))` — 실제 누적 길이만 신뢰
- WAV + cues.json 둘 다 존재하면 SKIP (`--overwrite`로 강제 재생성)
