// lib/coupons.ts
import { saveLicense, License } from "./license";
import crypto from "crypto";
import { db } from "./firebaseAdmin";

/* ================= types ================= */

export type Coupon = {
  code: string;
  ownerId: string;
  issuedAt: number;
  used: boolean;

  usedBy?: string;
  usedAt?: number;

  usedLang?: string;
  usedSeries?: string;
  usedLevel?: string;

  expiresAt?: number;
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

function genCode() {
  const raw = crypto.randomBytes(6).toString("base64url").toUpperCase();
  return "ML-" + raw.slice(0, 8);
}

export async function createCoupons(ownerId: string, qty: number) {
  const now = Date.now();

  const used = new Set(COUPONS.map((c) => c.code));
  const list: Coupon[] = [];

  for (let i = 0; i < qty; i++) {
    let code = genCode();

    for (let tries = 0; tries < 20 && used.has(code); tries++) {
      code = genCode();
    }
    if (used.has(code)) {
      throw new Error("Coupon code collision: retry limit exceeded");
    }

    used.add(code);

    const coupon: Coupon = {
      code,
      ownerId,
      issuedAt: now,
      used: false,
    };

    list.push(coupon);

    // Firestore에 즉시 저장 (문서 ID = code)
    await db.collection("coupons").doc(code).set(coupon);
  }

  COUPONS.push(...list);
  return list;
}
export function createCouponsTx(
  tx: FirebaseFirestore.Transaction,
  ownerId: string,
  qty: number
): Coupon[] {
  const now = Date.now();
  const list: Coupon[] = [];
  const used = new Set<string>();

  for (let i = 0; i < qty; i++) {
    let code = genCode();

    for (let tries = 0; tries < 20 && used.has(code); tries++) {
      code = genCode();
    }
    if (used.has(code)) {
      throw new Error("Coupon code collision: retry limit exceeded");
    }

    used.add(code);

    const coupon: Coupon = {
      code,
      ownerId,
      issuedAt: now,
      used: false,
    };

    const ref = db.collection("coupons").doc(code);
    tx.set(ref, coupon);

    list.push(coupon);
  }

  return list;
}

/* ================= redeem ================= */

/**
 * ✅ Firestore 기준 redeem
 * { coupon, license }
 */
export async function redeemCoupon(params: {
  code: string;
  userId: string;
  selection: { lang: string; series: string; level: string };
  durationMs?: number;
}): Promise<{ coupon: Coupon; license: License }> {
  const { code, userId, selection } = params;
  const durationMs = params.durationMs ?? 1000 * 60 * 10;

  const normalize = (s: string) => s.trim().toUpperCase();
  const normalizedCode = normalize(code);

  const { lang, series, level } = selection;
  const finalLevel = series === "voca" || series === "idiom" ? "all" : level;

  const ref = db.collection("coupons").doc(normalizedCode);

  const { coupon, expiresAt } = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Invalid coupon code");

    const c = snap.data() as Coupon;
    if (c.used) throw new Error("Coupon already used");

    const now = Date.now();
    const expiresAt = now + durationMs;

    const updated: Coupon = {
      ...c,
      used: true,
      usedBy: userId,
      usedAt: now,
      usedLang: lang,
      usedSeries: series,
      usedLevel: finalLevel,
      expiresAt,
    };

    tx.update(ref, updated);
    return { coupon: updated, expiresAt };
  });

  const license: License = {
    lang,
    series,
    level: finalLevel,
    expiresAt,
    source: "coupon",
    code: normalizedCode,
    issuedAt: Date.now(),
  };

  saveLicense(license);

  return { coupon, license };
}
