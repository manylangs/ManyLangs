import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@libsql/client";

const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
});

export async function GET(request: Request) {
    try {
        const countryCodeFilter =
            new URL(request.url).searchParams.get("country");

        if (!countryCodeFilter) {
            return NextResponse.json({
                success: false,
                error: "country parameter required",
                example:
                    "/api/admin/crm/geo/rebuild-locations?country=KR",
            });
        }

        const countryMap = new Map<string, string>();

        const countryFile = path.join(
            process.cwd(),
            "data",
            "countryInfo.txt"
        );

        const countryLines = fs
            .readFileSync(countryFile, "utf8")
            .split("\n");

        for (const line of countryLines) {
            if (!line || line.startsWith("#")) continue;

            const cols = line.split("\t");

            const countryCode = cols[0]?.trim();
            const countryName = cols[4]?.trim();

            if (!countryCode || !countryName) continue;

            countryMap.set(countryCode, countryName);
        }

        const cityFile = path.join(
            process.cwd(),
            "data",
            "cities5000.txt"
        );

        const cityLines = fs
            .readFileSync(cityFile, "utf8")
            .split("\n");

        const ALLOWED = new Set([
            "PPLC",
            "PPLA",
            "PPLA2",
        ]);

        let inserted = 0;

        for (const line of cityLines) {
            if (!line.trim()) continue;

            const cols = line.split("\t");

            const city = cols[1]?.trim();
            const featureCode = cols[7]?.trim();
            const countryCode = cols[8]?.trim();

            if (!city) continue;
            if (!countryCode) continue;

            if (countryCode !== countryCodeFilter) {
                continue;
            }

            if (!ALLOWED.has(featureCode)) {
                continue;
            }

            const country =
                countryMap.get(countryCode) || countryCode;

            await db.execute({
                sql: `
          INSERT OR IGNORE INTO location_master
          (
            country,
            city,
            district,
            source
          )
          VALUES (?, ?, ?, ?)
        `,
                args: [
                    country,
                    city,
                    "",
                    "geonames",
                ],
            });

            inserted++;
        }

        const countryName =
            countryMap.get(countryCodeFilter) ||
            countryCodeFilter;

        return NextResponse.json({
            success: true,
            country: countryName,
            inserted,
        });
    } catch (e: any) {
        console.error(e);

        return NextResponse.json({
            success: false,
            error: e?.message,
        });
    }
}