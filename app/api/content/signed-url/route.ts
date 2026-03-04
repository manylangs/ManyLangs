import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/firebaseAdmin";
import { getStorage } from "firebase-admin/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

/* ===============================
   🔒 Simple Memory Rate Limit
================================= */

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1분
const RATE_LIMIT_MAX = 60; // 분당 60회

const rateMap = new Map<
  string,
  { count: number; windowStart: number }
>();

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

/* =============================== */

function parseAndValidatePath(raw: string) {
  if (!raw) throw new Error("Missing path");

  let p = raw.trim();

  try {
    const d1 = decodeURIComponent(p);
    const d2 = d1.includes("%") ? decodeURIComponent(d1) : d1;
    if (d2.includes("%")) throw new Error("Excess encoding");
    p = d2;
  } catch {
    throw new Error("Decode failed");
  }

  if (p.startsWith("/") || /^[a-zA-Z]+:\/\//.test(p)) {
    throw new Error("Invalid path");
  }

  if (
    p.includes("..") ||
    p.includes("\\") ||
    p.includes("//") ||
    p.includes("/./")
  ) {
    throw new Error("Invalid path");
  }

  if (!p.startsWith("content/")) {
    throw new Error("Invalid root");
  }

  const parts = p.split("/");
  if (parts.length < 6) throw new Error("Invalid path shape");

  const [, series, lang, level, chapter] = parts;

  const allowedSeries = new Set([
    "real",
    "voca",
    "idiom",
    "conversation",
  ]);

  if (!allowedSeries.has(series)) {
    throw new Error("Invalid series");
  }

  if (!/^[a-z]{2}$/.test(lang)) {
    throw new Error("Invalid lang");
  }

  if (!/^(a1|a2|b1|b2|c1|c2)$/.test(level)) {
    throw new Error("Invalid level");
  }

  if (!/^\d{3}$/.test(chapter)) {
    throw new Error("Invalid chapter_id");
  }

  return { path: p, series, lang, level };
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

    /* 🔒 Rate Limit 체크 */
    checkRateLimit(userId);

    const url = new URL(req.url);
    const rawPath = url.searchParams.get("path") || "";
    const { path, series, lang, level } = parseAndValidatePath(rawPath);

    /* 🔒 라이선스 검증 */
    let itemId: string;

    if (series === "voca" || series === "idiom") {
      itemId = `${lang}_${series}_all`;
    } else {
      itemId = `${lang}_${series}_${level}`;
    }

    const doc = await db
      .collection("licenses")
      .doc(userId)
      .collection("items")
      .doc(itemId)
      .get();

    if (!doc.exists) {
      return bad("Forbidden", 403);
    }

    const data = doc.data();
    const exp = toMs(data?.expiresAt);

    if (!exp || exp <= Date.now()) {
      return bad("Forbidden", 403);
    }

    const bucket = getStorage().bucket();
    const file = bucket.file(path);

    // 🎯 TTL 20분
    const TTL_MINUTES = 20;
    const expiresAt = Date.now() + 1000 * 60 * TTL_MINUTES;

    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: expiresAt,
    });

    return NextResponse.json({
      url: signedUrl,
      expiresAt,
    });

  } catch (e: any) {
    if (e?.message === "Too many requests") {
      return bad("Too many requests", 429);
    }

    return bad(e?.message || "Server error", 500);
  }
}
