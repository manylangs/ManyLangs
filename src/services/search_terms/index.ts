import { EN_TERMS } from "./en";
import { ES_TERMS } from "./es";
import { KO_TERMS } from "./ko";
import { PT_TERMS } from "./pt";
import { FR_TERMS } from "./fr";
import { COUNTRY_LANGUAGE_MAP } from "./languages";

const TERM_MAP: Record<string, string[]> = {
  en: EN_TERMS,
  es: ES_TERMS,
  ko: KO_TERMS,
  pt: PT_TERMS,
  fr: FR_TERMS,
};

export function getTermsByCountry(country: string) {
  const languages =
    COUNTRY_LANGUAGE_MAP[country] || ["en"];

  return languages.flatMap(
    (lang) => TERM_MAP[lang] || []
  );
}
