// lib/coupons.ts

import { saveLicense, License } from "./license";

/* ================= types ================= */

export type Coupon = {
  code: string;
  ownerId: string;
  issuedAt: number;
  used: boolean;

  // redeem 시점에 채워짐
  usedBy?: string;
  usedAt?: number;
};

/* ================= storage (in-memory mock) ================= */

const g = globalThis as any;
g.__COUPONS__ ||= [] as Coupon[];
export const COUPONS: Coupon[] = g.__COUPONS__;

/* ================= price → qty mapping ================= */

// 💰 결제 금액별 쿠폰 수 (고정 규칙)
export const PRICE_TO_COUPON_QTY: Record<number, number> = {
  3: 2,
  5: 4,
  20: 20,
  50: 60,
  100: 150,
};

/* ================= create ================= */

export function createCouponsByPrice(ownerId: string, price: number) {
  const qty = PRICE_TO_COUPON_QTY[price];
  if (!qty) {
    throw new Error(`Unsupported price: ${price}`);
  }
  return createCoupons(ownerId, qty);
}

export function createCoupons(ownerId: string, qty: number) {
  const now = Date.now();

  // ✅ 쿠폰은 영구 소유 (expiresAt 없음)
  const list: Coupon[] = Array.from({ length: qty }).map(() => ({
    code:
      "ML-" +
      Math.random().toString(36).slice(2, 10).toUpperCase(),
    ownerId,
    issuedAt: now,
    used: false,
  }));

  COUPONS.push(...list);
  return list;
}

/* ================= redeem ================= */

/**
 * ✅ 쿠폰 redeem
 * - 쿠폰 검증
 * - 사용 처리
 * - License 생성 + library 저장
 */
export function redeemCoupon(params: {
  code: string;
  userId: string;
  lang: string;
  series: string;
  level: string;
  durationMs: number; // ex) 10분 테스트
}): License {
  const { code, userId, lang, series, level, durationMs } = params;

  const coupon = COUPONS.find((c) => c.code === code);
  if (!coupon) {
    throw new Error("Invalid coupon code");
  }

  if (coupon.used) {
    throw new Error("Coupon already used");
  }

  // ✅ 쿠폰 만료 없음 (Coupon expired 체크 제거)

  // 쿠폰 사용 처리
  coupon.used = true;
  coupon.usedBy = userId;
  coupon.usedAt = Date.now();

  const license: License = {
    lang,
    series,
    level: series === "voca" || series === "idiom" ? "all" : level,
    expiresAt: Date.now() + durationMs,
    source: "coupon",
    code,
  };

  // 🔑 단일 진실 소스
  saveLicense(license);

  return license;
}
