import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "manylangs_crm.db");

function getDb() {
  return new Database(DB_PATH);
}

// GET — 트래킹 통계 + 목록
export async function GET() {
  try {
    const db = getDb();

    // 통계
    const stats = db.prepare(`
      SELECT
        COUNT(*)                                           AS total_sent,
        SUM(CASE WHEN open_count  > 0 THEN 1 ELSE 0 END) AS total_opened,
        SUM(CASE WHEN click_count > 0 THEN 1 ELSE 0 END) AS total_clicked,
        SUM(open_count)                                    AS total_opens,
        SUM(click_count)                                   AS total_clicks
      FROM email_tracking
    `).get() as {
      total_sent: number;
      total_opened: number;
      total_clicked: number;
      total_opens: number;
      total_clicks: number;
    };

    const total_sent    = stats.total_sent    || 0;
    const total_opened  = stats.total_opened  || 0;
    const total_clicked = stats.total_clicked || 0;

    const formattedStats = {
      total_sent,
      total_opened,
      total_clicked,
      total_opens:  stats.total_opens  || 0,
      total_clicks: stats.total_clicks || 0,
      open_rate:    total_sent ? Math.round(total_opened  / total_sent * 1000) / 10 : 0,
      click_rate:   total_sent ? Math.round(total_clicked / total_sent * 1000) / 10 : 0,
    };

    // 상세 목록
    const rows = db.prepare(`
      SELECT
        tracking_id, email, campaign_id,
        open_count, click_count,
        opened_at, clicked_at, created_at
      FROM email_tracking
      ORDER BY created_at DESC
      LIMIT 200
    `).all();

    db.close();

    return NextResponse.json({ stats: formattedStats, rows });
  } catch (err: any) {
    console.error("[TRACKING GET]", err);
    return NextResponse.json({ stats: null, rows: [] });
  }
}
