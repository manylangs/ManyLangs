import { NextRequest, NextResponse } from "next/server";
import {
    searchPlaceIds,
    getPlaceDetails
} from "@/src/services/collectors/google_places_collector";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "manylangs_crm.db");

function getDb() {
    return new Database(DB_PATH);
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

    const existingRows = db.prepare(`
        SELECT google_place_id
        FROM schools
        WHERE google_place_id IS NOT NULL
        AND google_place_id != ''
    `).all() as { google_place_id: string }[];

    const existingIds = new Set(
        existingRows.map(r => r.google_place_id)
    );

    let existingCount = 0;
    let newCount = 0;

    for (const id of uniqueIds) {
        if (existingIds.has(id)) {
            existingCount++;
        } else {
            newCount++;
        }
    }

    // 🔥 Place Details 샘플 테스트
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

    db.close();

    return NextResponse.json({
        success: true,
        district,
        generatedQueries: queries.length,

        googleIdsFound,

        uniqueIds: uniqueIds.size,

        existingIds: existingCount,
        newIds: newCount,

        detailsFetched,
        websitesFound,

        sampleQueries: queries.slice(0, 10),
    });
}