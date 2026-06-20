import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

export async function GET() {
  try {
    const db = getDb();

    const before = await db.execute(`
      SELECT COUNT(*) as count
      FROM schools
      WHERE source='APOLLO'
    `);

    await db.execute(`
      DELETE FROM schools
      WHERE source='APOLLO'
    `);

    return NextResponse.json({
      success: true,
      deleted: (before.rows[0] as any).count,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
