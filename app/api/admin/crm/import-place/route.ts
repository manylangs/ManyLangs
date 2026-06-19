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
    const place = await req.json();

    const db = getDb();

    const result = await db.execute({
      sql: `
        INSERT OR IGNORE INTO schools
        (
          school_name,
          website,
          email,
          phone,
          country,
          city,
          lead_type,
          source,
          discovery_batch,
          is_merged,
          is_contacted,
          lead_score,
          lead_status,
          campaign_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'COLD', 'NEW')
      `,
      args: [
        place.displayName?.text || "",
        place.websiteUri || "",
        "",
        place.internationalPhoneNumber || "",
        "",
        "",
        "LANGUAGE_SCHOOL",
        "GOOGLE_PLACES",
        "places_manual",
      ],
    });

    return NextResponse.json({
      success: true,
      imported: result.rowsAffected,
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
