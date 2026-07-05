import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();

    const { campaign_id } = await req.json();

    if (!campaign_id) {
      return NextResponse.json(
        { error: "campaign_id required" },
        { status: 400 }
      );
    }

    await db.execute({
      sql: `
        UPDATE campaigns
        SET status = 'DRAFT'
        WHERE campaign_id = ?
      `,
      args: [campaign_id],
    });

    return NextResponse.json({
      success: true,
      campaign_id,
    });
  } catch (err: any) {
    console.error("[CAMPAIGN DRAFT]", err);

    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
