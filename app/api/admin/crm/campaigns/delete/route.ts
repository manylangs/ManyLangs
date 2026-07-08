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
    const body = await req.json();
    const { campaign_id } = body;

    if (!campaign_id || typeof campaign_id !== "string") {
      return NextResponse.json(
        { success: false, error: "campaign_id required" },
        { status: 400 }
      );
    }

    const db = getDb();

    const campResult = await db.execute({
      sql: `SELECT campaign_id FROM campaigns WHERE campaign_id = ?`,
      args: [campaign_id],
    });

    if (campResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    const trackingResult = await db.execute({
      sql: `DELETE FROM email_tracking WHERE campaign_id = ?`,
      args: [campaign_id],
    });

    await db.execute({
      sql: `DELETE FROM campaigns WHERE campaign_id = ?`,
      args: [campaign_id],
    });

    return NextResponse.json({
      success: true,
      campaign_id,
      deleted_tracking_rows: trackingResult.rowsAffected ?? 0,
    });
  } catch (err: any) {
    console.error("[CAMPAIGN DELETE]", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
