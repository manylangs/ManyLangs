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

  try {
    const usersSnap = await db.collection("licenses").get()
    console.log("licenses userCount:", usersSnap.size)
    
    // 첫 번째 유저의 items 확인
    if (usersSnap.size > 0) {
      const firstUser = usersSnap.docs[0]
      console.log("first userId:", firstUser.id)
      const itemsSnap = await firstUser.ref.collection("items").get()
      console.log("first user items count:", itemsSnap.size)
      if (itemsSnap.size > 0) {
        console.log("first item data:", JSON.stringify(itemsSnap.docs[0].data()))
      }
    }

    const langCount: Record<string, number> = {}
    let total = 0

    for (const userDoc of usersSnap.docs) {
      const itemsSnap = await userDoc.ref.collection("items").get()
      for (const item of itemsSnap.docs) {
        const d = item.data()
        const lang = d.lang || "unknown"
        langCount[lang] = (langCount[lang] || 0) + 1
        total++
      }
    }

    return NextResponse.json({ 
      total, 
      langCount, 
      userCount: usersSnap.size,
      projectId: process.env.FIREBASE_PROJECT_ID 
    })
  } catch (e: any) {
    console.error("licenses api error:", e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
