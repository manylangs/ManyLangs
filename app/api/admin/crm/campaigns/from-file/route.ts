import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const JUNK_EMAILS = new Set([
  "name@email.com",
  "your@email.com",
  "seu@email.com",
  "seuemail@email.com",
  "algo@dominio.com",
  "votrenom@courriel.com",
  "user@domain.com",
  "example@example.com",
  "test@test.com",
  "contact@mysite.com",
  "info@mysite.com",
]);

const JUNK_DOMAINS = new Set([
  "email.com",
  "example.com",
  "domain.com",
  "test.com",
  "mysite.com",
  "courriel.com",
  "dominio.com",
]);

function isJunk(email: string): boolean {
  const lower = email.toLowerCase();
  if (JUNK_EMAILS.has(lower)) return true;

  const domain = lower.split("@")[1] || "";
  return JUNK_DOMAINS.has(domain);
}

function slugify(input: string): string {
  return (
    input
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .slice(0, 40) || "batch"
  );
}

function generateUniqueSuffix(length = 7): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }

  return result;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const rawText: string = body.text || "";
    const title: string = (body.title || "").trim();
    const subject: string = (body.subject || title || "").trim();
    const emailBody: string = body.body || "";

    if (!rawText.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "text is required (uploaded file content)",
        },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          error: "title is required (e.g. file name)",
        },
        { status: 400 }
      );
    }

    if (!subject || !emailBody.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "subject and body are required",
        },
        { status: 400 }
      );
    }

    const rawMatches = rawText.match(EMAIL_RE) || [];

    const seen = new Set<string>();
    const junkFiltered: string[] = [];
    const uniqueEmails: string[] = [];

    for (const m of rawMatches) {
      const lower = m.toLowerCase();

      if (isJunk(lower)) {
        junkFiltered.push(lower);
        continue;
      }

      if (seen.has(lower)) continue;

      seen.add(lower);
      uniqueEmails.push(lower);
    }

    if (uniqueEmails.length === 0) {
      return NextResponse.json({
        success: false,
        error: "파일에서 유효한 이메일을 찾지 못했습니다.",
        total_matches: rawMatches.length,
        junk_filtered: junkFiltered.length,
      });
    }

    const batchTag = `FILEBATCH_${slugify(title)}_${Date.now().toString(36)}`;
    const campaign_id = `${slugify(title)}_${generateUniqueSuffix()}`;

    const db = getDb();

    await db.execute(`
      CREATE TABLE IF NOT EXISTS campaign_targets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id TEXT NOT NULL,
        email TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(campaign_id, email)
      )
    `);

    let imported = 0;
    let duplicatedExisting = 0;

    for (const email of uniqueEmails) {
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
            ?, NULL, ?, ?, '', 'MANUAL', 'MANUAL_FILE_IMPORT', ?, 0, 0, 0, 'COLD', 'NEW'
          )
        `,
        args: [
          email.split("@")[0],
          email,
          batchTag,
          title,
        ],
      });

      if ((result.rowsAffected || 0) > 0) {
        imported++;
      } else {
        duplicatedExisting++;
      }
    }

    await db.execute({
      sql: `
        INSERT INTO campaigns (
          campaign_id,
          subject,
          body,
          country,
          city,
          status,
          target_count
        )
        VALUES (
          ?, ?, ?, ?, 'ALL', 'DRAFT', ?
        )
      `,
      args: [
        campaign_id,
        subject,
        emailBody,
        batchTag,
        uniqueEmails.length,
      ],
    });

    for (const email of uniqueEmails) {
      await db.execute({
        sql: `
          INSERT OR IGNORE INTO campaign_targets (
            campaign_id,
            email
          )
          VALUES (?, ?)
        `,
        args: [
          campaign_id,
          email,
        ],
      });
    }

    return NextResponse.json({
      success: true,
      campaign_id,
      title,
      batch_tag: batchTag,
      total_matches: rawMatches.length,
      unique_in_file: uniqueEmails.length,
      junk_filtered: junkFiltered.length,
      duplicated_existing: duplicatedExisting,
      imported,
      target_count: uniqueEmails.length,
      message: `캠페인 ${campaign_id} 생성 완료. 신규 ${imported}건, 기존 DB 이메일 ${duplicatedExisting}건 포함, 총 ${uniqueEmails.length}건이 캠페인 대상입니다.`,
    });
  } catch (err: any) {
    console.error("[CAMPAIGNS FROM-FILE POST]", err);

    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}