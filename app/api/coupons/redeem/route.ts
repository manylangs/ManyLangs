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
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
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

      const usedBySnap = await tx.get(
        db.collection("coupons").where("usedBy", "==", userId).limit(200)
      );

      const wantLang = String(lang).trim();
      const wantSeries = String(series).trim();

      let hasActive = false;

      // ✅ (추가) expiresAt이 Timestamp/number 섞여도 ms(number)로 통일
      const toMs = (v: any): number => {
        if (!v) return 0;
        if (typeof v === "number") return v;
        if (typeof v?.toMillis === "function") return v.toMillis();
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      for (const doc of usedBySnap.docs) {
        const x = doc.data() as any;

        if (!x?.used) continue;
        if (!x?.expiresAt) continue;

        // ✅ 같은 교재/레벨만 막기
        if (x.usedLang !== wantLang) continue;
        if (x.usedSeries !== wantSeries) continue;
        if (x.usedLevel !== finalLevel) continue;

        // ✅ 만료 전이면 활성 (Timestamp도 안전하게 비교)
        const exp = toMs(x.expiresAt);
        if (exp > now) {
          hasActive = true;
          break;
        }
      }

      if (hasActive) {
        throw new Error("Active license exists");
      }

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

      const updated: Coupon = {
        ...c,
        code: couponCode,
        used: true,
        usedBy: userId,
        usedAt: now,
        usedLang: String(lang).trim(),
        usedSeries: String(series).trim(),
        usedLevel: finalLevel,

        // ✅ list에서 만료 판단 가능하도록 저장
        expiresAt: lic.expiresAt,
      };

      tx.set(ref, updated, { merge: true });

      return { coupon: updated, license: lic };
    });

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
    if (lower.includes("active license exists")) {
      return NextResponse.json(
        { error: "You are already studying this textbook. Please wait until it expires." },
        { status: 400 }
      );
    }

    // ✅ Firestore index / FAILED_PRECONDITION → 사용자 메시지로 치환
    if (lower.includes("failed_precondition") || lower.includes("requires an index")) {
      return NextResponse.json(
        { error: "You are already studying this textbook. Please wait until it expires." },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
