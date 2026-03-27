// ===== [START] logger.ts =====
export async function logError(data: any) {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

    // 🔥 Firestore 저장
    await fetch(`${baseUrl}/api/log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    // 🔥 Slack webhook (서버 전용 env 사용)
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