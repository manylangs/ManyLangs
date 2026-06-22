import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { getPlaceDetails } from "@/src/services/collectors/google_places_collector";

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
      SELECT id, place_id
      FROM place_queue
      WHERE status = 'NEW'
      LIMIT 200
    `);

    let processed = 0;
    let websitesFound = 0;

    for (const row of rows.rows) {
      try {
        const placeId = String(row.place_id);

        const details = await getPlaceDetails(placeId);

        const address = details.formattedAddress || "";

        const parts = address.split(",");

        const country =
          parts.length > 0
            ? parts[parts.length - 1].trim()
            : "";

        const city =
          parts.length > 1
            ? parts[parts.length - 2].trim()
            : "";

        await db.execute({
          sql: `
            UPDATE place_queue
            SET
              name = ?,
              website = ?,
              country = ?,
              city = ?,
              status = 'DETAILS_DONE'
            WHERE place_id = ?
          `,
          args: [
            details.displayName?.text || "",
            details.websiteUri || "",
            country,
            city,
            placeId,
          ],
        });

        processed++;

        if (details.websiteUri) {
          websitesFound++;
        }
      } catch (e) {
        console.error(row.place_id, e);

        await db.execute({
          sql: `
            UPDATE place_queue
            SET status = 'DETAILS_FAILED'
            WHERE place_id = ?
          `,
          args: [String(row.place_id)],
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      websitesFound,
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