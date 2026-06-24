import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

// GET — 리드 목록 (Country / City 필터)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const country = searchParams.get("country");
    const city = searchParams.get("city");

    const db = getDb();

    let sql = `
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
    const args: string[] = [];

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

    sql += " ORDER BY id DESC LIMIT 1000";

    const result = await db.execute({
      sql,
      args,
    });

    return NextResponse.json({
      success: true,
      leads: result.rows,
    });
  } catch (err: any) {
    console.error("[LEADS GET]", err);

    return NextResponse.json(
      {
        success: false,
        leads: [],
        error: err.message,
      },
      { status: 500 }
    );
  }
}