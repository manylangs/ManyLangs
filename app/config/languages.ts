// 🔒 실제 서비스 중인 학습 대상 언어(교재/음성 완성 후에만 주석 해제)
export const LANGUAGES = [
  //{ code: "kr", label: "Korean" },
  //{ code: "en", label: "English" },
  //{ code: "es", label: "Spanish" },
  //{ code: "fr", label: "French" },
  //{ code: "pt", label: "Portuguese" },
];

// 자동 파생 (실제 서비스 언어 목록 — 코스 노출용)
export const RELEASED_LANGS = LANGUAGES.map(l => l.code);

// 🌐 학습언어 버튼(번역 보기용 UI 언어) — 코스 출시 여부와 무관하게 항상 노출
export const SUPPORTED_LANGS = ["en", "es", "fr", "pt", "kr", "zh", "jp", "ru"];

// ────────────────────────────────────────────────
// 목표언어별 "시리즈×레벨" 출시 제어 (신규)
// 여기 없는 시리즈/레벨은 UI에 안 보이고, 쿠폰 활성화도 서버에서 차단됨.
// idiom은 레벨 구분 없이 "all" 하나로만 판매(기존 방식 그대로 유지).
// ────────────────────────────────────────────────
export const RELEASED_CONTENT: Record<
  string,
  Partial<Record<"grammar" | "conversation" | "real" | "voca" | "idiom", string[]>>
> = {
  kr: {
    grammar: ["a1", "a2", "b1", "b2", "c1", "c2"],
    conversation: ["a1", "a2", "b1", "b2", "c1", "c2"],
    real: ["a1", "a2", "b1", "b2", "c1", "c2"],
    voca: ["a1", "a2", "b1", "b2", "c1", "c2"],
    idiom: ["all"],
  },
  en: {
    grammar: ["a1", "a2", "b1", "b2", "c1", "c2"],
    conversation: ["a1", "a2", "b1", "b2", "c1", "c2"],
    real: ["a1", "a2", "b1", "b2", "c1", "c2"],
    voca: ["a1", "a2", "b1", "b2", "c1", "c2"],
    idiom: ["all"],
  },
  // 예시: 새 목표언어를 완성된 것부터 하나씩 오픈
  es: {
     grammar: ["a1","a2"],
  //   conversation: ["a1"],
   },
};

/** 서버/클라이언트 공통 판정 함수 */
export function isReleasedContent(
  lang: string,
  series: string,
  level: string
): boolean {
  const langConfig = RELEASED_CONTENT[lang];
  if (!langConfig) return false;

  const levels = langConfig[series as keyof typeof langConfig];
  if (!levels) return false;

  if (series === "idiom") return levels.includes("all");

  return levels.includes(String(level).trim().toLowerCase());
}

/** select-books UI가 쓸 헬퍼: 이 언어에서 출시된 시리즈 키 목록 */
export function getReleasedSeries(lang: string): string[] {
  return Object.keys(RELEASED_CONTENT[lang] ?? {});
}

/** select-books UI가 쓸 헬퍼: 이 언어+시리즈에서 출시된 레벨 목록(소문자) */
export function getReleasedLevels(lang: string, series: string): string[] {
  return (RELEASED_CONTENT[lang]?.[series as keyof (typeof RELEASED_CONTENT)[string]] ?? []) as string[];
}
