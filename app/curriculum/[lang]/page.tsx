import type { Metadata } from "next";
import CurriculumClient from "./CurriculumClient";

/**
 * Languages we currently ship curriculum content for.
 * Keep this in sync with app/config/languages.ts (LANGUAGES).
 */
export const SUPPORTED_LANGS = ["en", "kr", "es", "fr", "pt"];

/**
 * Pre-render /curriculum/en, /curriculum/kr, ... at build time so each
 * language gets its own indexable, shareable, statically-generated URL.
 */
export function generateStaticParams() {
  return SUPPORTED_LANGS.map((lang) => ({ lang }));
}

const LANG_TITLES: Record<string, string> = {
  en: "Curriculum | ManyLangs",
  kr: "커리큘럼 | ManyLangs",
  es: "Currículo | ManyLangs",
  fr: "Programme | ManyLangs",
  pt: "Currículo | ManyLangs",
};

const LANG_DESCRIPTIONS: Record<string, string> = {
  en: "Explore the full ManyLangs curriculum: grammar, conversation, vocabulary, idioms, and real-world usage from A1 to C2.",
  kr: "문법, 회화, 어휘, 관용구, 실생활 표현까지 A1부터 C2까지 ManyLangs의 전체 커리큘럼을 확인하세요.",
  es: "Explora el currículo completo de ManyLangs: gramática, conversación, vocabulario, modismos y uso real, de A1 a C2.",
  fr: "Découvrez le programme complet de ManyLangs : grammaire, conversation, vocabulaire, expressions idiomatiques et usage réel, de A1 à C2.",
  pt: "Explore o currículo completo do ManyLangs: gramática, conversação, vocabulário, expressões idiomáticas e uso real, de A1 a C2.",
};

type PageParams = { lang: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const safeLang = SUPPORTED_LANGS.includes(lang) ? lang : "en";

  return {
    title: LANG_TITLES[safeLang],
    description: LANG_DESCRIPTIONS[safeLang],
    alternates: {
      canonical: `/curriculum/${safeLang}`,
      languages: Object.fromEntries(
        SUPPORTED_LANGS.map((l) => [l, `/curriculum/${l}`])
      ),
    },
  };
}

/**
 * /curriculum/[lang]
 *
 * Server component: reads the language straight from the URL segment
 * (params.lang) — the URL is the single source of truth. All client-side
 * interactivity (dropdown, copy-link, hover states) lives in
 * CurriculumClient, which receives `lang` as a plain prop.
 */
export default async function CurriculumPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { lang } = await params;

  return <CurriculumClient lang={lang} />;
}
