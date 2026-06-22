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

    const countries = await db.execute(
        "SELECT COUNT(*) as count FROM countries"
    );

    const cities = await db.execute(
        "SELECT COUNT(*) as count FROM cities"
    );

    const districts = await db.execute(
        "SELECT COUNT(*) as count FROM districts"
    );

    return NextResponse.json({
        countries: countries.rows[0],
        cities: cities.rows[0],
        districts: districts.rows[0],
    });
}