// 🔒 실제 서비스 중인 학습 대상 언어(교재/음성 완성 후에만 주석 해제)
export const LANGUAGES = [
  { code: "kr", label: "Korean" },
  { code: "en", label: "English" },
  //{ code: "es", label: "Spanish" },
  //{ code: "fr", label: "French" },
  //{ code: "pt", label: "Portuguese" },
];

// 자동 파생 (실제 서비스 언어 목록 — 코스 노출용)
export const RELEASED_LANGS = LANGUAGES.map(l => l.code);

// 🌐 학습언어 버튼(번역 보기용 UI 언어) — 코스 출시 여부와 무관하게 항상 5개 노출
export const SUPPORTED_LANGS = ["en", "es", "fr", "pt","kr","zh","jp"];