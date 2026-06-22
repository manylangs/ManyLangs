import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
    return createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
    });
}

export async function GET() {
    const db = getDb();

    await db.execute(`
    CREATE TABLE IF NOT EXISTS countries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      country_code TEXT UNIQUE,
      country_name TEXT
    )
  `);

    await db.execute(`
    CREATE TABLE IF NOT EXISTS cities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      country_code TEXT,
      city_name TEXT,
      admin1 TEXT,
      UNIQUE(country_code, city_name)
    )
  `);

    await db.execute(`
    CREATE TABLE IF NOT EXISTS districts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      country_code TEXT,
      city_name TEXT,
      district_name TEXT,
      source TEXT DEFAULT 'geonames',
      UNIQUE(country_code, city_name, district_name)
    )
  `);

    return NextResponse.json({
        success: true,
    });
}