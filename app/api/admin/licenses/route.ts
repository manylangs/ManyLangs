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

  const now = Date.now()
  const langCount: Record<string, number> = {}
  let total = 0

  // licenses/{userId} 전체 순회
  const usersSnap = await db.collection("licenses").get()

  for (const userDoc of usersSnap.docs) {
    const itemsSnap = await userDoc.ref.collection("items").get()
    for (const item of itemsSnap.docs) {
      const d = item.data()
      const expiresAt = toMs(d.expiresAt)
      if (expiresAt <= now) continue
      const lang = d.lang || "unknown"
      langCount[lang] = (langCount[lang] || 0) + 1
      total++
    }
  }

  return NextResponse.json({ total, langCount })
}
