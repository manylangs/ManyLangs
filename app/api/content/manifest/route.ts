// app/api/content/manifest/route.ts

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, storage } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* 🔒 간단 rate limit */
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 60;

const rateMap = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(userId: string) {
  const now = Date.now();
  const record = rateMap.get(userId);

  if (!record) {
    rateMap.set(userId, { count: 1, windowStart: now });
    return;
  }

  if (now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateMap.set(userId, { count: 1, windowStart: now });
    return;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    throw new Error("Too many requests");
  }

  record.count++;
}

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function toMs(v: any): number {
  if (!v) return 0;
  if (typeof v === "number") return v;
  if (typeof v?.toMillis === "function") return v.toMillis();
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return bad("Unauthorized", 401);

    /* 🔒 rate limit */
    checkRateLimit(userId);

    const url = new URL(req.url);

    const lang = url.searchParams.get("lang");
    const series = url.searchParams.get("series");
    const level = url.searchParams.get("level");
    const chapter = url.searchParams.get("chapter");

    if (!lang || !series || !level || !chapter) {
      return bad("Missing params", 400);
    }

    /* 🔒 license 검증 */

    let itemId: string;

    if (series === "voca" || series === "idiom") {
      itemId = `${lang}_${series}_all`;
    } else {
      itemId = `${lang}_${series}_${level}`;
    }

    const lic = await db
      .collection("licenses")
      .doc(userId)
      .collection("items")
      .doc(itemId)
      .get();

    if (!lic.exists) return bad("Forbidden", 403);

    const exp = toMs(lic.data()?.expiresAt);

    if (!exp || exp <= Date.now()) {
      return bad("Forbidden", 403);
    }

    /* 🔎 현재 chapter manifest 조회 */

    const docId = `${series}_${lang}_${level}_${chapter}`;

    const snap = await db.collection("contentManifests").doc(docId).get();

    if (!snap.exists) return bad("Not found", 404);

    const data = snap.data() as any;

    if (!data?.active) return bad("Inactive content", 403);

    /* 🔎 같은 series/lang/level chapters 조회 */

    const chapterSnap = await db
      .collection("contentManifests")
      .where("series", "==", series)
      .where("lang", "==", lang)
      .where("level", "==", level)
      .where("active", "==", true)
      .get();

    const chapters = chapterSnap.docs
      .map((d) => d.data().chapter)
      .filter(Boolean)
      .sort();

    /* 🔎 assets signed URL 생성 */

    const bucket = storage.bucket();
    const assets: any[] = [];

    for (const asset of data.assets || []) {
      const file = bucket.file(asset.path);

      const [signedUrl] = await file.getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + 1000 * 60 * 20,
      });

      assets.push({
        kind: asset.kind,
        path: signedUrl,
      });
    }

    if (data.dataPath) {
      const file = bucket.file(data.dataPath);

      const [signedUrl] = await file.getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + 1000 * 60 * 20,
      });

      assets.push({
        kind: "data",
        path: signedUrl,
      });
    }

    /* 🔥 최종 응답 */

    return NextResponse.json({
      assets,
      chapters
    });

  } catch (e: any) {
    if (e?.message === "Too many requests") {
      return bad("Too many requests", 429);
    }

    return bad(e?.message || "Server error", 500);
  }
}