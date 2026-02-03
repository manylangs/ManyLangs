// lib/license.ts

export type License = {
  lang: string;
  series: string; // grammar | conversation | voca | idiom | real ...
  level: string;  // a1~c2 or "all"(voca/idiom)
  expiresAt: number;
  source: "coupon" | "payment";
  code?: string;
  issuedAt?: number;
};

const LIB_KEY = "library";

function normalizeLevel(series: string, level: string) {
  return series === "voca" || series === "idiom" ? "all" : level;
}

/**
 * library 전체 반환 (만료 포함)
 * - 만료도 UI에서 "Expired"로 보여줘야 하므로 절대 자동 제거하지 않음
 */
export function getLibrary(): License[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(LIB_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as License[];
  } catch {
    return [];
  }
}

/**
 * 만료 여부
 */
export function isExpired(expiresAt: number) {
  return Date.now() >= expiresAt;
}

/**
 * 남은시간 포맷 (UI용)
 * - 1일 이상: D-3
 * - 1일 미만: hh:mm
 */
export function formatRemaining(expiresAt: number) {
  const ms = expiresAt - Date.now();
  if (ms <= 0) return "Expired";

  const totalMin = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMin / (60 * 24));

  if (days >= 1) return `D-${days}`;

  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;

  const hh = String(hours).padStart(2, "0");
  const mm = String(mins).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * 특정 교재의 "활성(유효) 라이선스" 1개 반환
 */
export function getActiveLicense(params: {
  lang: string;
  series: string;
  level: string;
}): License | null {
  const { lang, series, level } = params;
  const normLevel = normalizeLevel(series, level);

  const list = getLibrary();

  // 같은 교재가 여러 번 저장될 수 있으니, 가장 늦게 만료되는 것 우선
  const matches = list
    .filter(l => {
      const licLevel = normalizeLevel(l.series, l.level);
      return l.lang === lang && l.series === series && licLevel === normLevel;
    })
    .sort((a, b) => b.expiresAt - a.expiresAt);

  const best = matches[0];
  if (!best) return null;

  return isExpired(best.expiresAt) ? null : best;
}

/**
 * 특정 교재 license 존재 여부 (유효 기준)
 */
export function hasLicense(params: {
  lang: string;
  series: string;
  level: string;
}): boolean {
  return !!getActiveLicense(params);
}

/**
 * ✅ License 저장 (중복 제거 후 추가)
 * - voca/idiom은 level=all로 강제 저장
 */
export function saveLicense(newLicense: License) {
  if (typeof window === "undefined") return;

  const normalized: License = {
    ...newLicense,
    level: normalizeLevel(newLicense.series, newLicense.level),
  };

  const list = getLibrary();

  const filtered = list.filter(l => {
    const lLevel = normalizeLevel(l.series, l.level);
    return !(
      l.lang === normalized.lang &&
      l.series === normalized.series &&
      lLevel === normalized.level
    );
  });

  const next = [...filtered, normalized];
  localStorage.setItem(LIB_KEY, JSON.stringify(next));
}

/**
 * (선택) 만료 license 정리
 * - 자동 호출 금지. "정리" 버튼 같은 곳에서만 쓰기.
 */
export function cleanupExpiredLicenses() {
  if (typeof window === "undefined") return;

  const next = getLibrary().filter(l => !isExpired(l.expiresAt));
  localStorage.setItem(LIB_KEY, JSON.stringify(next));
}

/**
 * 전체 초기화 (테스트/로그아웃용)
 */
export function clearLibrary() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LIB_KEY);
}
