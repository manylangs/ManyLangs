// lib/coupons.ts
import { saveLicense, License } from "./license";
import crypto from "crypto";

/* ================= types ================= */

export type Coupon = {
  code: string;
  ownerId: string;
  issuedAt: number;
  used: boolean;

  // redeem 시점에 채워짐
  usedBy?: string;
  usedAt?: number;

  // ✅ 어떤 교재에 썼는지 저장 (쿠폰 UI/정리용)
  usedLang?: string;
  usedSeries?: string;
  usedLevel?: string;
};

/* ================= storage (in-memory mock) ================= */

const g = globalThis as any;
g.__COUPONS__ ||= [] as Coupon[];
export const COUPONS: Coupon[] = g.__COUPONS__;

/* ================= price → qty mapping ================= */

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
  if (!qty) throw new Error(`Unsupported price: ${price}`);
  return createCoupons(ownerId, qty);
}

// 🔐 안전한 코드 생성기
function genCode() {
  // ML- + 8자리 (대문자/숫자 위주)
  const raw = crypto.randomBytes(6).toString("base64url").toUpperCase();
  return "ML-" + raw.slice(0, 8);
}

export function createCoupons(ownerId: string, qty: number) {
  const now = Date.now();

  // 기존 코드 집합 (중복 방지)
  const used = new Set(COUPONS.map((c) => c.code));
  const list: Coupon[] = [];

  for (let i = 0; i < qty; i++) {
    let code = genCode();

    // ✅ 충돌 시 재생성 (최대 20회)
    for (let tries = 0; tries < 20 && used.has(code); tries++) {
      code = genCode();
    }
    if (used.has(code)) {
      throw new Error("Coupon code collision: retry limit exceeded");
    }

    used.add(code);

    list.push({
      code,
      ownerId,
      issuedAt: now,
      used: false,
    });
  }

  COUPONS.push(...list);
  return list;
}

/* ================= redeem ================= */

/**
 * ✅ route.ts에서 기대하는 형태:
 * { coupon, license }
 */
export async function redeemCoupon(params: {
  code: string;
  userId: string;
  selection: { lang: string; series: string; level: string };
  durationMs?: number; // 기본 10분
}): Promise<{ coupon: Coupon; license: License }> {
  const { code, userId, selection } = params;
  const durationMs = params.durationMs ?? 1000 * 60 * 10;

  const { lang, series, level } = selection;

  const coupon = COUPONS.find((c) => c.code === code);
  if (!coupon) throw new Error("Invalid coupon code");
  if (coupon.used) throw new Error("Coupon already used");

  const finalLevel = series === "voca" || series === "idiom" ? "all" : level;

  // ✅ 쿠폰 used 처리
  coupon.used = true;
  coupon.usedBy = userId;
  coupon.usedAt = Date.now();

  // ✅ 어떤 교재에 썼는지 저장 (쿠폰 UI/정리용)
  coupon.usedLang = lang;
  coupon.usedSeries = series;
  coupon.usedLevel = finalLevel;

  // ✅ 라이선스 생성 (단일 구조)
  const license: License = {
    lang,
    series,
    level: finalLevel,
    expiresAt: Date.now() + durationMs,
    source: "coupon",
    code,
    issuedAt: Date.now(),
  };

  // ✅ 로컬 라이브러리에 저장
  saveLicense(license);

  return { coupon, license };
}
