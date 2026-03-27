// 🔽 START
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    await fetch(process.env.SLACK_WEBHOOK_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: `🚨 ManyLangs Error\n\n${message}`,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "slack failed" }, { status: 500 });
  }
}
// 🔼 END