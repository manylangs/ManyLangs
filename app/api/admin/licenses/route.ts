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

  const snap = await db.collection("licenses").where("expiresAt", ">", now).get()

  const langCount: Record<string, number> = {}

  snap.docs.forEach((doc) => {
    const d = doc.data()
    const lang = d.lang || "unknown"
    langCount[lang] = (langCount[lang] || 0) + 1
  })

  const total = snap.size

  return NextResponse.json({ total, langCount })
}
