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

    // open 기록 업데이트
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

    // campaign_id 조회
    const result = await db.execute({
      sql: `
        SELECT campaign_id
        FROM email_tracking
        WHERE tracking_id = ?
        LIMIT 1
      `,
      args: [id],
    });

    const row = result.rows[0] as any;

    if (row) {
      // DISTINCT email 기준으로 Open 수 재계산
      const openResult = await db.execute({
        sql: `
          SELECT COUNT(DISTINCT email) AS cnt
          FROM email_tracking
          WHERE campaign_id = ?
            AND opened_at IS NOT NULL
        `,
        args: [row.campaign_id],
      });

      const latestOpened = Number(
        (openResult.rows[0] as any)?.cnt ?? 0
      );

      await db.execute({
        sql: `
          UPDATE campaigns
          SET latest_opened = ?
          WHERE campaign_id = ?
        `,
        args: [
          latestOpened,
          row.campaign_id,
        ],
      });
    }
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