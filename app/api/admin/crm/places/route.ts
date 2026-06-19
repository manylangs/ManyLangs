import { NextResponse } from "next/server";
import { collectPlaces } from "@/src/services/collectors/google_places_collector";

export async function POST(req: Request) {
  const body = await req.json();

  const results = await collectPlaces(body.query);

  return NextResponse.json({
    success: true,
    found: results.length,
    results,
  });
}
