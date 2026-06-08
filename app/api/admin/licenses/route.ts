import { NextResponse } from "next/server"
import { db } from "@/lib/firebaseAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL

export async function GET(req: Request) {
  const adminEmail = req.headers.get("x-admin-email")
  if (!adminEmail || adminEmail !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const days = Number(url.searchParams.get("days") || "30")
  const since = Date.now() - days * 24 * 60 * 60 * 1000

  const langCount: Record<string, number> = {}
  let total = 0
  const debugSample: any[] = []

  const usersSnap = await db.collection("licenses").get()

  for (const userDoc of usersSnap.docs) {
    const itemsSnap = await userDoc.ref.collection("items").get()
    for (const item of itemsSnap.docs) {
      const d = item.data()
      
      // 샘플 3개만 디버그용으로 수집
      if (debugSample.length < 3) {
        debugSample.push({
          id: item.id,
          lang: d.lang,
          issuedAt: d.issuedAt,
          issuedAtMs: d.issuedAtMs,
          issuedAtType: typeof d.issuedAt,
          keys: Object.keys(d),
        })
      }

      // 필터 없이 전부 집계
      const lang = d.lang || "unknown"
      langCount[lang] = (langCount[lang] || 0) + 1
      total++
    }
  }

  return NextResponse.json({ total, langCount, since, days, debugSample })
}
