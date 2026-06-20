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
      return NextResponse.json({ error: "campaign_id required" }, { status: 400 });
    }

    const db = getDb();

    // Load campaign
    const campResult = await db.execute({
      sql: "SELECT * FROM campaigns WHERE campaign_id = ?",
      args: [campaign_id],
    });

    if (campResult.rows.length === 0) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const campaign = campResult.rows[0] as any;
    const target_type: string = campaign.target_type;
    const country: string = campaign.country ?? "ALL";

    // Build target query
    let sql = `SELECT id, school_name, email, lead_status, source, country
               FROM schools
               WHERE email IS NOT NULL AND email != ''`;
    const args: string[] = [];

    if (target_type !== "ALL") {
      if (["HOT", "WARM", "COLD"].includes(target_type)) {
        sql += ` AND lead_status = ?`;
        args.push(target_type);
      } else if (["YOUTUBE"].includes(target_type)) {
        sql += ` AND source = ?`;
        args.push(target_type);
      }
    }

    if (country !== "ALL") {
      sql += ` AND country = ?`;
      args.push(country);
    }

    // Exclude unsubscribed / blocked
    sql += ` AND (lead_status IS NULL OR lead_status != 'BLOCKED')`;
    sql += ` LIMIT 5000`;

    const targets = await db.execute({ sql, args });
    const target_count = targets.rows.length;

    // TEST MODE — no actual SES call
    console.log(`[CAMPAIGNS SEND] TEST MODE`);
    console.log(`  campaign_id : ${campaign_id}`);
    console.log(`  subject     : ${campaign.subject}`);
    console.log(`  target_type : ${target_type}`);
    console.log(`  country     : ${country}`);
    console.log(`  target_count: ${target_count}`);
    console.log(`  sample leads: ${targets.rows.slice(0, 3).map((r: any) => r.email).join(", ")}`);

    // Update campaign status to READY
    await db.execute({
      sql: "UPDATE campaigns SET status = 'READY', target_count = ? WHERE campaign_id = ?",
      args: [target_count, campaign_id],
    });

    return NextResponse.json({
      success: true,
      mode: "TEST",
      campaign_id,
      subject: campaign.subject,
      target_type,
      country,
      target_count,
      sample: targets.rows.slice(0, 5).map((r: any) => ({
        name: r.school_name,
        email: r.email,
        status: r.lead_status,
      })),
      message: "SES 승인 후 실제 발송 가능. 현재 TEST MODE.",
    });
  } catch (err: any) {
    console.error("[CAMPAIGNS SEND]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}