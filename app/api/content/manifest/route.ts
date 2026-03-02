import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const series = searchParams.get("series");
  const lang = searchParams.get("lang");
  const level = searchParams.get("level");
  const chapter = searchParams.get("chapter");

  if (!series || !lang || !level || !chapter) {
    return NextResponse.json(
      { error: "Missing parameters" },
      { status: 400 }
    );
  }

  const docId = `${series}_${lang}_${level}_${chapter}`;

  const snap = await db.collection("contentManifests").doc(docId).get();

  if (!snap.exists) {
    return NextResponse.json(
      { error: "Manifest not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(snap.data());
}
