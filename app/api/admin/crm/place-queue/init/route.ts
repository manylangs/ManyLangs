import { NextResponse } from "next/server";
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

export async function GET() {
  try {
    const db = getDb();

    await initSchema(db);

    const result = await db.execute(`
      SELECT
        status,
        COUNT(*) as count
      FROM place_queue
      GROUP BY status
    `);

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