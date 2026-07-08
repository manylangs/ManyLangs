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

    // campaign_id(들)이 오면 email_tracking으로 정확히 스코프를 좁혀서 리셋
    const ids: string[] = Array.isArray(campaign_ids)
      ? campaign_ids
      : campaign_id
      ? [campaign_id]
      : [];

    if (ids.length > 0) {
      const placeholders = ids.map(() => "?").join(",");

      // 1. 해당 캠페인이 보낸 대상만 schools.campaign_status → NEW
      const leadSql = `
        UPDATE schools
        SET campaign_status = 'NEW'
        WHERE campaign_status = 'SENT'
          AND email IN (
            SELECT email FROM email_tracking
            WHERE campaign_id IN (${placeholders})
          )
      `;

      const leadResult = await db.execute({ sql: leadSql, args: ids });

      // 2. Campaign 자체도 DRAFT로 되돌리고 발송 지표 초기화
      //    (send_runs는 누적값이므로 건드리지 않는다)
      const campaignSql = `
        UPDATE campaigns
        SET
          status = 'DRAFT',
          sent_count = 0,
          latest_opened = 0,
          latest_clicked = 0
        WHERE campaign_id IN (${placeholders})
      `;

      await db.execute({ sql: campaignSql, args: ids });

      return NextResponse.json({
        success: true,
        updated: leadResult.rowsAffected ?? 0,
        scope: "campaign_id",
      });
    }

    // campaign_id가 없으면 기존 country/city 스코프 유지 (하위호환, lead만 리셋)
    const savedCountry =
      !country || country === "ALL" || country === "All Countries"
        ? "ALL"
        : country;

    const savedCity =
      !city || city === "ALL" || city === "All Cities" ? "ALL" : city;

    let sql = `
      UPDATE schools
      SET campaign_status = 'NEW'
      WHERE campaign_status = 'SENT'
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

    const result = await db.execute({ sql, args });

    return NextResponse.json({
      success: true,
      updated: result.rowsAffected ?? 0,
      scope: "country_city",
    });
  } catch (err: any) {
    console.error("[CAMPAIGN RESET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}