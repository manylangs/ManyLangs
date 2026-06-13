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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tmpPath = join(tmpdir(), `apollo_${Date.now()}.csv`);
    await writeFile(tmpPath, buffer);
    const { execSync } = await import("child_process");
    const result = execSync(
      `python3 src/services/import_manager.py "${tmpPath}"`,
      { cwd: process.cwd(), encoding: "utf-8" }
    );
    console.log("[IMPORT RESULT]", result);
    const db = getDb();
    const latest = db.prepare(
      `SELECT total_rows, imported_rows FROM import_batches ORDER BY created_at DESC LIMIT 1`
    ).get() as { total_rows: number; imported_rows: number } | undefined;
    db.close();
    return NextResponse.json({
      success: true,
      total: latest?.total_rows ?? 0,
      imported: latest?.imported_rows ?? 0,
    });
  } catch (err: any) {
    console.error("[IMPORTS POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
