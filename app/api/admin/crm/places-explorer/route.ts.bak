import { NextRequest, NextResponse } from "next/server";
import { searchPlaceIds } from "@/src/services/collectors/google_places_collector";

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

    return NextResponse.json({
        success: true,
        district,
        generatedQueries: queries.length,
        googleIdsFound,
        uniqueIds: uniqueIds.size,
        sampleQueries: queries.slice(0, 10),
    });
}