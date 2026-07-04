import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

const EMAIL_RE = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

type ParsedLine = {
  email: string;
  school_name: string;
};

// 한 줄 파싱: "email" 또는 "email,school_name" 둘 다 허용
function parseLine(raw: string): ParsedLine | null {
  const line = raw.trim();
  if (!line) return null;

  const parts = line.split(",").map((p) => p.trim());
  const email = parts[0];
  const school_name = parts[1] || "";

  if (!EMAIL_RE.test(email)) return null;

  return { email, school_name };
}

// POST — 수동으로 모은 이메일 목록을 schools 테이블에 등록 (campaign_status = 'NEW')
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const rawText: string = body.text || "";
    const country: string = (body.country || "").trim();
    const city: string = (body.city || "").trim();

    if (!rawText.trim()) {
      return NextResponse.json(
        { success: false, error: "text is required (emails, one per line)" },
        { status: 400 }
      );
    }

    const lines = rawText.split(/\r?\n/);

    const seen = new Set<string>();
    const valid: ParsedLine[] = [];
    const invalid: string[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      const parsed = parseLine(line);

      if (!parsed) {
        invalid.push(line.trim());
        continue;
      }

      const key = parsed.email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      valid.push(parsed);
    }

    const db = getDb();

    let imported = 0;
    let duplicated = 0;

    for (const item of valid) {
      const result = await db.execute({
        sql: `
          INSERT OR IGNORE INTO schools
          (
            school_name,
            website,
            email,
            country,
            city,
            lead_type,
            source,
            discovery_batch,
            is_merged,
            is_contacted,
            lead_score,
            lead_status,
            campaign_status
          )
          VALUES
          (
            ?, '', ?, ?, ?, 'MANUAL', 'MANUAL_IMPORT', 'manual_import', 0, 0, 0, 'COLD', 'NEW'
          )
        `,
        args: [
          item.school_name || item.email.split("@")[0],
          item.email,
          country,
          city,
        ],
      });

      if ((result.rowsAffected || 0) > 0) {
        imported++;
      } else {
        duplicated++;
      }
    }

    return NextResponse.json({
      success: true,
      total_lines: lines.filter((l) => l.trim()).length,
      imported,
      duplicated,
      invalid_count: invalid.length,
      invalid,
    });
  } catch (err: any) {
    console.error("[LEADS MANUAL POST]", err);

    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
