import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();

    const {
      country,
      city,
    } = await req.json();

    const savedCountry =
      !country ||
      country === "ALL" ||
      country === "All Countries"
        ? "ALL"
        : country;

    const savedCity =
      !city ||
      city === "ALL" ||
      city === "All Cities"
        ? "ALL"
        : city;

    let sql = `
      UPDATE schools
      SET campaign_status = 'NEW'
      WHERE campaign_status = 'SENT'
    `;

    const args: string[] = [];

    if (savedCountry !== "ALL") {
      sql += ` AND country = ?`;
      args.push(savedCountry);
    }

    if (savedCity !== "ALL") {
      sql += ` AND city = ?`;
      args.push(savedCity);
    }

    const result = await db.execute({
      sql,
      args,
    });

    return NextResponse.json({
      success: true,
      updated: result.rowsAffected ?? 0,
    });
  } catch (err: any) {
    console.error("[CAMPAIGN RESET]", err);

    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
