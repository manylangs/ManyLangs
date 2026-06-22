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
    const db = getDb();

    const country =
      req.nextUrl.searchParams.get("country");

    const city =
      req.nextUrl.searchParams.get("city");

    const status =
      req.nextUrl.searchParams.get("status");

    const where: string[] = [];
    const args: any[] = [];

    if (country) {
      where.push("country = ?");
      args.push(country);
    }

    if (city) {
      where.push("city = ?");
      args.push(city);
    }

    if (status) {
      where.push("status = ?");
      args.push(status);
    }

    const whereSql =
      where.length > 0
        ? `WHERE ${where.join(" AND ")}`
        : "";

    const result = await db.execute({
      sql: `
        SELECT
          id,
          name,
          country,
          city,
          status,
          website,
          email
        FROM place_queue
        ${whereSql}
        ORDER BY id DESC
        LIMIT 100
      `,
      args,
    });

    return NextResponse.json({
      success: true,
      rows: result.rows,
    });
  } catch (err: any) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}