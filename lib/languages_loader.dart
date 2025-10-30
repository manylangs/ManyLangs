import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;

class LanguagesConfig {
  final Map<String, String> ttsEngine;

  LanguagesConfig({required this.ttsEngine});

  factory LanguagesConfig.fromJson(Map<String, dynamic> json) {
    return LanguagesConfig(
      ttsEngine: Map<String, String>.from(json['tts_engine']),
    );
  }
}

Future<LanguagesConfig> loadLanguagesConfig() async {
  final data = await rootBundle.loadString('assets/languages.json');
  final jsonResult = jsonDecode(data);
  return LanguagesConfig.fromJson(jsonResult);
}
