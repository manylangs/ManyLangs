import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

// GET — 리드 목록 (status 필터 가능)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const db = getDb();

    let sql = `
      SELECT
        id, school_name, website, email, country,
        lead_type, lead_status, lead_score, campaign_status, source
      FROM schools
    `;

    const args: string[] = [];

    if (status && status !== "ALL") {
      sql += " WHERE lead_status = ?";
      args.push(status);
    }

    sql += " ORDER BY lead_score DESC LIMIT 500";

    const result = await db.execute({ sql, args });

    return NextResponse.json({ leads: result.rows });
  } catch (err: any) {
    console.error("[LEADS GET]", err);
    return NextResponse.json({ leads: [] });
  }
}