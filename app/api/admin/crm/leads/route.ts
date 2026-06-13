import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "manylangs_crm.db");

function getDb() {
  return new Database(DB_PATH);
}

// GET — 리드 목록 (status 필터 가능)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const db = getDb();

    let query = `
      SELECT
        id, school_name, website, email, country,
        lead_type, lead_status, lead_score, campaign_status, source
      FROM schools
    `;

    const params: string[] = [];

    if (status && status !== "ALL") {
      query += " WHERE lead_status = ?";
      params.push(status);
    }

    query += " ORDER BY lead_score DESC LIMIT 500";

    const leads = db.prepare(query).all(...params);
    db.close();

    return NextResponse.json({ leads });
  } catch (err: any) {
    console.error("[LEADS GET]", err);
    return NextResponse.json({ leads: [] });
  }
}
