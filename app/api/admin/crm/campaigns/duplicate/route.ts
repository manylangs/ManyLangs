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

    const result = await db.execute({
      sql: `
        SELECT subject, body, country, city, target_count
        FROM campaigns
        WHERE campaign_id = ?
      `,
      args: [campaign_id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    const row: any = result.rows[0];

    const newId = `CMP-${Date.now().toString(36).toUpperCase()}`;

    await db.execute({
      sql: `
        INSERT INTO campaigns (
          campaign_id,
          subject,
          body,
          country,
          city,
          status,
          target_count
        )
        VALUES (?, ?, ?, ?, ?, 'DRAFT', ?)
      `,
      args: [
        newId,
        row.subject,
        row.body,
        row.country,
        row.city,
        row.target_count,
      ],
    });

    return NextResponse.json({
      success: true,
      campaign_id: newId,
    });
  } catch (err: any) {
    console.error("[CAMPAIGN DUPLICATE]", err);

    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
