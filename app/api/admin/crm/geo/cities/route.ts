import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
    return createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
    });
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);

    const country = searchParams.get("country");

    if (!country) {
        return NextResponse.json({
            success: false,
            error: "country required",
        });
    }

    const db = getDb();

    const result = await db.execute({
        sql: `
      SELECT
        city_name
      FROM cities
      WHERE country_code = ?
      ORDER BY city_name
    `,
        args: [country],
    });

    return NextResponse.json({
        success: true,
        rows: result.rows,
    });
}