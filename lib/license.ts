// lib/license.ts

export type License = {
  lang: string;
  series: string;
  level: string;
  expiresAt: number;
  source: "coupon" | "payment";
  code?: string;
};

/**
 * library 전체 반환
 */
export function getLibrary(): License[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem("library");
  if (!raw) return [];

  try {
    return JSON.parse(raw) as License[];
  } catch {
    return [];
  }
}

/**
 * 유효한 license만 반환 (만료 제거)
 */
export function getValidLibrary(): License[] {
  const now = Date.now();
  return getLibrary().filter(l => l.expiresAt > now);
}

/**
 * 특정 교재 license 존재 여부
 */
export function hasLicense(params: {
  lang: string;
  series: string;
  level: string;
}): boolean {
  const { lang, series, level } = params;

  return getValidLibrary().some(l => {
    const licLevel =
      l.series === "voca" || l.series === "idiom"
        ? "all"
        : l.level;

    return (
      l.lang === lang &&
      l.series === series &&
      licLevel === level
    );
  });
}

/**
 * ✅ License 저장 (중복 제거 후 추가)
 * coupon / payment 공용
 */
export function saveLicense(newLicense: License) {
  if (typeof window === "undefined") return;

  const list = getLibrary();

  const filtered = list.filter(
    l =>
      !(
        l.lang === newLicense.lang &&
        l.series === newLicense.series &&
        l.level === newLicense.level
      )
  );

  const next = [...filtered, newLicense];

  localStorage.setItem("library", JSON.stringify(next));
}

/**
 * 만료 license 정리
 */
export function cleanupExpiredLicenses() {
  if (typeof window === "undefined") return;

  const valid = getValidLibrary();
  localStorage.setItem("library", JSON.stringify(valid));
}

/**
 * 전체 초기화 (테스트/로그아웃용)
 */
export function clearLibrary() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("library");
}
