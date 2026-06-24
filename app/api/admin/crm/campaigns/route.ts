import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

// GET — KPI + Campaign History
export async function GET() {
  try {
    const db = getDb();

    const [statusRows, campaignRows] = await Promise.all([
      db.execute(`
        SELECT campaign_status, COUNT(*) as count
        FROM schools
        WHERE email IS NOT NULL
        AND email <> ''
        GROUP BY campaign_status
      `),

      db.execute(`
        SELECT *
        FROM campaigns
        ORDER BY created_at DESC
        LIMIT 50
      `),
    ]);

    const statusMap: Record<string, number> = {};

    for (const row of statusRows.rows) {
      const r = row as any;
      statusMap[r.campaign_status] = Number(r.count);
    }

    return NextResponse.json({
      kpi: {
        ready_to_send: statusMap["NEW"] ?? 0,
        sent: statusMap["SENT"] ?? 0,
      },

      campaigns: campaignRows.rows,
    });
  } catch (err: any) {
    console.error("[CAMPAIGNS GET]", err);

    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// POST — Create Campaign
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      subject,
      body: emailBody,
      country,
      city,
    } = body;

    if (!subject || !emailBody) {
      return NextResponse.json(
        {
          error: "subject and body required",
        },
        { status: 400 }
      );
    }

    const db = getDb();

    const campaign_id =
      `CMP-${Date.now()
        .toString(36)
        .toUpperCase()}`;

    let countSql = `
      SELECT COUNT(*) as count
      FROM schools
      WHERE email IS NOT NULL
      AND email <> ''
      AND campaign_status = 'NEW'
    `;

    const args: string[] = [];

    if (
      country &&
      country !== "ALL"
    ) {
      countSql += ` AND country = ?`;
      args.push(country);
    }

    if (
      city &&
      city !== "ALL"
    ) {
      countSql += ` AND city = ?`;
      args.push(city);
    }

    const countResult =
      await db.execute({
        sql: countSql,
        args,
      });

    const target_count = Number(
      (countResult.rows[0] as any)
        .count ?? 0
    );

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
        VALUES (
          ?, ?, ?, ?, ?, 'DRAFT', ?
        )
      `,
      args: [
        campaign_id,
        subject,
        emailBody,
        country ?? "ALL",
        city ?? "ALL",
        target_count,
      ],
    });

    return NextResponse.json({
      success: true,
      campaign_id,
      target_count,
    });
  } catch (err: any) {
    console.error("[CAMPAIGNS POST]", err);

    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}