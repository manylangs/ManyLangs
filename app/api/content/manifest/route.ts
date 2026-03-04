// app/api/content/manifest/route.ts

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, storage } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function reqParam(v: string | null, name: string): string {
    if (!v) throw new Error(`Missing ${name}`);
    return v;
}

export async function GET(req: Request) {
    try {
        const { userId } = await auth(); // ← 여기 await 추가

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(req.url);

        const lang = reqParam(url.searchParams.get("lang"), "lang");
        const series = reqParam(url.searchParams.get("series"), "series");
        const level = reqParam(url.searchParams.get("level"), "level");
        const chapter = reqParam(url.searchParams.get("chapter"), "chapter");

        const docId = `${series}_${lang}_${level}_${chapter}`;

        const snap = await db.collection("contentManifests").doc(docId).get();

        if (!snap.exists) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const data = snap.data() as any;

        if (!data?.active) {
            return NextResponse.json({ error: "Inactive content" }, { status: 403 });
        }

        const bucket = storage.bucket();
        const file = bucket.file(data.storagePath);

        const download = await file.download();
        const buffer = download[0];

        const manifest = JSON.parse(buffer.toString("utf-8"));

        return NextResponse.json(manifest);
    } catch (e: any) {
        return NextResponse.json(
            { error: e.message ?? "Server error" },
            { status: 500 }
        );
    }
}