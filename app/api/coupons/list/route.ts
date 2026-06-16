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

    source: (c as any).source ?? null,
    purchaseToken: (c as any).purchaseToken ?? null,
    transactionId: (c as any).transactionId ?? null,
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
    const [ownerSnap, usedBySnap, promoSnap] = await Promise.all([
      db.collection("coupons").where("ownerId", "==", userId).get(),
      db.collection("coupons").where("usedBy", "==", userId).get(),
      db.collection("promoActivations").where("userId", "==", userId).get(),
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

        if (!prev || timeKey(c) >= timeKey(prev)) {
          map.set(c.code, c);
        }
      }
    }

    const now = Date.now();

    await db
      .collection("licenses")
      .doc(userId)
      .collection("items")
      .where("expiresAt", ">", now)
      .get();

    const couponItems = Array.from(map.values())
      .filter((c) => {
        const ownerId = (c as any).ownerId ?? null;
        const usedBy = (c as any).usedBy ?? null;

        return ownerId === userId || usedBy === userId;
      })
      .map(pick);

    const promoItems = promoSnap.docs.map((d) => {
      const p = d.data() as any;

      return {
        code: p.code,
        used: true,
        issuedAt: p.activatedAtMs ?? 0,
        usedAt: p.activatedAtMs ?? 0,
        usedBy: userId,

        paymentIntentId: null,
        disabled: false,

        usedLang: p.lang ?? null,
        usedSeries: p.series ?? null,
        usedLevel: p.level ?? null,

        source: "promo_campaign",
        purchaseToken: null,
      };
    });

    const coupons = [...couponItems, ...promoItems].sort((a: any, b: any) => {
      const au = !!a.used;
      const bu = !!b.used;

      if (au !== bu) return au ? 1 : -1;

      const at = Math.max(a.usedAt || 0, a.issuedAt || 0);
      const bt = Math.max(b.usedAt || 0, b.issuedAt || 0);

      return bt - at;
    });

    return NextResponse.json(
      {
        success: true,
        coupons,
        meta: {
          ownerCount: ownerSnap.size,
          usedByCount: usedBySnap.size,
          promoCount: promoSnap.size,
          total: coupons.length,
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    const msg =
      typeof e?.message === "string"
        ? e.message
        : "list failed";

    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
