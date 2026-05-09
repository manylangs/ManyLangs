// app/api/coupons/list/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import type { Coupon } from "@/lib/coupons";

export const runtime = "nodejs";

function toMs(v: any): number {
  if (!v) return 0;
  if (typeof v === "number") return v;
  if (typeof v?.toMillis === "function") return v.toMillis();
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pick(c: Coupon) {
  return {
    code: c.code,
    used: !!c.used,
    issuedAt: toMs((c as any).issuedAt),
    usedAt: toMs((c as any).usedAt) || null,
    usedBy: (c as any).usedBy ?? null,

    paymentIntentId: (c as any).paymentIntentId ?? null,
    disabled: !!(c as any).disabled,

    usedLang: (c as any).usedLang ?? null,
    usedSeries: (c as any).usedSeries ?? null,
    usedLevel: (c as any).usedLevel ?? null,

    // 🔥 추가
    source: (c as any).source ?? null,
    purchaseToken: (c as any).purchaseToken ?? null,
  };
}

function timeKey(c: Coupon) {
  const usedAt = toMs((c as any).usedAt);
  const issuedAt = toMs((c as any).issuedAt);
  return Math.max(usedAt, issuedAt);
}

export async function POST(req: Request) {
  let body: { userId?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const userId = String(body?.userId || "").trim();
  if (!userId) {
    return NextResponse.json({ error: "missing userId" }, { status: 400 });
  }

  try {
    const [ownerSnap, usedBySnap] = await Promise.all([
      db.collection("coupons").where("ownerId", "==", userId).get(),
      db.collection("coupons").where("usedBy", "==", userId).get(),
    ]);

    const map = new Map<string, Coupon>();

    for (const d of ownerSnap.docs) {
      const c = d.data() as Coupon;
      if (c?.code) map.set(c.code, c);
    }
    for (const d of usedBySnap.docs) {
      const c = d.data() as Coupon;
      if (c?.code) {
        const prev = map.get(c.code);
        if (!prev || timeKey(c) >= timeKey(prev)) map.set(c.code, c);
      }
    }

    const now = Date.now();
    const licSnap = await db
      .collection("licenses")
      .doc(userId)
      .collection("items")
      .where("expiresAt", ">", now)
      .get();

    const aliveCouponCodes = new Set<string>();
    for (const d of licSnap.docs) {
      const data = d.data() as any;
      if (data?.source === "coupon" && typeof data?.code === "string") {
        aliveCouponCodes.add(data.code);
      }
    }

    const coupons = Array.from(map.values())
      .filter((c) => {
        const ownerId = (c as any).ownerId ?? null;
        const usedBy = (c as any).usedBy ?? null;
        if (ownerId === userId) return true;
        if (usedBy === userId) return true;
        return false;
      })
      .sort((a, b) => {
        const au = !!a.used;
        const bu = !!b.used;
        if (au !== bu) return au ? 1 : -1;
        return timeKey(b) - timeKey(a);
      })
      .map(pick);

    return NextResponse.json(
      {
        success: true,
        coupons,
        meta: {
          ownerCount: ownerSnap.size,
          usedByCount: usedBySnap.size,
          total: coupons.length,
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "list failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}