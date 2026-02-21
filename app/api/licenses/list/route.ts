// app/api/licenses/list/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toMs(v: any): number {
  if (!v) return 0;
  if (typeof v === "number") return v;
  if (typeof v?.toMillis === "function") return v.toMillis();
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function POST() {
  // ✅ Clerk 서버 인증 (타입 안전)
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const serverNowMs = Date.now();

    const snap = await db
      .collection("licenses")
      .doc(userId)
      .collection("items")
      .get();

    const licenses = snap.docs
      .map((d) => {
        const x = d.data() as any;
        const expiresAtMs = toMs(x.expiresAt);

        return {
          id: d.id,
          lang: String(x.lang || ""),
          series: String(x.series || ""),
          level: String(x.level || ""),
          expiresAt: expiresAtMs,
          source: x.source ?? null,
          code: x.code ?? null,
          issuedAt: toMs(x.issuedAt) || toMs(x.issuedAtMs) || null,
          updatedAt: toMs(x.updatedAt) || null,
        };
      })
      .filter(
        (l) =>
          !!l.lang &&
          !!l.series &&
          !!l.level &&
          l.expiresAt > serverNowMs
      )
      .sort((a, b) => a.expiresAt - b.expiresAt);

    return NextResponse.json(
      { success: true, serverNowMs, licenses },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (e: any) {
    const msg =
      typeof e?.message === "string" ? e.message : "list failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}