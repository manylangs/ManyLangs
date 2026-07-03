import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return new NextResponse(PIXEL, {
      headers: {
        "Content-Type": "image/gif",
      },
    });
  }

  try {
    const db = getDb();
    const now = new Date().toISOString();

    await db.execute({
      sql: `
        UPDATE email_tracking
        SET
          open_count = open_count + 1,
          opened_at = CASE
            WHEN opened_at IS NULL THEN ?
            ELSE opened_at
          END
        WHERE tracking_id = ?
      `,
      args: [now, id],
    });
  } catch (err) {
    console.error("[TRACK OPEN ERROR]", err);
  }

  return new NextResponse(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}