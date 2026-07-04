import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

// 텍스트 어디에 있든 이메일 형태면 전부 추출 (mailto: 링크, RTF 컨트롤 코드 사이에 섞여 있어도 매칭됨)
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

// 흔한 플레이스홀더/샘플 이메일 (폼 예시 텍스트를 크롤링/복붙하다 섞여 들어오는 경우가 많음)
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
  if (JUNK_DOMAINS.has(domain)) return true;
  return false;
}

function slugify(input: string): string {
  return input
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(0, 40) || "batch";
}

// POST — 파일 텍스트에서 이메일 추출 + 중복/가짜 필터링 + schools 등록 + DRAFT 캠페인 자동 생성
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const rawText: string = body.text || "";
    const title: string = (body.title || "").trim();
    const subject: string = (body.subject || title || "").trim();
    const emailBody: string = body.body || "";

    if (!rawText.trim()) {
      return NextResponse.json(
        { success: false, error: "text is required (uploaded file content)" },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { success: false, error: "title is required (e.g. file name)" },
        { status: 400 }
      );
    }

    if (!subject || !emailBody.trim()) {
      return NextResponse.json(
        { success: false, error: "subject and body are required" },
        { status: 400 }
      );
    }

    // 1) 텍스트 전체에서 이메일 후보 전부 추출
    const rawMatches = rawText.match(EMAIL_RE) || [];

    // 2) 파일 내부 중복 제거 (대소문자 무시) + 가짜 이메일 필터링
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

    // 3) 이 파일(배치) 전용 태그 — country 컬럼을 배치 식별자로 재사용
    //    (country 드롭다운은 location_master에서 오므로 이 태그가 UI 목록을 오염시키지 않음)
    const batchTag = `FILEBATCH_${slugify(title)}_${Date.now().toString(36)}`;

    const db = getDb();

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
            ?, '', ?, ?, '', 'MANUAL', 'MANUAL_FILE_IMPORT', ?, 0, 0, 0, 'COLD', 'NEW'
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
        // 이미 DB에 존재하는 이메일 (schools.email UNIQUE 인덱스에 의해 걸러짐)
        duplicatedExisting++;
      }
    }

    if (imported === 0) {
      return NextResponse.json({
        success: false,
        error:
          "새로 등록된 이메일이 없습니다 (전부 파일 내 중복이었거나 이미 DB에 존재하는 이메일입니다).",
        total_matches: rawMatches.length,
        unique_in_file: uniqueEmails.length,
        junk_filtered: junkFiltered.length,
        duplicated_existing: duplicatedExisting,
      });
    }

    // 4) 방금 등록된 이메일만 정확히 타겟팅하는 DRAFT 캠페인 자동 생성
    const campaign_id = `CMP-${Date.now().toString(36).toUpperCase()}`;

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
        imported,
      ],
    });

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
      target_count: imported,
      message: `캠페인 ${campaign_id} 생성 완료. Campaigns 페이지에서 Send를 누르면 이 ${imported}건에만 발송됩니다.`,
    });
  } catch (err: any) {
    console.error("[CAMPAIGNS FROM-FILE POST]", err);

    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
