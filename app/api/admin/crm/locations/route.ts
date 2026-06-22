import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

export async function GET(req: NextRequest) {
  const db = getDb();

  const { searchParams } = new URL(req.url);

  const country = searchParams.get("country");
  const city = searchParams.get("city");

  if (!country) {
    const rows = await db.execute(`
      SELECT DISTINCT country
      FROM location_master
      WHERE country IS NOT NULL
      AND country <> ''
      ORDER BY country
    `);

    return NextResponse.json({
      countries: rows.rows.map((r: any) => r.country),
    });
  }

  if (!city) {
    const rows = await db.execute({
      sql: `
        SELECT DISTINCT city
        FROM location_master
        WHERE country = ?
        AND city IS NOT NULL
        AND city <> ''
        ORDER BY city
      `,
      args: [country],
    });

    return NextResponse.json({
      cities: rows.rows.map((r: any) => r.city),
    });
  }

  const rows = await db.execute({
    sql: `
      SELECT DISTINCT district
      FROM location_master
      WHERE country = ?
      AND city = ?
      AND district IS NOT NULL
      AND district <> ''
      ORDER BY district
    `,
    args: [country, city],
  });

  return NextResponse.json({
    districts: rows.rows.map((r: any) => r.district),
  });
}
