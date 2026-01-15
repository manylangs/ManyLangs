// lib/coupons.ts

export type Coupon = {
  code: string;
  ownerId: string;
  issuedAt: number;
  expiresAt: number;
  used: boolean;

  // ✅ redeem 시점에 채워짐
  usedBy?: string;
  usedAt?: number;
};

const g = globalThis as any;
g.__COUPONS__ ||= [] as Coupon[];

export const COUPONS: Coupon[] = g.__COUPONS__;

export function createCoupons(ownerId: string, qty: number) {
  const now = Date.now();
  const expiresAt = now + 1000 * 60 * 60 * 24 * 30 * 6; // 6개월

  const list: Coupon[] = Array.from({ length: qty }).map(() => ({
    code: "ML-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
    ownerId,
    issuedAt: now,
    expiresAt,
    used: false,
  }));

  COUPONS.push(...list);
  return list;
}
