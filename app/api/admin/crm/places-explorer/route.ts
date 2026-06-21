import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import {
  searchPlaceIds,
  getPlaceDetails,
} from "@/src/services/collectors/google_places_collector";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

const TIER1_LANGUAGES = [
  "english",
  "spanish",
  "french",
  "german",
  "japanese",
  "korean",
  "chinese",
  "portuguese",
  "italian",
  "russian",
];

const TIER2_LANGUAGES = [
  "arabic",
  "hindi",
  "thai",
  "vietnamese",
  "indonesian",
  "turkish",
  "dutch",
  "swedish",
  "polish",
  "greek",
];

const TIER1_PATTERNS = [
  "{lang} language school",
  "{lang} academy",
  "{lang} institute",
  "{lang} language center",
  "{lang} training center",
];

const TIER2_PATTERNS = [
  "{lang} language school",
  "{lang} academy",
];

function buildQueries(district: string) {
  const queries: string[] = [];

  for (const lang of TIER1_LANGUAGES) {
    for (const pattern of TIER1_PATTERNS) {
      queries.push(
        `${pattern.replace("{lang}", lang)} ${district}`
      );
    }
  }

  for (const lang of TIER2_LANGUAGES) {
    for (const pattern of TIER2_PATTERNS) {
      queries.push(
        `${pattern.replace("{lang}", lang)} ${district}`
      );
    }
  }

  return queries;
}

export async function POST(req: NextRequest) {
  const { district } = await req.json();

  const queries = buildQueries(district);

  const uniqueIds = new Set<string>();

  let googleIdsFound = 0;

  for (const query of queries) {
    try {
      const places = await searchPlaceIds(query);

      googleIdsFound += places.length;

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

  let queuedIds = 0;

  for (const id of uniqueIds) {
    try {
      const result = await db.execute({
        sql: `
          INSERT OR IGNORE INTO place_queue
          (
            place_id,
            district,
            status
          )
          VALUES (?, ?, 'NEW')
        `,
        args: [id, district],
      });

      queuedIds += Number(result.rowsAffected || 0);
    } catch (e) {
      console.error(id, e);
    }
  }

  // Place Details 샘플 테스트
  const sampleIds = [...uniqueIds].slice(0, 10);

  let detailsFetched = 0;
  let websitesFound = 0;

  for (const placeId of sampleIds) {
    try {
      const details = await getPlaceDetails(placeId);

      detailsFetched++;

      if (details.websiteUri) {
        websitesFound++;
      }
    } catch (e) {
      console.error(placeId, e);
    }
  }

  return NextResponse.json({
    success: true,
    district,

    generatedQueries: queries.length,

    googleIdsFound,

    uniqueIds: uniqueIds.size,

    queuedIds,

    detailsFetched,
    websitesFound,

    sampleQueries: queries.slice(0, 10),
  });
}
