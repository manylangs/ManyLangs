// app/api/licenses/list/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { userId?: string };

function toMs(v: any): number {
  if (!v) return 0;
  if (typeof v === "number") return v;
  if (typeof v?.toMillis === "function") return v.toMillis();
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function listLicenses(userId: string) {
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
        expiresAt: expiresAtMs, // 프론트는 이 숫자만 믿는다
        source: x.source ?? null,
        code: x.code ?? null,
        issuedAt: toMs(x.issuedAt) || toMs(x.issuedAtMs) || null,
        updatedAt: toMs(x.updatedAt) || null,
      };
    })
    // ✅ 만료 안 된 것만
    .filter((l) => !!l.lang && !!l.series && !!l.level && l.expiresAt > serverNowMs)
    // 최신 만료순(남은시간 짧은게 위로) 또는 필요하면 반대로 바꿔도 됨
    .sort((a, b) => a.expiresAt - b.expiresAt);

  return { serverNowMs, licenses };
}

// ✅ 변경 1) GET 추가 (기존 POST 유지, GET 405 방지)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = String(url.searchParams.get("userId") || "").trim();

  if (!userId) {
    return NextResponse.json({ error: "missing userId" }, { status: 400 });
  }

  try {
    const { serverNowMs, licenses } = await listLicenses(userId);

    // ✅ 변경 2) ok/items 별칭 추가 (기존 success/licenses 유지)
    return NextResponse.json(
      {
        success: true,
        serverNowMs,
        licenses,

        // ViewerGuard 호환용 별칭
        ok: true,
        items: licenses,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "list failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const userId = String(body?.userId || "").trim();
  if (!userId) {
    return NextResponse.json({ error: "missing userId" }, { status: 400 });
  }

  try {
    const { serverNowMs, licenses } = await listLicenses(userId);

    // ✅ 변경 2) ok/items 별칭 추가 (기존 success/licenses 유지)
    return NextResponse.json(
      {
        success: true,
        serverNowMs,
        licenses,

        // ViewerGuard 호환용 별칭
        ok: true,
        items: licenses,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "list failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
