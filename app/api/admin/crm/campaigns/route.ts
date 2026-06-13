import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

// GET — KPI + recent campaigns
export async function GET() {
  try {
    const db = getDb();

    const [statusRows, campaignRows] = await Promise.all([
      db.execute(`
        SELECT lead_status, COUNT(*) as count
        FROM schools
        WHERE email IS NOT NULL AND email != ''
        GROUP BY lead_status
      `),
      db.execute(`
        SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 20
      `),
    ]);

    const statusMap: Record<string, number> = {};
    for (const row of statusRows.rows) {
      const r = row as any;
      statusMap[r.lead_status] = Number(r.count);
    }

    const readyToSend =
      (statusMap["HOT"] ?? 0) + (statusMap["WARM"] ?? 0);

    return NextResponse.json({
      kpi: {
        ready_to_send: readyToSend,
        hot:  statusMap["HOT"]  ?? 0,
        warm: statusMap["WARM"] ?? 0,
        cold: statusMap["COLD"] ?? 0,
      },
      campaigns: campaignRows.rows,
    });
  } catch (err: any) {
    console.error("[CAMPAIGNS GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — create campaign
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject, email_body, target_type, country } = body;

    if (!subject || !email_body || !target_type) {
      return NextResponse.json({ error: "subject, email_body, target_type required" }, { status: 400 });
    }

    const db = getDb();

    // Generate campaign ID
    const campaign_id = `CMP-${Date.now().toString(36).toUpperCase()}`;

    // Count targets
    let countSql = `SELECT COUNT(*) as count FROM schools WHERE email IS NOT NULL AND email != ''`;
    const args: string[] = [];

    if (target_type !== "ALL") {
      if (["HOT", "WARM", "COLD"].includes(target_type)) {
        countSql += ` AND lead_status = ?`;
        args.push(target_type);
      } else if (["APOLLO", "YOUTUBE"].includes(target_type)) {
        countSql += ` AND source = ?`;
        args.push(target_type);
      }
    }

    if (country && country !== "ALL") {
      countSql += ` AND country = ?`;
      args.push(country);
    }

    const countResult = await db.execute({ sql: countSql, args });
    const target_count = Number((countResult.rows[0] as any).count ?? 0);

    await db.execute({
      sql: `INSERT INTO campaigns (campaign_id, subject, body, target_type, country, status, target_count)
            VALUES (?, ?, ?, ?, ?, 'DRAFT', ?)`,
      args: [campaign_id, subject, email_body, target_type, country ?? "ALL", target_count],
    });

    return NextResponse.json({ success: true, campaign_id, target_count });
  } catch (err: any) {
    console.error("[CAMPAIGNS POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}