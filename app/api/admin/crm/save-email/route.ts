import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

export async function POST(req: Request) {
  try {
    const { website, email } = await req.json();

    const db = getDb();

    const result = await db.execute({
      sql: `
        UPDATE schools
        SET email = ?
        WHERE website = ?
      `,
      args: [email, website],
    });

    return NextResponse.json({
      success: true,
      updated: result.rowsAffected,
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
