import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

export async function GET(req: NextRequest) {
  try {
    const code =
      req.nextUrl.searchParams
        .get("code")
        ?.toUpperCase()
        .trim() || "";

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          error: "country code required",
        },
        { status: 400 }
      );
    }

    const db = getDb();

    const countriesPath = path.join(
      process.cwd(),
      "data",
      "countryInfo.txt"
    );

    const citiesPath = path.join(
      process.cwd(),
      "data",
      "cities5000.txt"
    );

    const countriesRaw = fs.readFileSync(
      countriesPath,
      "utf8"
    );

    let countryName = "";

    for (const line of countriesRaw.split("\n")) {
      if (!line.trim() || line.startsWith("#")) {
        continue;
      }

      const cols = line.split("\t");

      if (cols[0] === code) {
        countryName = cols[4];
        break;
      }
    }

    if (!countryName) {
      return NextResponse.json(
        {
          success: false,
          error: "country not found",
        },
        { status: 404 }
      );
    }

    const citiesRaw = fs.readFileSync(
      citiesPath,
      "utf8"
    );

    const lines = citiesRaw.split("\n");

    let inserted = 0;

    for (const line of lines) {
      const cols = line.split("\t");

      const city = cols[1];
      const countryCode = cols[8];

      if (countryCode !== code) {
        continue;
      }

      if (!city) {
        continue;
      }

      await db.execute({
        sql: `
          INSERT OR IGNORE INTO location_master
          (
            country,
            city,
            district,
            source
          )
          VALUES
          (?, ?, ?, ?)
        `,
        args: [
          countryName,
          city,
          "",
          "geonames",
        ],
      });

      inserted++;
    }

    return NextResponse.json({
      success: true,
      countryCode: code,
      countryName,
      inserted,
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
