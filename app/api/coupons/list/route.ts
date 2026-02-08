// app/api/coupons/list/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import type { Coupon } from "@/lib/coupons";

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

function timeKey(c: Coupon) {
  return Math.max(c.usedAt ?? 0, c.issuedAt ?? 0);
}

// ✅ 서버에서 "만료된 내 used 쿠폰" 제거용
function isExpiredUsedCoupon(c: Coupon) {
  // 공유 used(라이선스 없을 수 있음)는 숨기지 않음
  if (!c.used) return false;
  if (!c.usedSeries) return false;

  const expiresAt = (c as any)?.expiresAt as number | undefined;

  // ✅ (핵심) expiresAt 없는 과거 used 쿠폰은 만료로 간주 → 숨김
  if (!expiresAt) return true;

  return Date.now() > expiresAt;
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

    const coupons = Array.from(map.values())
      // ✅ (핵심) 만료된 내 used 쿠폰 제거
      .filter((c) => !isExpiredUsedCoupon(c))
      // ✅ 정렬: 미사용 먼저, used는 뒤로 + 최신(usedAt/issuedAt) 우선
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
