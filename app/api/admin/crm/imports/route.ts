import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const DB_PATH = path.join(process.cwd(), "manylangs_crm.db");

function getDb() {
  return new Database(DB_PATH);
}

// GET — Import 이력 조회
export async function GET() {
  try {
    const db = getDb();

    const batches = db.prepare(
      `SELECT id, batch_id, source, filename, total_rows, imported_rows, created_at
       FROM import_batches
       ORDER BY created_at DESC
       LIMIT 100`
    ).all();

    db.close();

    return NextResponse.json({ batches });
  } catch (err) {
    console.error("[IMPORTS GET]", err);
    return NextResponse.json({ batches: [] });
  }
}

// POST — Apollo CSV 업로드 + Import
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    // 임시 파일로 저장
    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tmpPath = join(tmpdir(), `apollo_${Date.now()}.csv`);
    await writeFile(tmpPath, buffer);

    // Python importer 호출
    const { execSync } = await import("child_process");

    const result = execSync(
      `python3 src/services/import_manager.py "${tmpPath}"`,
      { cwd: process.cwd(), encoding: "utf-8" }
    );

    console.log("[IMPORT RESULT]", result);

    // DB에서 최신 batch 읽기
    const db = getDb();
    const latest = db.prepare(
      `SELECT total_rows, imported_rows FROM import_batches ORDER BY created_at DESC LIMIT 1`
    ).get() as { total_rows: number; imported_rows: number } | undefined;
    db.close();

    return NextResponse.json({
      success: true,
      total:    latest?.total_rows    ?? 0,
      imported: latest?.imported_rows ?? 0,
    });

  } catch (err: any) {
    console.error("[IMPORTS POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
 EOF
cat > /Users/junghasuk/Desktop/ManyLangs/web/app/api/admin/crm/leads/route.ts << 'EOF' 
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
