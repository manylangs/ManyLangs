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

        const rows = await db.execute(`
      SELECT
        place_id,
        name,
        website,
        email,
        country,
        city
      FROM place_queue
      WHERE status = 'EMAIL_DONE'
      LIMIT 100
    `);

        let processed = 0;
        let imported = 0;

        for (const row of rows.rows) {
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
            }
        }

        return NextResponse.json({
            success: true,
            processed,
            imported,
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