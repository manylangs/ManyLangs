// app/api/content/manifest/route.ts

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, storage } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);

    const lang = url.searchParams.get("lang");
    const series = url.searchParams.get("series");
    const level = url.searchParams.get("level");
    const chapter = url.searchParams.get("chapter");

    if (!lang || !series || !level || !chapter) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const docId = `${series}_${lang}_${level}_${chapter}`;
    const snap = await db.collection("contentManifests").doc(docId).get();

    if (!snap.exists)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = snap.data() as any;

    if (!data?.active)
      return NextResponse.json({ error: "Inactive content" }, { status: 403 });

    const bucket = storage.bucket();

    const assets: any = {};

    // 🔥 audio / image
    for (const asset of data.assets || []) {
      const file = bucket.file(asset.path);

      const [signedUrl] = await file.getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + 1000 * 60 * 20,
      });

      assets[asset.kind] = signedUrl;
    }

    // 🔥 data 파일
    if (data.dataPath) {
      const file = bucket.file(data.dataPath);

      const [signedUrl] = await file.getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + 1000 * 60 * 20,
      });

      assets.data = signedUrl;
    }

    return NextResponse.json({ assets });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? "Server error" },
      { status: 500 }
    );
  }
}