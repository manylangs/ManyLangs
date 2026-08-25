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
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401 }
    );
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

        // 기존 필드 유지
        region: d.region ?? null,
        language: d.language ?? null,

        // 신규 SNS 플랫폼 필드
        platform: d.platform ?? null,

        dateStr: d.dateStr,
        startAt: toMs(d.startAt),
        endAt: toMs(d.endAt),
        durationDays: d.durationDays ?? 10,
        usedCount: d.usedCount ?? 0,
        createdAtMs: toMs(d.createdAtMs),
      };
    });

    /*
     * 기존 이름(languageRegionStats)은 그대로 유지.
     * 프론트와의 호환성을 깨지 않기 위해 이름을 변경하지 않음.
     * 내부적으로 Platform까지 함께 집계.
     */
    const languageRegionStats: Record<string, number> = {};
    const dateStats: Record<string, number> = {};

    campaigns.forEach((c) => {
      const key =
        c.platform ||
        c.language ||
        c.region ||
        "UNKNOWN";

      languageRegionStats[key] =
        (languageRegionStats[key] || 0) + c.usedCount;

      dateStats[c.dateStr] =
        (dateStats[c.dateStr] || 0) + c.usedCount;
    });

    return NextResponse.json(
      {
        success: true,
        campaigns,
        languageRegionStats,
        dateStats,
        totalActivations: campaigns.reduce(
          (sum, campaign) =>
            sum + campaign.usedCount,
          0
        ),
      },
      { status: 200 }
    );
  } catch (e: any) {
    const msg =
      typeof e?.message === "string"
        ? e.message
        : "stats failed";

    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}