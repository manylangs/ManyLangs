import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import {
  searchPlaceIds,
} from "@/src/services/collectors/google_places_collector";
import {
  getTermsByCountry,
} from "@/src/services/search_terms";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

function buildQueries(
  country: string,
  city: string,
  district: string
) {
  const location =
    [district, city, country]
      .filter(Boolean)
      .join(" ");

  return getTermsByCountry(country).map(
    (term) => `${term} ${location}`
  );
}

export async function POST(req: NextRequest) {
  const {
    country,
    city,
    district,
  } = await req.json();

  const searchTerm =
    [country, city, district]
      .filter(Boolean)
      .join(" > ");

  const queries = buildQueries(
    country,
    city,
    district
  );

  const uniqueIds = new Set<string>();

  for (const query of queries) {
    try {
      const places = await searchPlaceIds(query);

      for (const place of places) {
        if (place.id) {
          uniqueIds.add(place.id);
        }
      }
    } catch (e) {
      console.error(query, e);
    }
  }

  const db = getDb();

  let added = 0;

  for (const id of uniqueIds) {
    try {
      const result = await db.execute({
        sql: `
          INSERT OR IGNORE INTO place_queue
          (
            place_id,
            country,
            city,
            district,
            search_term,
            status
          )
          VALUES
          (
            ?, ?, ?, ?, ?, 'NEW'
          )
        `,
        args: [
          id,
          country,
          city,
          district,
          searchTerm,
        ],
      });

      added += Number(
        result.rowsAffected || 0
      );
    } catch (e) {
      console.error(id, e);
    }
  }

  const totalResult = await db.execute({
    sql: `
      SELECT COUNT(*) as count
      FROM place_queue
      WHERE search_term = ?
    `,
    args: [searchTerm],
  });

  const totalInTerm = Number(
    totalResult.rows[0]?.count || 0
  );

  return NextResponse.json({
    country,
    city,
    district,
    found: uniqueIds.size,
    added,
    totalInTerm,
    queries: queries.length,
  });
}