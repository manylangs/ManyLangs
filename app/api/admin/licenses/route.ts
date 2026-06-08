import { NextResponse } from "next/server"
import { db } from "@/lib/firebaseAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL

function toMs(v: any): number {
  if (!v) return 0
  if (typeof v === "number") return v
  if (typeof v?.toMillis === "function") return v.toMillis()
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export async function GET(req: Request) {
  const adminEmail = req.headers.get("x-admin-email")
  if (!adminEmail || adminEmail !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const days = Number(url.searchParams.get("days") || "30")
  const since = Date.now() - days * 24 * 60 * 60 * 1000

  // Collection Group으로 모든 users의 items 한번에 조회
  const snap = await db.collectionGroup("items").get()

  const langCount: Record<string, number> = {}
  let total = 0

  snap.docs.forEach((doc) => {
    const d = doc.data()
    const issuedAt = toMs(d.issuedAt) || toMs(d.issuedAtMs)
    if (issuedAt < since) return
    const lang = d.lang || "unknown"
    langCount[lang] = (langCount[lang] || 0) + 1
    total++
  })

  return NextResponse.json({ total, langCount })
}
