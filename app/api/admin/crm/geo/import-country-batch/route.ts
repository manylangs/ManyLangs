import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const offset = Number(
      req.nextUrl.searchParams.get("offset") || "0"
    );

    const limit = Number(
      req.nextUrl.searchParams.get("limit") || "20"
    );

    const countriesPath = path.join(
      process.cwd(),
      "data",
      "countryInfo.txt"
    );

    const raw = fs.readFileSync(
      countriesPath,
      "utf8"
    );

    const countries = raw
      .split("\n")
      .filter(
        (line) =>
          line.trim() &&
          !line.startsWith("#")
      )
      .map((line) => {
        const cols = line.split("\t");

        return {
          code: cols[0]?.trim(),
          name: cols[4]?.trim(),
        };
      })
      .filter((c) => c.code);

    const batch = countries.slice(
      offset,
      offset + limit
    );

    const results = [];

    for (const country of batch) {
      try {
        const url =
          `https://manylangs.studio` +
          `/api/admin/crm/geo/import-country?code=${country.code}`;

        const res = await fetch(url);

        results.push({
          code: country.code,
          name: country.name,
          status: res.status,
        });

        console.log(
          `[BATCH] ${country.code} ${res.status}`
        );

        await new Promise((resolve) =>
          setTimeout(resolve, 2000)
        );
      } catch (e: any) {
        results.push({
          code: country.code,
          name: country.name,
          error: e?.message,
        });

        console.error(
          `[BATCH] ${country.code}`,
          e?.message
        );
      }
    }

    return NextResponse.json({
      success: true,
      offset,
      limit,
      processed: batch.length,
      remaining:
        countries.length -
        (offset + batch.length),
      results,
    });
  } catch (e: any) {
    console.error(e);

    return NextResponse.json(
      {
        success: false,
        error: e?.message,
      },
      { status: 500 }
    );
  }
}