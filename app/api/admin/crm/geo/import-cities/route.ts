import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";

function getDb() {
    return createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
    });
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);

        const offset = Number(
            searchParams.get("offset") || "0"
        );

        const limit = 1000;

        const db = getDb();

        const filePath = path.join(
            process.cwd(),
            "data",
            "cities5000.txt"
        );

        const raw = fs.readFileSync(
            filePath,
            "utf8"
        );

        const lines = raw
            .split("\n")
            .filter(Boolean);

        const batch = lines.slice(
            offset,
            offset + limit
        );

        let imported = 0;

        for (const line of batch) {
            const cols = line.split("\t");

            const cityName = cols[1];
            const countryCode = cols[8];
            const admin1 = cols[10] || "";

            if (!cityName || !countryCode) {
                continue;
            }

            await db.execute({
                sql: `
          INSERT OR IGNORE INTO cities
          (
            country_code,
            city_name,
            admin1
          )
          VALUES (?, ?, ?)
        `,
                args: [
                    countryCode,
                    cityName,
                    admin1,
                ],
            });

            imported++;
        }

        return NextResponse.json({
            success: true,
            offset,
            processed: batch.length,
            imported,
            nextOffset: offset + limit,
            totalLines: lines.length,
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