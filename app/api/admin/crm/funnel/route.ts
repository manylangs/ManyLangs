import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

export async function GET() {
  try {
    const db = getDb();

    const [totals, byStatus, bySource, recentBatches] = await Promise.all([
      db.execute(`SELECT COUNT(*) as total FROM schools`),
      db.execute(`SELECT lead_status, COUNT(*) as count FROM schools GROUP BY lead_status`),
      db.execute(`SELECT source, COUNT(*) as count FROM schools GROUP BY source`),
      db.execute(`SELECT batch_id, filename, total_rows, imported_rows, created_at FROM import_batches ORDER BY created_at DESC LIMIT 10`),
    ]);

    const total = (totals.rows[0] as any).total as number;
    const statusMap: Record<string, number> = {};
    for (const row of byStatus.rows) {
      const r = row as any;
      statusMap[r.lead_status] = r.count;
    }

    return NextResponse.json({
      total,
      hot:     statusMap["HOT"]     ?? 0,
      warm:    statusMap["WARM"]    ?? 0,
      cold:    statusMap["COLD"]    ?? 0,
      blocked: statusMap["BLOCKED"] ?? 0,
      bySource: bySource.rows,
      recentBatches: recentBatches.rows,
    });
  } catch (err: any) {
    console.error("[FUNNEL GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}