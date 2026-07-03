import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

// GET — 트래킹 통계 + 목록
export async function GET() {
  try {
    const db = getDb();

    const statsResult = await db.execute(`
      SELECT
        COUNT(*) AS total_sent,
        SUM(CASE WHEN open_count > 0 THEN 1 ELSE 0 END) AS total_opened,
        SUM(CASE WHEN click_count > 0 THEN 1 ELSE 0 END) AS total_clicked,
        SUM(open_count) AS total_opens,
        SUM(click_count) AS total_clicks
      FROM email_tracking
    `);

    const stats = (statsResult.rows[0] as any) || {};

    const total_sent = Number(stats.total_sent ?? 0);
    const total_opened = Number(stats.total_opened ?? 0);
    const total_clicked = Number(stats.total_clicked ?? 0);

    const rowsResult = await db.execute(`
      SELECT
        tracking_id,
        email,
        campaign_id,
        open_count,
        click_count,
        opened_at,
        clicked_at,
        created_at
      FROM email_tracking
      ORDER BY created_at DESC
      LIMIT 200
    `);

    return NextResponse.json({
      stats: {
        total_sent,
        total_opened,
        total_clicked,
        total_opens: Number(stats.total_opens ?? 0),
        total_clicks: Number(stats.total_clicks ?? 0),
        open_rate:
          total_sent > 0
            ? Math.round((total_opened / total_sent) * 1000) / 10
            : 0,
        click_rate:
          total_sent > 0
            ? Math.round((total_clicked / total_sent) * 1000) / 10
            : 0,
      },
      rows: rowsResult.rows,
    });
  } catch (err: any) {
    console.error("[TRACKING GET]", err);

    return NextResponse.json({
      stats: null,
      rows: [],
    });
  }
}