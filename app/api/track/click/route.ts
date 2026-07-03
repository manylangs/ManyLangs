// app/api/track/click/route.ts
//
// Click Tracking (1단계) — "링크를 한 번이라도 클릭했는가"만 추적
// - click_count: 클릭할 때마다 +1 (중복 허용)
// - clicked_at : 최초 1회만 저장 (COALESCE)
// - 처리 후 원래 URL로 302 Redirect
// - DB 오류가 나도 사용자 리다이렉트는 절대 실패하지 않음
//
// Open Tracking(/api/track/open)과는 완전히 독립 — 기존 로직 변경 없음

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

// http/https URL만 허용 (javascript: 등 차단)
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

  // url이 없거나 유효하지 않으면 홈으로
  const destination =
    rawUrl && isSafeUrl(rawUrl) ? rawUrl : HOME_URL;

  // id가 있을 때만 트래킹 기록 (실패해도 리다이렉트는 진행)
  if (id) {
    try {
      const db = getDb();

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
    } catch (err) {
      // 트래킹 실패는 사용자 경험에 영향 주지 않음
      console.error("[TRACK CLICK]", err);
    }
  }

  return NextResponse.redirect(destination, 302);
}