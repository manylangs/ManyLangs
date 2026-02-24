import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/firebaseAdmin";
import { getStorage } from "firebase-admin/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function parseAndValidatePath(raw: string) {
  if (!raw) throw new Error("Missing path");

  const p = decodeURIComponent(raw).trim();

  // 🔒 위험 패턴 차단
  if (p.includes("..") || p.includes("\\") || p.includes("//")) {
    throw new Error("Invalid path");
  }

  if (!p.startsWith("content/")) {
    throw new Error("Invalid root");
  }

  // content/{series}/{lang}/{level}/{chapter}/...
  const parts = p.split("/");
  if (parts.length < 6) throw new Error("Invalid path shape");

  const [, series, lang, level, chapter] = parts;

  // 🔒 시리즈 화이트리스트
  const allowedSeries = new Set([
    "real",
    "voca",
    "idiom",
    "conversation",
  ]);

  if (!allowedSeries.has(series)) {
    throw new Error("Invalid series");
  }

  // 🔒 형식 검증
  if (!/^[a-z]{2}$/.test(lang)) {
    throw new Error("Invalid lang");
  }

  if (!/^(a1|a2|b1|b2|c1|c2)$/.test(level)) {
    throw new Error("Invalid level");
  }

  if (!/^\d{3}$/.test(chapter)) {
    throw new Error("Invalid chapter_id");
  }

  return { path: p, series, lang, level, chapter };
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

    // 🔒 라이선스 검증
    const itemId = `${lang}_${series}_${level}`;

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

    // ✅ Signed URL 발급 (KR Real 캐시 전략 반영)
    const bucket = getStorage().bucket();
    const file = bucket.file(path);

    // 🎯 KR Real 전략: 45분 TTL
    const TTL_MINUTES = 45;

    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 1000 * 60 * TTL_MINUTES,
    });

    return NextResponse.json({
      url: signedUrl,
      expiresAt: Date.now() + 1000 * 60 * TTL_MINUTES,
    });

  } catch (e: any) {
    return bad(e?.message || "Server error", 500);
  }
}