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

    const countries = await db.execute(`
    SELECT COUNT(DISTINCT country) as count
    FROM location_master
  `);

    const cities = await db.execute(`
    SELECT COUNT(DISTINCT city) as count
    FROM location_master
  `);

    const districts = await db.execute(`
    SELECT COUNT(DISTINCT district) as count
    FROM location_master
    WHERE district <> ''
  `);

    const byCountry = await db.execute(`
    SELECT
      country,
      COUNT(DISTINCT city) as cities,
      COUNT(DISTINCT district) as districts
    FROM location_master
    GROUP BY country
    ORDER BY country
  `);

    return NextResponse.json({
        countries: countries.rows[0],
        cities: cities.rows[0],
        districts: districts.rows[0],
        byCountry: byCountry.rows,
    });
}