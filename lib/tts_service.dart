import 'languages_loader.dart';

class TTSService {
  final LanguagesConfig config;

  TTSService(this.config);

  void speak(String text, String series) {
    final engine = config.ttsEngine[series] ?? 'Google';

    if (engine == 'Google') {
      print('[Google TTS] ▶ $text');
      // TODO: Google TTS API 호출 로직 추가
    } else if (engine == 'ElevenLabs') {
      print('[ElevenLabs TTS] ▶ $text');
      // TODO: ElevenLabs TTS API 호출 로직 추가
    } else {
      print('[Default TTS] ▶ $text');
    }
  }
}
