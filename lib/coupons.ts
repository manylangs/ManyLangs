// lib/coupons.ts
import crypto from "crypto";
import { db } from "./firebaseAdmin";

/* ================= types ================= */

export type Coupon = {
  code: string;
  ownerId: string;
  issuedAt: number;
  used: boolean;

  disabled?: boolean;
  disabledAt?: number;

  usedBy?: string;
  usedAt?: number;

  usedLang?: string;
  usedSeries?: string;
  usedLevel?: string;

  expiresAt?: number;

  paymentIntentId?: string;
  checkoutSessionId?: string;

  // 🔥 추가
  source?: string;
  purchaseToken?: string;
};

/* ================= code generator ================= */

function genCode(): string {
  const raw = crypto.randomBytes(8).toString("base64url").toUpperCase();
  return "ML-" + raw.slice(0, 10);
}

/* ================= Stripe-safe TX creator ================= */

export function createCouponsTx(
  tx: FirebaseFirestore.Transaction,
  ownerId: string,
  qty: number,
  paymentIntentId: string | null,
  checkoutSessionId: string | null,
  source?: string,
  purchaseToken?: string | null,
): Coupon[] {

  const now = Date.now();
  const list: Coupon[] = [];

  for (let i = 0; i < qty; i++) {

    const code = genCode();
    const ref = db.collection("coupons").doc(code);

    const coupon: Coupon = {
      code,
      ownerId,
      issuedAt: now,
      used: false,
      ...(paymentIntentId && { paymentIntentId }),
      ...(checkoutSessionId && { checkoutSessionId }),
      ...(source && { source }),
      ...(purchaseToken && { purchaseToken }),
    };

    tx.create(ref, coupon);
    list.push(coupon);
  }

  return list;
}