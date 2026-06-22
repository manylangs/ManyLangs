import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

export async function GET() {
  try {
    const db = getDb();

    const countries = await db.execute(`
      SELECT DISTINCT country
      FROM location_master
      WHERE country IS NOT NULL
      AND country != ''
      ORDER BY country
    `);

    const cities = await db.execute(`
      SELECT DISTINCT city
      FROM location_master
      WHERE city IS NOT NULL
      AND city != ''
      ORDER BY city
    `);

    const districts = await db.execute(`
      SELECT DISTINCT district
      FROM location_master
      WHERE district IS NOT NULL
      AND district != ''
      ORDER BY district
    `);

    return NextResponse.json({
      success: true,
      countries: countries.rows,
      cities: cities.rows,
      districts: districts.rows,
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