import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { sendEmail } from "@/lib/aws/ses";
import { v4 as uuidv4 } from "uuid";

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

    const targets = await db.execute({
      sql: `
    SELECT
      s.id,
      s.school_name,
      s.email,
      s.country,
      s.city,
      s.campaign_status
    FROM campaign_targets ct
    JOIN schools s
      ON s.email = ct.email
   WHERE ct.campaign_id = ?
AND NOT EXISTS (
    SELECT 1
    FROM email_tracking et
    WHERE et.campaign_id = ct.campaign_id
      AND et.email = s.email
)
    ORDER BY s.id ASC
    LIMIT 5000
  `,
      args: [campaign_id],
    });

    const target_count = targets.rows.length;

    console.log("[CAMPAIGNS SEND]");
    console.log("campaign_id :", campaign_id);
    console.log("subject     :", campaign.subject);
    console.log("target_count:", target_count);

    let sent_count = 0;

    for (const target of targets.rows as any[]) {
      const trackingId = uuidv4();
      const now = new Date().toISOString();

      try {
        await db.execute({
          sql: `
            INSERT INTO email_tracking (
              tracking_id,
              campaign_id,
              email,
              created_at
            )
            VALUES (?, ?, ?, ?)
          `,
          args: [
            trackingId,
            campaign_id,
            target.email,
            now,
          ],
        });

        await sendEmail(
          target.email,
          campaign.subject,
          campaign.body,
          trackingId
        );

        sent_count++;
      } catch (e) {
        console.error("SEND FAILED:", target.email, e);
      }
    }

    await db.execute({
      sql: `
    UPDATE campaigns
    SET
      status = 'SENT',
      sent_count = ?,
      send_runs = send_runs + 1,
      latest_opened = 0,
      latest_clicked = 0
    WHERE campaign_id = ?
  `,
      args: [sent_count, campaign_id],
    });

    return NextResponse.json({
      success: true,
      campaign_id,
      subject: campaign.subject,
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