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

  const snap = await db.collectionGroup("items").get()

  const langCount: Record<string, number> = {}
  const dateCount: Record<string, number> = {}
  let total = 0

  snap.docs.forEach((doc) => {
    const d = doc.data()
    const issuedAt = toMs(d.issuedAt) || toMs(d.issuedAtMs)
    if (issuedAt < since) return

    const lang = d.lang || "unknown"
    langCount[lang] = (langCount[lang] || 0) + 1
    total++

    // 날짜 or 월 키 생성
    const dt = new Date(issuedAt)
    const key = days <= 30
      ? `${dt.getMonth() + 1}/${dt.getDate()}` // 6/3
      : `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}` // 2026-06
    dateCount[key] = (dateCount[key] || 0) + 1
  })

  // 날짜 슬롯 채우기 (빈 날짜도 0으로)
  const dateChart: { date: string; count: number }[] = []

  if (days <= 30) {
    for (let i = days - 1; i >= 0; i--) {
      const dt = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const key = `${dt.getMonth() + 1}/${dt.getDate()}`
      dateChart.push({ date: key, count: dateCount[key] || 0 })
    }
  } else {
    // 1Y: 월별, 최근 12개월
    for (let i = 11; i >= 0; i--) {
      const dt = new Date()
      dt.setMonth(dt.getMonth() - i)
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`
      dateChart.push({ date: key, count: dateCount[key] || 0 })
    }
  }

  return NextResponse.json({ total, langCount, dateChart })
}
