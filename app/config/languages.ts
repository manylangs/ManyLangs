export const LANGUAGES = [
  { code: "kr", label: "Korean" },
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "pt", label: "Portuguese" },
];

// 자동 파생
export const SUPPORTED_LANGS = LANGUAGES.map(l => l.code);