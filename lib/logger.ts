// ===== [START] logger.ts =====
import { db } from "@/lib/firebaseAdmin"

export async function logError(data: any) {
  try {
    // 🔥 Firestore 직접 저장 (핵심 변경)
    await db.collection("logs").add({
      ...data,
      createdAt: Date.now(),
    })

    // 🔥 Slack
    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🚨 ERROR\n${data.type}\n${data.error}`,
        }),
      })
    }

  } catch (e) {
    console.error("logError fail", e)
  }
}
// ===== [END] logger.ts =====