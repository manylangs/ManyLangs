import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const { country, city, campaign_id, campaign_ids } = await req.json();

    const ids: string[] = Array.isArray(campaign_ids)
      ? campaign_ids
      : campaign_id
      ? [campaign_id]
      : [];

    // ==========================
    // Campaign Reset (신규 구조)
    // ==========================
    if (ids.length > 0) {
      const placeholders = ids.map(() => "?").join(",");

      // 1. 해당 캠페인의 발송/오픈/클릭 기록 삭제
      const trackingResult = await db.execute({
        sql: `
          DELETE
          FROM email_tracking
          WHERE campaign_id IN (${placeholders})
        `,
        args: ids,
      });

      // 2. Campaign 상태 초기화
      await db.execute({
        sql: `
          UPDATE campaigns
          SET
            status = 'DRAFT',
            sent_count = 0,
            latest_opened = 0,
            latest_clicked = 0
          WHERE campaign_id IN (${placeholders})
        `,
        args: ids,
      });

      return NextResponse.json({
        success: true,
        deleted_tracking: trackingResult.rowsAffected ?? 0,
        scope: "campaign_id",
      });
    }

    // ==========================
    // 하위호환 (예전 country/city Reset)
    // ==========================

    const savedCountry =
      !country || country === "ALL" || country === "All Countries"
        ? "ALL"
        : country;

    const savedCity =
      !city || city === "ALL" || city === "All Cities"
        ? "ALL"
        : city;

    let sql = `
      UPDATE campaigns
      SET status = 'DRAFT'
      WHERE 1=1
    `;

    const args: string[] = [];

    if (savedCountry !== "ALL") {
      sql += ` AND country = ?`;
      args.push(savedCountry);
    }

    if (savedCity !== "ALL") {
      sql += ` AND city = ?`;
      args.push(savedCity);
    }

    const result = await db.execute({
      sql,
      args,
    });

    return NextResponse.json({
      success: true,
      updated: result.rowsAffected ?? 0,
      scope: "country_city",
    });
  } catch (err: any) {
    console.error("[CAMPAIGN RESET]", err);

    return NextResponse.json(
      {
        error: err.message,
      },
      {
        status: 500,
      }
    );
  }
}