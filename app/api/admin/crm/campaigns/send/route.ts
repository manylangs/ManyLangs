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

    if (!campaign_id) {
      return NextResponse.json(
        { error: "campaign_id required" },
        { status: 400 }
      );
    }

    const db = getDb();

    const campResult = await db.execute({
      sql: `
        SELECT *
        FROM campaigns
        WHERE campaign_id = ?
      `,
      args: [campaign_id],
    });

    if (campResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    const campaign = campResult.rows[0] as any;

    const country = campaign.country ?? "ALL";
    const city = campaign.city ?? "ALL";

    let sql = `
      SELECT
        id,
        school_name,
        email,
        country,
        city,
        campaign_status
      FROM schools
      WHERE email IS NOT NULL
      AND email <> ''
      AND campaign_status = 'NEW'
    `;

    const args: string[] = [];

    if (country !== "ALL") {
      sql += ` AND country = ?`;
      args.push(country);
    }

    if (city !== "ALL") {
      sql += ` AND city = ?`;
      args.push(city);
    }

    sql += ` LIMIT 5000`;

    const targets = await db.execute({
      sql,
      args,
    });

    const target_count = targets.rows.length;

    console.log("[CAMPAIGNS SEND] TEST MODE");
    console.log("campaign_id :", campaign_id);
    console.log("subject     :", campaign.subject);
    console.log("country     :", country);
    console.log("city        :", city);
    console.log("target_count:", target_count);

    await db.execute({
      sql: `
        UPDATE campaigns
        SET status = 'READY',
            target_count = ?
        WHERE campaign_id = ?
      `,
      args: [target_count, campaign_id],
    });

    return NextResponse.json({
      success: true,
      mode: "TEST",
      campaign_id,
      subject: campaign.subject,
      country,
      city,
      target_count,
      sample: targets.rows.slice(0, 5).map((r: any) => ({
        name: r.school_name,
        email: r.email,
        country: r.country,
        city: r.city,
        status: r.campaign_status,
      })),
      message:
        "SES 승인 후 실제 발송 가능. 현재 TEST MODE.",
    });
  } catch (err: any) {
    console.error("[CAMPAIGNS SEND]", err);

    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}