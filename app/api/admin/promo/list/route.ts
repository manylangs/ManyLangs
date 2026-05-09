import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

function toMs(v: any): number {
  if (!v) return 0;
  if (typeof v === "number") return v;
  if (typeof v?.toMillis === "function") return v.toMillis();
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(req: Request) {
  const adminEmail = req.headers.get("x-admin-email");
  if (!adminEmail || adminEmail !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = Date.now();

  try {
    // 활성화 기한이 남아있는 promo 쿠폰만 조회 (7일 지난 건 자동 숨김)
    // Firestore composite index 필요: source ASC, activationDeadline ASC, createdAtMs DESC
    const snap = await db
      .collection("coupons")
      .where("source", "==", "promo")
      .where("activationDeadline", ">", now)
      .orderBy("activationDeadline", "asc")
      .get();

    const coupons = snap.docs
      .map((doc) => {
        const d = doc.data();
        return {
          code: d.code,
          used: !!(d.used || d.isUsed),  // ✅ 두 필드 모두 fallback
          createdAtMs: toMs(d.createdAtMs) || toMs(d.createdAt),
          activationDeadline: toMs(d.activationDeadline),
          durationDays: d.durationDays ?? 14,
          usedBy: d.usedBy ?? null,
          usedAt: toMs(d.usedAt) || null,
        };
      })
      // 최신순 정렬 (클라이언트에서)
      .sort((a, b) => b.createdAtMs - a.createdAtMs);

    return NextResponse.json({ success: true, coupons }, { status: 200 });
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "list failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}