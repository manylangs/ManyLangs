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

export async function GET() {
    try {
        const db = getDb();

        const filePath = path.join(
            process.cwd(),
            "data",
            "cities5000.txt"
        );

        const raw = fs.readFileSync(filePath, "utf8");

        const lines = raw
            .split("\n")
            .filter(Boolean);

        let imported = 0;

        for (const line of lines) {
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
            imported,
        });
    } catch (err: any) {
        return NextResponse.json(
            {
                success: false,
                error: err.message,
            },
            { status: 500 }
        );
    }
}