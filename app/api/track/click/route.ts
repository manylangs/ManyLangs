// app/api/track/click/route.ts
//
// Click Tracking
// - email_tracking.click_count 증가
// - campaigns.latest_clicked = DISTINCT email 재계산
// - 원래 URL로 302 Redirect

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

export const dynamic = "force-dynamic";

const HOME_URL = "https://manylangs.studio";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

// http/https URL만 허용
function isSafeUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const id = searchParams.get("id");
  const rawUrl = searchParams.get("url");

  const destination =
    rawUrl && isSafeUrl(rawUrl)
      ? rawUrl
      : HOME_URL;

  if (id) {
    try {
      const db = getDb();

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
        // email_tracking 업데이트
        await db.execute({
          sql: `
            UPDATE email_tracking
            SET
              click_count = click_count + 1,
              clicked_at = COALESCE(clicked_at, datetime('now'))
            WHERE tracking_id = ?
          `,
          args: [id],
        });

        // DISTINCT email 기준으로 클릭 수 재계산
        const clickResult = await db.execute({
          sql: `
            SELECT COUNT(DISTINCT email) AS cnt
            FROM email_tracking
            WHERE campaign_id = ?
              AND clicked_at IS NOT NULL
          `,
          args: [row.campaign_id],
        });

        const latestClicked = Number(
          (clickResult.rows[0] as any)?.cnt ?? 0
        );

        await db.execute({
          sql: `
            UPDATE campaigns
            SET latest_clicked = ?
            WHERE campaign_id = ?
          `,
          args: [
            latestClicked,
            row.campaign_id,
          ],
        });
      }
    } catch (err) {
      console.error("[TRACK CLICK]", err);
    }
  }

  return NextResponse.redirect(destination, 302);
}