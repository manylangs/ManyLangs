export type UiLangKey =
  | "en"
  | "es"
  | "pt"
  | "fr"
  | "kr"
  | "zh"
  | "jp";

export const UI_TARGET_LABELS: Record<UiLangKey, { native: string; en: string }> = {
  en: { native: "English", en: "English" },
  es: { native: "Español", en: "Spanish" },
  pt: { native: "Português", en: "Portuguese" },
  fr: { native: "Français", en: "French" },
  kr: { native: "한국어", en: "Korean" },
  zh: { native: "中文", en: "Chinese" },
  jp: { native: "日本語", en: "Japanese" },
};

