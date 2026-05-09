import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { Coupon } from "@/lib/coupons";
import type { License } from "@/lib/license";
import { FieldValue } from "firebase-admin/firestore";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

type RedeemBody = {
  code: string;
  lang: string;
  series: string;
  level: string;
};

const DAY_MS = 1000 * 60 * 60 * 24;

function toMs(v: any): number {
  if (!v) return 0;
  if (typeof v === "number") return v;
  if (typeof v?.toMillis === "function") return v.toMillis();
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401 }
    );
  }

  let body: RedeemBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid body" },
      { status: 400 }
    );
  }

  const { code, lang, series, level } = body;

  if (!code || !lang || !series || !level) {
    return NextResponse.json(
      { error: "missing required fields" },
      { status: 400 }
    );
  }

  const couponCode = String(code).trim().toUpperCase();

  const finalLevel =
    series === "idiom"
      ? "all"
      : String(level).trim();

  try {
    const ref = db.collection("coupons").doc(couponCode);

    const { coupon, license } = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);

      if (!snap.exists) {
        throw new Error("Invalid coupon code");
      }

      const c = snap.data() as Coupon;

      if (c.used) {
        throw new Error("Coupon already used");
      }

      const now = Date.now();

      // ✅ promo 쿠폰 전용 체크
      if ((c as any).source === "promo") {
        const deadline = toMs((c as any).activationDeadline);
        if (deadline > 0 && now > deadline) {
          throw new Error("Promotion coupon expired");
        }
      }

      const wantLang = String(lang).trim();
      const wantSeries = String(series).trim();

      const licDocId = `${wantLang}_${wantSeries}_${finalLevel}`;

      const licRef = db
        .collection("licenses")
        .doc(userId)
        .collection("items")
        .doc(licDocId);

      const licSnap = await tx.get(licRef);

      if (licSnap.exists) {
        const exp = toMs(licSnap.data()?.expiresAt);
        if (exp > now) {
          throw new Error("Active license exists");
        }
      }

      // ✅ promo는 durationDays 사용, 기존은 30일 고정
      const durationDays = (c as any).durationDays ?? 30;
      const expiresAt = now + DAY_MS * durationDays;

      const lic: License = {
        lang: wantLang,
        series: wantSeries,
        level: finalLevel,
        expiresAt,
        source: "coupon",
        code: couponCode,
        issuedAt: now,
      };

      tx.set(
        licRef,
        {
          lang: lic.lang,
          series: lic.series,
          level: lic.level,
          expiresAt: lic.expiresAt,
          source: "coupon",
          code: couponCode,
          issuedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          issuedAtMs: now,
        },
        { merge: true }
      );

      const updated: Coupon = {
        ...c,
        code: couponCode,
        used: true,
        usedBy: userId,
        usedAt: now,
        usedLang: wantLang,
        usedSeries: wantSeries,
        usedLevel: finalLevel,
        expiresAt,
      };

      tx.set(ref, updated, { merge: true });

      return { coupon: updated, license: lic };
    });

    return NextResponse.json(
      {
        success: true,
        coupon,
        license,
        serverNowMs: Date.now(),
      },
      { status: 200 }
    );

  } catch (e: any) {
    const msg =
      typeof e?.message === "string"
        ? e.message
        : "redeem failed";

    const lower = msg.toLowerCase();

    if (lower.includes("invalid coupon")) {
      return NextResponse.json(
        { error: "Invalid or refunded coupon." },
        { status: 404 }
      );
    }

    if (lower.includes("already used")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (lower.includes("promotion coupon expired")) {
      return NextResponse.json(
        { error: "This promotional coupon has expired." },
        { status: 400 }
      );
    }

    if (lower.includes("active license exists")) {
      return NextResponse.json(
        {
          error:
            "You are already studying this textbook. Please wait until it expires.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
