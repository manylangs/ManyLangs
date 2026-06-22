import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
    return createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
    });
}

export async function GET() {
    const db = getDb();

    const result = await db.execute(`
    SELECT
      country_code,
      country_name
    FROM countries
    ORDER BY country_name
  `);

    return NextResponse.json({
        success: true,
        rows: result.rows,
    });
}