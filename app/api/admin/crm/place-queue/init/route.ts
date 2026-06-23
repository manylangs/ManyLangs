import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

async function initSchema(db: ReturnType<typeof createClient>) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS place_queue (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id   TEXT UNIQUE,
      district   TEXT,
      status     TEXT DEFAULT 'NEW',
      website    TEXT,
      email      TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function GET(req: NextRequest) {
  try {
    const db = getDb();

    await initSchema(db);

    const country =
      req.nextUrl.searchParams.get("country");

    const city =
      req.nextUrl.searchParams.get("city");

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

    const whereSql =
      where.length > 0
        ? `WHERE ${where.join(" AND ")}`
        : "";

    const placeIdsResult = await db.execute({
      sql: `
        SELECT COUNT(*) as count
        FROM place_queue
        ${whereSql}
      `,
      args,
    });

    const websitesResult = await db.execute({
      sql: `
        SELECT COUNT(*) as count
        FROM place_queue
        ${whereSql}
        ${whereSql ? "AND" : "WHERE"}
        website IS NOT NULL
        AND website != ''
      `,
      args,
    });

    const newEmailsResult = await db.execute({
      sql: `
        SELECT COUNT(*) as count
        FROM place_queue
        ${whereSql}
        ${whereSql ? "AND" : "WHERE"}
        status = 'EMAIL_DONE'
      `,
      args,
    });

    const totalEmailsWhere: string[] = [
      "email IS NOT NULL",
      "email != ''",
    ];

    const totalEmailsArgs: any[] = [];

    if (country) {
      totalEmailsWhere.push("country = ?");
      totalEmailsArgs.push(country);
    }

    if (city) {
      totalEmailsWhere.push("city = ?");
      totalEmailsArgs.push(city);
    }

    const totalEmailsResult = await db.execute({
      sql: `
    SELECT COUNT(*) as count
    FROM schools
    WHERE ${totalEmailsWhere.join(" AND ")}
  `,
      args: totalEmailsArgs,
    });

    const countriesResult = await db.execute(`
      SELECT DISTINCT country
      FROM place_queue
      WHERE country IS NOT NULL
      AND country != ''
      ORDER BY country
    `);

    const citiesResult = await db.execute({
      sql: `
        SELECT DISTINCT city
        FROM place_queue
        WHERE city IS NOT NULL
        AND city != ''
        ${country ? "AND country = ?" : ""}
        ORDER BY city
      `,
      args: country ? [country] : [],
    });

    return NextResponse.json({
      success: true,

      placeIds:
        Number(placeIdsResult.rows[0]?.count || 0),

      websites:
        Number(websitesResult.rows[0]?.count || 0),

      newEmails:
        Number(newEmailsResult.rows[0]?.count || 0),

      totalEmails:
        Number(totalEmailsResult.rows[0]?.count || 0),

      countries: countriesResult.rows,
      cities: citiesResult.rows,
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