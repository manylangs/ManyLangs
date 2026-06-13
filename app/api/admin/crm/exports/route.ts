import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

function toCSV(rows: Record<string, any>[]): string {
  if (rows.length === 0) return "";
  const headers = ["id","school_name","website","email","country","city","phone","linkedin","source","lead_type","lead_score","lead_status","campaign_status","created_at"];
  const escape = (v: any) => {
    if (v == null) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type      = searchParams.get("type")      ?? "all";
    const startDate = searchParams.get("startDate") ?? null;
    const endDate   = searchParams.get("endDate")   ?? null;

    const db = getDb();

    let sql = `SELECT id, school_name, website, email, country, city, phone, linkedin,
                      source, lead_type, lead_score, lead_status, campaign_status, created_at
               FROM schools WHERE 1=1`;
    const args: any[] = [];

    if (type === "hot")           { sql += " AND lead_status = ?";    args.push("HOT"); }
    else if (type === "warm")     { sql += " AND lead_status = ?";    args.push("WARM"); }
    else if (type === "cold")     { sql += " AND lead_status = ?";    args.push("COLD"); }
    else if (type === "apollo")   { sql += " AND source = ?";         args.push("APOLLO"); }
    else if (type === "ready_to_send") {
      sql += " AND lead_status IN ('HOT','WARM') AND email IS NOT NULL AND email != '' AND is_contacted = 0";
    }

    if (startDate) { sql += " AND DATE(created_at) >= ?"; args.push(startDate); }
    if (endDate)   { sql += " AND DATE(created_at) <= ?"; args.push(endDate); }

    sql += " ORDER BY lead_score DESC LIMIT 5000";

    const result = await db.execute({ sql, args });
    const csv = toCSV(result.rows as any[]);

    const filename = `${type}_leads_${new Date().toISOString().slice(0,10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
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