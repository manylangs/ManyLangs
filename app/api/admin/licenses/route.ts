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

function makeDateSlots(days: number): string[] {
  const slots: string[] = []
  if (days <= 30) {
    for (let i = days - 1; i >= 0; i--) {
      const dt = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      slots.push(`${dt.getMonth() + 1}/${dt.getDate()}`)
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const dt = new Date()
      dt.setMonth(dt.getMonth() - i)
      slots.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`)
    }
  }
  return slots
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
  const allDateCount: Record<string, number> = {}
  const langDateCount: Record<string, Record<string, number>> = {}
  let total = 0

  snap.docs.forEach((doc) => {
    const d = doc.data()
    const issuedAt = toMs(d.issuedAt) || toMs(d.issuedAtMs)
    if (issuedAt < since) return

    const lang = d.lang || "unknown"
    langCount[lang] = (langCount[lang] || 0) + 1
    total++

    const dt = new Date(issuedAt)
    const key = days <= 30
      ? `${dt.getMonth() + 1}/${dt.getDate()}`
      : `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`

    allDateCount[key] = (allDateCount[key] || 0) + 1
    if (!langDateCount[lang]) langDateCount[lang] = {}
    langDateCount[lang][key] = (langDateCount[lang][key] || 0) + 1
  })

  const slots = makeDateSlots(days)
  const toChart = (countMap: Record<string, number>) =>
    slots.map(date => ({ date, count: countMap[date] || 0 }))

  const dateByLang: Record<string, any[]> = { "__all__": toChart(allDateCount) }
  Object.entries(langDateCount).forEach(([lang, countMap]) => {
    dateByLang[lang] = toChart(countMap)
  })

  return NextResponse.json({ total, langCount, dateChart: toChart(allDateCount), dateByLang })
}
