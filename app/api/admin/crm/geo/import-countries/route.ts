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
            "countryInfo.txt"
        );

        const raw = fs.readFileSync(filePath, "utf8");

        const lines = raw
            .split("\n")
            .filter(
                (line) =>
                    line.trim() &&
                    !line.startsWith("#")
            );

        let imported = 0;

        for (const line of lines) {
            const cols = line.split("\t");

            const countryCode = cols[0];
            const countryName = cols[4];

            if (!countryCode || !countryName) {
                continue;
            }

            await db.execute({
                sql: `
          INSERT OR IGNORE INTO countries
          (
            country_code,
            country_name
          )
          VALUES
          (?, ?)
        `,
                args: [
                    countryCode,
                    countryName,
                ],
            });

            imported++;
        }

        return NextResponse.json({
            success: true,
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