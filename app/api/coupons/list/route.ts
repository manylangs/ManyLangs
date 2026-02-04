// app/api/coupons/list/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { Coupon } from "@/lib/coupons";

export const runtime = "nodejs";

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
    const snap = await db
      .collection("coupons")
      .where("ownerId", "==", userId)
      .get();

    const coupons = snap.docs
      .map((d) => d.data() as Coupon)
      .map((c) => ({
        code: c.code,
        used: !!c.used,
        issuedAt: c.issuedAt,
        usedAt: c.usedAt ?? null,
        usedBy: c.usedBy ?? null,

        // ✅ 쿠폰이 어떤 교재에 사용됐는지 (UI/정리용)
        usedLang: c.usedLang ?? null,
        usedSeries: c.usedSeries ?? null,
        usedLevel: c.usedLevel ?? null,
      }));

    return NextResponse.json({ coupons });
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "list failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
