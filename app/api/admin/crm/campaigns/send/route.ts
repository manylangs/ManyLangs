import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { sendEmail } from "@/lib/aws/ses";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { campaign_id } = body;

    if (!campaign_id) {
      return NextResponse.json(
        { error: "campaign_id required" },
        { status: 400 }
      );
    }

    const db = getDb();

    const campResult = await db.execute({
      sql: `
        SELECT *
        FROM campaigns
        WHERE campaign_id = ?
      `,
      args: [campaign_id],
    });

    if (campResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    const campaign = campResult.rows[0] as any;

    // DRAFT → SENDING
    await db.execute({
      sql: `
        UPDATE campaigns
        SET status = 'SENDING'
        WHERE campaign_id = ?
      `,
      args: [campaign_id],
    });

    // value만 저장된다고 가정
    const country = campaign.country || "ALL";
    const city = campaign.city || "ALL";

    let sql = `
      SELECT
        id,
        school_name,
        email,
        country,
        city,
        campaign_status
      FROM schools
      WHERE email IS NOT NULL
      AND email <> ''
      AND campaign_status = 'NEW'
    `;
    const args: any[] = [];

    if (country !== "ALL") {
      sql += ` AND country = ?`;
      args.push(country);
    }
    if (city !== "ALL") {
      sql += ` AND city = ?`;
      args.push(city);
    }

    const targets = await db.execute({
      sql,
      args,
    });

    console.log("SQL:", sql);
    console.log("ARGS:", args);
    console.log("ROWS:", targets.rows);

    const target_count = targets.rows.length;

    console.log("[CAMPAIGNS SEND]");
    console.log("campaign_id :", campaign_id);
    console.log("subject     :", campaign.subject);
    console.log("country     :", country);
    console.log("city        :", city);
    console.log("target_count:", target_count);

    let sent_count = 0;

    // 대상이 없으면 굳이 SENDING 상태로 걸어둘 필요 없이 바로 SENT 처리
    for (const target of targets.rows as any[]) {
      try {
        await sendEmail(target.email, campaign.subject, campaign.body);

        // 성공한 대상만 SENT로 변경
        await db.execute({
          sql: `
            UPDATE schools
            SET campaign_status = 'SENT'
            WHERE id = ?
          `,
          args: [target.id],
        });

        sent_count++;
      } catch (e) {
        console.error("SEND FAILED:", target.email, e);
      }
    }

    await db.execute({
      sql: `
    UPDATE campaigns
    SET status = 'SENT',
        target_count = ?,
        sent_count = ?
    WHERE campaign_id = ?
  `,
      args: [target_count, sent_count, campaign_id],
    });

    return NextResponse.json({
      success: true,
      campaign_id,
      subject: campaign.subject,
      country,
      city,
      target_count,
      sent_count,
      sample: targets.rows.slice(0, 5).map((r: any) => ({
        name: r.school_name,
        email: r.email,
        country: r.country,
        city: r.city,
        status: r.campaign_status,
      })),
      message: `Campaign processed successfully. (${sent_count}/${target_count} sent)`,
    });
  } catch (err: any) {
    console.error("[CAMPAIGNS SEND]", err);
    return NextResponse.json(
      {
        error: err.message,
      },
      {
        status: 500,
      }
    );
  }
}