import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

export async function GET(req: NextRequest) {
  try {
    const db = getDb();

    const country =
      req.nextUrl.searchParams.get("country");

    const city =
      req.nextUrl.searchParams.get("city");

    const where: string[] = [
      "status = 'EMAIL_DONE'"
    ];

    const args: any[] = [];

    if (country) {
      where.push("country = ?");
      args.push(country);
    }

    if (city) {
      where.push("city = ?");
      args.push(city);
    }

    const rows = await db.execute({
      sql: `
        SELECT
          place_id,
          name,
          website,
          email,
          country,
          city
        FROM place_queue
        WHERE ${where.join(" AND ")}
      `,
      args,
    });

    let processed = 0;
    let imported = 0;
    let duplicated = 0;

    for (const row of rows.rows) {
      const placeId = String(row.place_id || "");
      const name = String(row.name || "");
      const website = String(row.website || "");
      const email = String(row.email || "");
      const country = String(row.country || "");
      const city = String(row.city || "");

      processed++;

      const result = await db.execute({
        sql: `
          INSERT OR IGNORE INTO schools
          (
            school_name,
            website,
            email,
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
          VALUES
          (
            ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'COLD', 'NEW'
          )
        `,
        args: [
          name,
          website,
          email,
          country,
          city,
          "LANGUAGE_SCHOOL",
          "GOOGLE_PLACES",
          "places_auto_import",
        ],
      });

      if ((result.rowsAffected || 0) > 0) {
        imported++;
      } else {
        duplicated++;
      }

      await db.execute({
        sql: `
          DELETE FROM place_queue
          WHERE place_id = ?
        `,
        args: [placeId],
      });
    }

    return NextResponse.json({
      success: true,
      processed,
      imported,
      duplicated,
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