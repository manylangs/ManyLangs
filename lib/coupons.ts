// lib/coupons.ts
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

/* ================= code generator ================= */

function genCode(): string {
  const raw = crypto.randomBytes(8).toString("base64url").toUpperCase();
  return "ML-" + raw.slice(0, 10); // 길이 증가 → 충돌 확률 극히 낮음
}

/* ================= Stripe-safe TX creator ================= */

/**
 * 🔒 Firestore transaction 전용
 * - read 없이 create 사용
 * - 이미 존재하면 transaction 자체가 실패
 * - webhook idempotency 구조와 궁합 완벽
 */
export function createCouponsTx(
  tx: FirebaseFirestore.Transaction,
  ownerId: string,
  qty: number
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
    };

    // 🔥 read 없이 바로 create
    // 이미 존재하면 자동으로 transaction 실패 → 안전
    tx.create(ref, coupon);

    list.push(coupon);
  }

  return list;
}