import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { sendEmail } from "@/lib/aws/ses";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const trackingId = uuidv4();

    const db = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });

    await db.execute({
      sql: `
        INSERT INTO email_tracking (
          tracking_id,
          campaign_id,
          email,
          created_at
        )
        VALUES (?, ?, ?, ?)
      `,
      args: [
        trackingId,
        "TEST",
        "rayforchatgpt1985@gmail.com",
        new Date().toISOString(),
      ],
    });

    await sendEmail(
      "rayforchatgpt1985@gmail.com",
      "ManyLangs SES Test",
      "SES connection test successful.",
      trackingId
    );

    return NextResponse.json({
      success: true,
      message: "Email sent successfully",
      trackingId,
    });
  } catch (err: any) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}