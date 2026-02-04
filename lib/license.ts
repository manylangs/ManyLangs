// lib/license.ts

export type LicenseSource = "coupon" | "payment";

export type License = {
  lang: string;
  series: string;
  level: string; // a1~c2 | all
  expiresAt: number; // ms
  source: LicenseSource;
  code?: string; // coupon code if source=coupon
  issuedAt?: number; // ms
};

const STORAGE_KEY = "library";

/** seconds(ms)로 잘못 들어온 값 방어 */
export function normalizeExpiresAt(expiresAt: number) {
  if (!Number.isFinite(expiresAt)) return 0;
  // 1e12 미만이면 초 단위로 보고 ms로 변환
  if (expiresAt > 0 && expiresAt < 1e12) return expiresAt * 1000;
  return expiresAt;
}

export function isExpired(expiresAt: number) {
  const t = normalizeExpiresAt(expiresAt);
  if (!t) return true;
  return Date.now() >= t;
}

export function remainingMs(expiresAt: number) {
  const t = normalizeExpiresAt(expiresAt);
  return Math.max(0, t - Date.now());
}

export function remainingText(expiresAt: number) {
  const ms = remainingMs(expiresAt);
  if (ms <= 0) return "Expired";

  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  if (days >= 1) return `D-${days}`;

  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  const hh = String(hours).padStart(2, "0");
  const mm = String(mins).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** localStorage에서 전체 라이브러리 로드 */
export function loadLibrary(): License[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = JSON.parse(raw || "[]");
    if (!Array.isArray(arr)) return [];

    return arr
      .map((x) => ({
        ...x,
        expiresAt: normalizeExpiresAt(x?.expiresAt),
      }))
      .filter((x) => x && x.lang && x.series && x.level);
  } catch {
    return [];
  }
}

/** localStorage 저장 */
export function saveLibrary(list: License[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/** 만료 자동 제거 + 저장까지 */
export function cleanExpiredLibrary(): License[] {
  const lib = loadLibrary();
  const alive = lib.filter((l) => !isExpired(l.expiresAt));
  saveLibrary(alive);
  return alive;
}

/** (lang, series, level) 기준 upsert */
export function upsertLicense(newOne: License): License[] {
  const lib = loadLibrary();

  const normalized: License = {
    ...newOne,
    expiresAt: normalizeExpiresAt(newOne.expiresAt),
  };

  const next = lib.filter(
    (l) =>
      !(
        l.lang === normalized.lang &&
        l.series === normalized.series &&
        l.level === normalized.level
      )
  );

  next.push(normalized);
  saveLibrary(next);
  return next;
}

/**
 * ✅ 하위호환 별칭
 * - 과거 코드가 saveLicense를 import해도 깨지지 않게 유지
 */
export const saveLicense = upsertLicense;

/** 현재 선택 항목에 매칭되는 라이선스 찾기 */
export function findLicense(selection: {
  lang: string;
  series: string;
  level: string;
}) {
  const lib = loadLibrary();
  return lib.find(
    (l) =>
      l.lang === selection.lang &&
      l.series === selection.series &&
      l.level === selection.level
  );
}

/** 특정 쿠폰(code)로 생성된 라이선스들 */
export function findLicensesByCouponCode(code: string) {
  const lib = loadLibrary();
  return lib.filter((l) => l.source === "coupon" && l.code === code);
}
