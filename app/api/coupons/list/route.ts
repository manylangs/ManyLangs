// app/api/coupons/list/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { Coupon } from "@/lib/coupons";

export const runtime = "nodejs";

function pick(c: Coupon) {
  return {
    code: c.code,
    used: !!c.used,
    issuedAt: c.issuedAt,
    usedAt: c.usedAt ?? null,
    usedBy: c.usedBy ?? null,

    usedLang: c.usedLang ?? null,
    usedSeries: c.usedSeries ?? null,
    usedLevel: c.usedLevel ?? null,
  };
}

export async function POST(req: Request) {
  let body: { userId?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ error: "missing userId" }, { status: 400 });
  }

  try {
    // 🔥 OR 대체: ownerId 쿼리 + usedBy 쿼리 2번 후 머지
    const [ownerSnap, usedBySnap] = await Promise.all([
      db.collection("coupons").where("ownerId", "==", userId).get(),
      db.collection("coupons").where("usedBy", "==", userId).get(),
    ]);

    // ✅ code 기준 dedupe
    const map = new Map<string, Coupon>();

    for (const d of ownerSnap.docs) {
      const c = d.data() as Coupon;
      if (c?.code) map.set(c.code, c);
    }
    for (const d of usedBySnap.docs) {
      const c = d.data() as Coupon;
      if (c?.code) map.set(c.code, c);
    }

    const coupons = Array.from(map.values())
      // ✅ 정렬: 미사용 먼저, used는 뒤로 + 최신 issuedAt 우선
      .sort((a, b) => {
        const au = !!a.used;
        const bu = !!b.used;
        if (au !== bu) return au ? 1 : -1;
        return (b.issuedAt ?? 0) - (a.issuedAt ?? 0);
      })
      .map(pick);

    return NextResponse.json({ coupons });
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "list failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
