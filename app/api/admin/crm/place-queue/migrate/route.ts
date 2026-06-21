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
  `).catch(() => {});

  return NextResponse.json({
    success: true,
  });
}