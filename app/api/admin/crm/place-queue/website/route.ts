import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
    return createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
    });
}

async function fetchHtml(url: string) {
    try {
        const controller = new AbortController();

        const timer = setTimeout(() => {
            controller.abort();
        }, 10000);

        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (compatible; ManyLangsBot/1.0)",
            },
        });

        clearTimeout(timer);

        if (!res.ok) {
            return null;
        }

        const html = await res.text();

        return html.slice(0, 500000);
    } catch (e) {
        console.error("fetch failed", url, e);
        return null;
    }
}

export async function GET(req: NextRequest) {
    try {
        const db = getDb();

        const country =
            req.nextUrl.searchParams.get("country");

        const city =
            req.nextUrl.searchParams.get("city");

        const where: string[] = [
            "status = 'WEBSITE_FOUND'",
            "website IS NOT NULL",
            "website != ''",
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
        SELECT place_id, website
        FROM place_queue
        WHERE ${where.join(" AND ")}
        LIMIT 30
      `,
            args,
        });

        let processed = 0;
        let htmlSaved = 0;
        let failed = 0;

        for (const row of rows.rows) {
            const placeId = String(row.place_id);
            const website = String(row.website);

            processed++;

            const html = await fetchHtml(website);

            if (!html) {
                await db.execute({
                    sql: `
            UPDATE place_queue
            SET status = 'HTML_FAILED'
            WHERE place_id = ?
          `,
                    args: [placeId],
                });

                failed++;
                continue;
            }

            await db.execute({
                sql: `
          UPDATE place_queue
          SET
            html = ?,
            status = 'HTML_DONE'
          WHERE place_id = ?
        `,
                args: [html, placeId],
            });

            htmlSaved++;
        }

        return NextResponse.json({
            success: true,
            processed,
            htmlSaved,
            failed,
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