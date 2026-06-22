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

  await db.execute(`
    ALTER TABLE place_queue
    ADD COLUMN html TEXT
  `).catch(() => { });

  await db.execute(`
    ALTER TABLE place_queue
    ADD COLUMN name TEXT
  `).catch(() => { });

  await db.execute(`
    ALTER TABLE place_queue
    ADD COLUMN country TEXT
  `).catch(() => { });

  await db.execute(`
    ALTER TABLE place_queue
    ADD COLUMN city TEXT
  `).catch(() => { });

  await db.execute(`
    ALTER TABLE place_queue
    ADD COLUMN search_term TEXT
  `).catch(() => { });

  await db.execute(`
    ALTER TABLE place_queue
    ADD COLUMN district_name TEXT
  `).catch(() => { });

  return NextResponse.json({
    success: true,
  });
}