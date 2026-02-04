// app/api/coupons/redeem/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { Coupon } from "@/lib/coupons";
import type { License } from "@/lib/license";

export const runtime = "nodejs";

type RedeemBody = {
  code: string;
  userId: string;
  lang: string;
  series: string;
  level: string;
};

export async function POST(req: Request) {
  let body: RedeemBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { code, userId, lang, series, level } = body;

  if (!code || !userId || !lang || !series || !level) {
    return NextResponse.json(
      { error: "missing required fields" },
      { status: 400 }
    );
  }

  const couponCode = String(code).trim();
  const finalLevel = series === "voca" || series === "idiom" ? "all" : String(level).trim();

  try {
    const ref = db.collection("coupons").doc(couponCode);

    const { coupon, license } = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);

      if (!snap.exists) {
        throw new Error("Invalid coupon code");
      }

      const c = snap.data() as Coupon;

      // 소유자 체크(정책상 필요)
      if (c.ownerId !== userId) {
        throw new Error("Invalid coupon code");
      }

      if (c.used) {
        throw new Error("Coupon already used");
      }

      const now = Date.now();

      const updated: Coupon = {
        ...c,
        code: couponCode,
        used: true,
        usedBy: userId,
        usedAt: now,
        usedLang: String(lang).trim(),
        usedSeries: String(series).trim(),
        usedLevel: finalLevel,
      };

      tx.set(ref, updated, { merge: true });

      // ✅ 라이선스 생성 (프론트가 기대하는 구조 그대로)
      const lic: License = {
        lang: String(lang).trim(),
        series: String(series).trim(),
        level: finalLevel,
        expiresAt: now + 1000 * 60 * 10, // 기본 10분 (현 테스트 정책 유지)
        source: "coupon",
        code: couponCode,
        issuedAt: now,
      };

      return { coupon: updated, license: lic };
    });

    // ✅ 기존 프론트는 { success:true, coupon, license }를 기대하던 흐름 유지
    return NextResponse.json({ success: true, coupon, license }, { status: 200 });
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "redeem failed";
    const lower = msg.toLowerCase();

    if (lower.includes("invalid coupon")) {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    if (lower.includes("already used")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
