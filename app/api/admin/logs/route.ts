// ===== [START] admin logs api =====
import { db } from "@/lib/firebaseAdmin"
import { headers } from "next/headers"

export async function GET() {
  // ===== [START] admin guard =====
  const headersList = await headers()
  const adminEmail = headersList.get("x-admin-email") ?? ""

  if (adminEmail !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return new Response("unauthorized", { status: 401 })
  }
  // ===== [END] admin guard =====

  const snap = await db
    .collection("logs")
    .orderBy("createdAt", "desc")
    .limit(50)
    .get()

  const logs = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }))

  return new Response(JSON.stringify({ logs }), {
    headers: {
      "Content-Type": "application/json",
    },
  })
}
// ===== [END] admin logs api =====