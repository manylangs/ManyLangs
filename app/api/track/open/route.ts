import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "manylangs_crm.db");

// 1x1 투명 GIF (픽셀)
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

function getDb() {
  return new Database(DB_PATH);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return new NextResponse(PIXEL, {
      headers: { "Content-Type": "image/gif" },
    });
  }

  try {
    const db  = getDb();
    const now = new Date().toISOString();

    db.prepare(
      `UPDATE email_tracking
       SET
         open_count = open_count + 1,
         opened_at  = CASE WHEN opened_at IS NULL THEN ? ELSE opened_at END
       WHERE tracking_id = ?`
    ).run(now, id);

    db.close();
  } catch (err) {
    console.error("[TRACK OPEN ERROR]", err);
  }

  // 항상 투명 픽셀 반환 (이메일 클라이언트가 에러 보면 안 됨)
  return new NextResponse(PIXEL, {
    headers: {
      "Content-Type":  "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma":        "no-cache",
    },
  });
}
