import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/firebaseAdmin";
import { getStorage } from "firebase-admin/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

/* 🔒 강화된 path 검증 */
function parseAndValidatePath(raw: string) {
  if (!raw) throw new Error("Missing path");

  let p = raw.trim();

  // 🔐 최대 2회 decode 허용 (double encoding 차단)
  try {
    const d1 = decodeURIComponent(p);
    const d2 = d1.includes("%") ? decodeURIComponent(d1) : d1;
    if (d2.includes("%")) throw new Error("Excess encoding");
    p = d2;
  } catch {
    throw new Error("Decode failed");
  }

  // 🔒 절대경로 / 스킴 차단
  if (p.startsWith("/") || /^[a-zA-Z]+:\/\//.test(p)) {
    throw new Error("Invalid path");
  }

  // 🔒 위험 패턴 차단
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

    const url = new URL(req.url);
    const rawPath = url.searchParams.get("path") || "";
    const { path, series, lang, level } = parseAndValidatePath(rawPath);

    /* 🔒 라이선스 검증 */
    let itemId: string;

    if (series === "voca" || series === "idiom") {
      // 단권 구조
      itemId = `${lang}_${series}_all`;
    } else {
      // 레벨 구조
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

    const [exists] = await file.exists();
    if (!exists) {
      return bad("File not found", 404);
    }

    // 🎯 TTL 10분
    const TTL_MINUTES = 10;
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
    return bad(e?.message || "Server error", 500);
  }
}