import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH     = path.join(process.cwd(), "manylangs_crm.db");
const DEMO_URL    = "https://manylangs.studio/demo";
const FALLBACK_URL = "https://manylangs.studio";

function getDb() {
  return new Database(DB_PATH);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.redirect(FALLBACK_URL);
  }

  try {
    const db  = getDb();
    const now = new Date().toISOString();

    const row = db
      .prepare("SELECT id FROM email_tracking WHERE tracking_id = ?")
      .get(id);

    if (row) {
      db.prepare(
        `UPDATE email_tracking
         SET
           click_count = click_count + 1,
           clicked_at  = CASE WHEN clicked_at IS NULL THEN ? ELSE clicked_at END
         WHERE tracking_id = ?`
      ).run(now, id);
    }

    db.close();
  } catch (err) {
    console.error("[TRACK CLICK ERROR]", err);
  }

  return NextResponse.redirect(DEMO_URL);
}
