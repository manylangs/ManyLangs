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

  try {
    const campaignSnap = await db
      .collection("promoCampaigns")
      .orderBy("createdAtMs", "desc")
      .get();

    const campaigns = campaignSnap.docs.map((doc) => {
      const d = doc.data();

      return {
        code: d.code,
        region: d.region ?? null,
        language: d.language ?? null,
        dateStr: d.dateStr,
        startAt: toMs(d.startAt),
        endAt: toMs(d.endAt),
        durationDays: d.durationDays ?? 10,
        usedCount: d.usedCount ?? 0,
        createdAtMs: toMs(d.createdAtMs),
      };
    });

    const regionStats: Record<string, number> = {};
    const dateStats: Record<string, number> = {};

    campaigns.forEach((c) => {
      const key = c.language || c.region || "UNKNOWN";

      regionStats[key] = (regionStats[key] || 0) + c.usedCount;
      dateStats[c.dateStr] = (dateStats[c.dateStr] || 0) + c.usedCount;
    });

    return NextResponse.json(
      {
        success: true,
        campaigns,
        regionStats,
        dateStats,
        totalActivations: campaigns.reduce((s, c) => s + c.usedCount, 0),
      },
      { status: 200 }
    );
  } catch (e: any) {
    const msg =
      typeof e?.message === "string" ? e.message : "stats failed";

    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}