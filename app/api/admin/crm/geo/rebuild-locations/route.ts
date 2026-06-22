import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDb } from "@/lib/db";

export async function GET() {
    try {
        const db = await getDb();

        // 1. 기존 데이터 삭제
        await db.execute(`
      DELETE FROM location_master
    `);

        // 2. 국가코드 → 국가명 맵 생성
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

        // 3. 도시 파일 읽기
        const cityFile = path.join(
            process.cwd(),
            "data",
            "cities5000.txt"
        );

        const cityLines = fs
            .readFileSync(cityFile, "utf8")
            .split("\n");

        let inserted = 0;

        const ALLOWED = new Set([
            "PPLC",
            "PPLA",
            "PPLA2",
        ]);

        for (const line of cityLines) {
            if (!line.trim()) continue;

            const cols = line.split("\t");

            const city = cols[1]?.trim();
            const featureCode = cols[7]?.trim();
            const countryCode = cols[8]?.trim();

            if (!city) continue;
            if (!countryCode) continue;

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

        const countries = new Set<string>();

        for (const line of cityLines) {
            if (!line.trim()) continue;

            const cols = line.split("\t");

            const featureCode = cols[7]?.trim();
            const countryCode = cols[8]?.trim();

            if (!ALLOWED.has(featureCode)) continue;

            const country =
                countryMap.get(countryCode) || countryCode;

            countries.add(country);
        }

        return NextResponse.json({
            success: true,
            countries: countries.size,
            cities: inserted,
        });
    } catch (e: any) {
        console.error(e);

        return NextResponse.json({
            success: false,
            error: e?.message,
        });
    }
}