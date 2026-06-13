import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

function toCSV(rows: any[]): string {
  if (rows.length === 0) return "";
  const headers = ["id","school_name","website","email","country","city","source","lead_type","lead_score","lead_status","campaign_status","created_at"];
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => {
      const v = row[h] ?? "";
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(","));
  }
  return lines.join("\n");
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type      = searchParams.get("type") ?? "all";
    const startDate = searchParams.get("startDate");
    const endDate   = searchParams.get("endDate");

    const db = getDb();

    let sql = `SELECT id, school_name, website, email, country, city, source, lead_type, lead_score, lead_status, campaign_status, created_at FROM schools`;
    const conditions: string[] = [];
    const args: string[] = [];

    if (type === "hot")            { conditions.push("lead_status = ?"); args.push("HOT"); }
    else if (type === "warm")      { conditions.push("lead_status = ?"); args.push("WARM"); }
    else if (type === "cold")      { conditions.push("lead_status = ?"); args.push("COLD"); }
    else if (type === "apollo")    { conditions.push("source = ?"); args.push("APOLLO"); }
    else if (type === "ready_to_send") {
      conditions.push("lead_status IN ('HOT','WARM')");
      conditions.push("email IS NOT NULL AND email != ''");
      conditions.push("is_contacted = 0");
    }

    if (startDate) { conditions.push("created_at >= ?"); args.push(startDate); }
    if (endDate)   { conditions.push("created_at <= ?"); args.push(endDate + " 23:59:59"); }

    if (conditions.length > 0) sql += " WHERE " + conditions.join(" AND ");
    sql += " ORDER BY lead_score DESC LIMIT 5000";

    const result = await db.execute({ sql, args });
    const csv = toCSV(result.rows as any[]);

    const filename = `${type}_leads_${new Date().toISOString().slice(0,10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("[EXPORTS GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}