export interface PromoLanguage {
  code: string;
  name: string;
}

export const PROMO_LANGUAGES: PromoLanguage[] = [
  { code: "ENGLISH", name: "English" },
  { code: "SPANISH", name: "Spanish" },
  { code: "FRENCH", name: "French" },
  { code: "GERMAN", name: "German" },
  { code: "PORTUGUESE", name: "Portuguese" },
  { code: "ITALIAN", name: "Italian" },
  { code: "KOREAN", name: "Korean" },
  { code: "JAPANESE", name: "Japanese" },
  { code: "SIMPLIFIED_CHINESE", name: "Simplified Chinese" },
  { code: "TRADITIONAL_CHINESE", name: "Traditional Chinese" },
  { code: "RUSSIAN", name: "Russian" },
  { code: "ARABIC", name: "Arabic" },
  { code: "HINDI", name: "Hindi" },
  { code: "TURKISH", name: "Turkish" },
  { code: "VIETNAMESE", name: "Vietnamese" },
  { code: "THAI", name: "Thai" },
  { code: "INDONESIAN", name: "Indonesian" },
  { code: "MALAY", name: "Malay" },
  { code: "DUTCH", name: "Dutch" },
  { code: "POLISH", name: "Polish" },
  { code: "UKRAINIAN", name: "Ukrainian" },
  { code: "ROMANIAN", name: "Romanian" },
  { code: "CZECH", name: "Czech" },
  { code: "GREEK", name: "Greek" },
  { code: "HEBREW", name: "Hebrew" },
  { code: "SWEDISH", name: "Swedish" },
  { code: "NORWEGIAN", name: "Norwegian" },
  { code: "DANISH", name: "Danish" },
  { code: "FINNISH", name: "Finnish" },
  { code: "TAGALOG", name: "Tagalog" },
];

export interface PromoPlatform {
  code: string;
  name: string;
}

export const PROMO_PLATFORMS: PromoPlatform[] = [
  { code: "SNS-X", name: "X" },
  { code: "SNS-TT", name: "TikTok" },
  { code: "SNS-YT", name: "YouTube" },
  { code: "SNS-IS", name: "Instagram" },
  { code: "SNS-FB", name: "Facebook" },
];