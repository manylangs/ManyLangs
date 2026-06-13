import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "manylangs_crm.db");

function getDb() {
  const db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS import_batches (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id      TEXT UNIQUE,
      source        TEXT,
      filename      TEXT,
      total_rows    INTEGER DEFAULT 0,
      imported_rows INTEGER DEFAULT 0,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS schools (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      school_name      TEXT,
      website          TEXT UNIQUE,
      email            TEXT,
      phone            TEXT,
      country          TEXT,
      city             TEXT,
      linkedin         TEXT,
      lead_type        TEXT,
      source           TEXT,
      discovery_batch  TEXT,
      is_merged        INTEGER DEFAULT 0,
      is_contacted     INTEGER DEFAULT 0,
      lead_score       INTEGER DEFAULT 0,
      lead_status      TEXT DEFAULT 'COLD',
      campaign_status  TEXT DEFAULT 'NEW',
      created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  return db;
}

function normalizeEmail(raw: string | undefined): string | null {
  if (!raw) return null;
  const email = raw.trim().toLowerCase();
  return /^[\w.+\-]+@[\w\-]+\.[\w\-.]+$/.test(email) ? email : null;
}

function normalizeWebsite(raw: string | undefined): string | null {
  if (!raw) return null;
  let url = raw.trim().toLowerCase();
  if (!url.startsWith("http")) url = "https://" + url;
  return url.replace(/\/$/, "");
}

const UNIVERSITY_KEYWORDS = ["university", "college", "institute", "academia"];
const LANGUAGE_KEYWORDS = ["language", "english", "esl", "ielts", "toefl", "lingua"];

function classifyLeadType(name: string, website: string): string {
  const text = `${name} ${website}`.toLowerCase();
  if (UNIVERSITY_KEYWORDS.some((k) => text.includes(k))) return "UNIVERSITY_LANGUAGE_CENTER";
  if (LANGUAGE_KEYWORDS.some((k) => text.includes(k))) return "LANGUAGE_SCHOOL";
  return "LANGUAGE_SCHOOL";
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let cur = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === "," && !inQuote) { values.push(cur); cur = ""; continue; }
      cur += ch;
    }
    values.push(cur);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (values[i] ?? "").trim(); });
    return row;
  });
}

function mapRow(row: Record<string, string>) {
  const get = (...keys: string[]) => {
    for (const k of keys) { const v = (row[k] ?? "").trim(); if (v) return v; }
    return undefined;
  };
  const name = get("Company", "Organization Name", "School Name", "Name");
  const website = normalizeWebsite(get("Website", "Company Website", "Domain"));
  const email = normalizeEmail(get("Email", "Work Email", "Person Email"));
  const phone = get("Phone", "Work Phone", "Direct Phone") ?? null;
  const country = get("Country", "Company Country") ?? null;
  const city = get("City", "Company City") ?? null;
  const linkedin = get("LinkedIn URL", "Person Linkedin Url", "Company Linkedin Url") ?? null;
  return { school_name: name ?? null, website, email, phone, country, city, linkedin, lead_type: classifyLeadType(name ?? "", website ?? ""), source: "APOLLO" };
}

function generateBatchId(): string {
  return `APOLLO_${new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 15)}`;
}

export async function GET() {
  try {
    const db = getDb();
    const batches = db.prepare(`SELECT id, batch_id, source, filename, total_rows, imported_rows, created_at FROM import_batches ORDER BY created_at DESC LIMIT 100`).all();
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
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const text = await file.text();
    const rows = parseCSV(text);
    const batchId = generateBatchId();
    const db = getDb();

    const insertLead = db.prepare(`
      INSERT OR IGNORE INTO schools (school_name, website, email, phone, country, city, linkedin, lead_type, source, discovery_batch, is_merged, is_contacted, lead_score, lead_status, campaign_status)
      VALUES (@school_name, @website, @email, @phone, @country, @city, @linkedin, @lead_type, @source, @discovery_batch, 0, 0, 0, 'COLD', 'NEW')
    `);
    const insertBatch = db.prepare(`INSERT OR IGNORE INTO import_batches (batch_id, source, filename, total_rows, imported_rows) VALUES (@batch_id, @source, @filename, @total_rows, @imported_rows)`);

    let imported = 0, skipped = 0, duplicates = 0;
    const total = rows.length;

    const run = db.transaction(() => {
      for (const row of rows) {
        const lead = mapRow(row);
        if (!lead.website) { skipped++; continue; }
        const r = insertLead.run({ ...lead, discovery_batch: batchId });
        if (r.changes > 0) imported++; else duplicates++;
      }
      insertBatch.run({ batch_id: batchId, source: "APOLLO", filename: file.name, total_rows: total, imported_rows: imported });
    });
    run();
    db.close();

    return NextResponse.json({ success: true, batch_id: batchId, total, imported, duplicates, skipped });
  } catch (err: any) {
    console.error("[IMPORTS POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
