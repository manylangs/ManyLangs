import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const country = searchParams.get("country");
    const city = searchParams.get("city");
    const campaignId = searchParams.get("campaign_id");

    const db = getDb();

    let sql: string;
    const args: string[] = [];

    if (campaignId) {
      // 이 캠페인이 실제로 발송한 리드만 정확히 조회 (email_tracking 기준)
      sql = `
        SELECT
          s.id,
          s.school_name,
          s.website,
          s.email,
          s.country,
          s.city,
          s.campaign_status,
          s.source
        FROM schools s
        JOIN email_tracking t
          ON t.email = s.email
         AND t.campaign_id = ?
      `;
      args.push(campaignId);

      const where: string[] = [];
      if (country && country !== "ALL") {
        where.push("s.country = ?");
        args.push(country);
      }
      if (city && city !== "ALL") {
        where.push("s.city = ?");
        args.push(city);
      }
      if (where.length > 0) {
        sql += " AND " + where.join(" AND ");
      }
    } else {
      // 기존 country/city 전체 스코프 조회 (하위호환)
      sql = `
        SELECT
          id,
          school_name,
          website,
          email,
          country,
          city,
          campaign_status,
          source
        FROM schools
      `;

      const where: string[] = [];
      if (country && country !== "ALL") {
        where.push("country = ?");
        args.push(country);
      }
      if (city && city !== "ALL") {
        where.push("city = ?");
        args.push(city);
      }
      if (where.length > 0) {
        sql += " WHERE " + where.join(" AND ");
      }
    }

    sql += " ORDER BY id DESC LIMIT 1000";

    const result = await db.execute({ sql, args });

    return NextResponse.json({ success: true, leads: result.rows });
  } catch (err: any) {
    console.error("[LEADS GET]", err);
    return NextResponse.json(
      { success: false, leads: [], error: err.message },
      { status: 500 }
    );
  }
}