// app/api/coupons/list/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import type { Coupon } from "@/lib/coupons";

export const runtime = "nodejs";

function toMs(v: any): number {
  if (!v) return 0;
  if (typeof v === "number") return v;
  if (typeof v?.toMillis === "function") return v.toMillis(); // Firestore Timestamp
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
  };
}

function timeKey(c: Coupon) {
  const usedAt = toMs((c as any).usedAt);
  const issuedAt = toMs((c as any).issuedAt);
  return Math.max(usedAt, issuedAt);
}

/**
 * ✅ 중요:
 * - 만료/차단/남은시간 판단은 "licenses"가 담당
 * - coupons/list에서는 절대 "만료 used 쿠폰 숨김" 같은 필터를 하지 않는다.
 * - (호출/타입 꼬임 방지용으로 userId 파라미터는 남겨둠)
 */
// (삭제)

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
      if (c?.code) {
        const prev = map.get(c.code);
        if (!prev || timeKey(c) >= timeKey(prev)) map.set(c.code, c);
      }
    }

    /* =============================== */
    /* ✅ (변경) B가 사용한 쿠폰은 "살아있는 라이선스"가 있을 때만 노출 */
    /* - A(발급자) 화면: 미사용 쿠폰만
       - B(사용자) 화면: usedBy=userId && used=true && (licenses에 살아있음) 일 때만
    */
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
    /* =============================== */

    const coupons = Array.from(map.values())
      /* =============================== */
      /* ✅ (변경) 필터 추가(다른 건 그대로) */
      .filter((c) => {
        const ownerId = (c as any).ownerId ?? null;
        const usedBy = (c as any).usedBy ?? null;

        // 🔥 발급자는 자기 결제 쿠폰 전부 봐야함 (used 포함)
        if (ownerId === userId) return true;

        // 사용자
        if (usedBy === userId) return true;

        return false;
      })
      /* =============================== */
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
