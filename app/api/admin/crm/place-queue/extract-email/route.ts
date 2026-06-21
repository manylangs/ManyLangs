import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
    return createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
    });
}

function extractBestEmail(html: string): string | null {
    const matches =
        html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];

    const emails = Array.from(
        new Set(matches.map((e) => e.toLowerCase()))
    );

    const filtered = emails.filter((email) => {
        return (
            !email.includes(".png") &&
            !email.includes(".jpg") &&
            !email.includes(".jpeg") &&
            !email.includes(".webp") &&
            !email.includes("example.com") &&
            !email.includes("sentry") &&
            !email.includes("noreply") &&
            !email.includes("no-reply")
        );
    });

    const preferredPrefixes = [
        "info@",
        "contact@",
        "hello@",
        "office@",
        "admin@",
        "admissions@",
    ];

    for (const prefix of preferredPrefixes) {
        const found = filtered.find((e) => e.startsWith(prefix));
        if (found) {
            return found;
        }
    }

    return filtered[0] || null;
}

export async function GET() {
    try {
        const db = getDb();

        const rows = await db.execute(`
      SELECT place_id, html
      FROM place_queue
      WHERE status = 'HTML_DONE'
      AND html IS NOT NULL
      LIMIT 100
    `);

        let processed = 0;
        let emailFound = 0;
        let emailNotFound = 0;

        for (const row of rows.rows) {
            const placeId = String(row.place_id);
            const html = String(row.html || "");

            processed++;

            const email = extractBestEmail(html);

            if (!email) {
                await db.execute({
                    sql: `
            UPDATE place_queue
            SET status = 'EMAIL_NOT_FOUND'
            WHERE place_id = ?
          `,
                    args: [placeId],
                });

                emailNotFound++;
                continue;
            }

            await db.execute({
                sql: `
          UPDATE place_queue
          SET
            email = ?,
            status = 'EMAIL_DONE'
          WHERE place_id = ?
        `,
                args: [email, placeId],
            });

            emailFound++;
        }

        return NextResponse.json({
            success: true,
            processed,
            emailFound,
            emailNotFound,
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