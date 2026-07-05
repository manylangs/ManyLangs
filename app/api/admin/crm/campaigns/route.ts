import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

// GET — KPI + Campaign History (filterable + paginated)
export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);

    const country = searchParams.get("country") || "ALL";
    const city = searchParams.get("city") || "ALL";
    const q = searchParams.get("q")?.trim() || "";
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const pageSize = Math.max(
      1,
      Number(searchParams.get("pageSize") || "5")
    );
    const offset = (page - 1) * pageSize;

    // Campaign History 필터 (country / city / 검색어)
    const filters: string[] = [];
    const filterArgs: (string | number)[] = [];

    if (country !== "ALL") {
      filters.push("c.country = ?");
      filterArgs.push(country);
    }

    if (city !== "ALL") {
      filters.push("c.city = ?");
      filterArgs.push(city);
    }

    if (q) {
      // subject 또는 campaign_id 에서 키워드 검색
      filters.push("(c.subject LIKE ? OR c.campaign_id LIKE ?)");
      filterArgs.push(`%${q}%`, `%${q}%`);
    }

    const whereClause =
      filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    const [statusRows, countRows, campaignRows] = await Promise.all([
      db.execute(`
        SELECT campaign_status, COUNT(*) as count
        FROM schools
        WHERE email IS NOT NULL
        AND email <> ''
        GROUP BY campaign_status
      `),

      // 필터 적용된 총 개수 (페이지네이션용)
      db.execute({
        sql: `
          SELECT COUNT(*) as total
          FROM campaigns c
          ${whereClause}
        `,
        args: filterArgs,
      }),

      db.execute({
        sql: `
          SELECT
            c.*,

            COALESCE(COUNT(t.tracking_id), 0) AS sent_count,

            COALESCE(SUM(
              CASE WHEN t.open_count > 0 THEN 1 ELSE 0 END
            ), 0) AS opened_count,

            COALESCE(SUM(t.open_count), 0) AS total_opens,

            COALESCE(SUM(
              CASE WHEN t.click_count > 0 THEN 1 ELSE 0 END
            ), 0) AS clicked_count,

            COALESCE(SUM(t.click_count), 0) AS total_clicks

          FROM campaigns c

          LEFT JOIN email_tracking t
          ON c.campaign_id = t.campaign_id

          ${whereClause}

          GROUP BY c.campaign_id

          ORDER BY c.created_at DESC

          LIMIT ? OFFSET ?
        `,
        args: [...filterArgs, pageSize, offset],
      }),
    ]);

    const statusMap: Record<string, number> = {};

    for (const row of statusRows.rows) {
      const r = row as any;
      statusMap[r.campaign_status] = Number(r.count);
    }

    const total = Number((countRows.rows[0] as any)?.total ?? 0);

    const campaigns = campaignRows.rows.map((row: any) => {
      const sent = Number(row.sent_count ?? 0);
      const opened = Number(row.opened_count ?? 0);
      const clicked = Number(row.clicked_count ?? 0);

      return {
        ...row,
        open_rate:
          sent > 0
            ? Math.round((opened / sent) * 1000) / 10
            : 0,
        click_rate:
          sent > 0
            ? Math.round((clicked / sent) * 1000) / 10
            : 0,
      };
    });

    console.log("===== CAMPAIGN KPI =====");
    console.log("NEW :", statusMap["NEW"] ?? 0);
    console.log("SENT:", statusMap["SENT"] ?? 0);
    console.log("========================");

    return NextResponse.json({
      kpi: {
        ready_to_send: statusMap["NEW"] ?? 0,
        sent: statusMap["SENT"] ?? 0,
      },

      campaigns,

      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (err: any) {
    console.error("[CAMPAIGNS GET]", err);

    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// POST — Create Campaign
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      subject,
      body: emailBody,
      country,
      city,
    } = body;

    const savedCountry =
      !country ||
        country === "All Countries" ||
        country === "ALL"
        ? "ALL"
        : country;

    const savedCity =
      !city ||
        city === "All Cities" ||
        city === "ALL"
        ? "ALL"
        : city;

    if (!subject || !emailBody) {
      return NextResponse.json(
        {
          error: "subject and body required",
        },
        { status: 400 }
      );
    }

    const db = getDb();

    const campaign_id =
      `CMP-${Date.now()
        .toString(36)
        .toUpperCase()}`;

    let countSql = `
      SELECT COUNT(*) as count
      FROM schools
      WHERE email IS NOT NULL
      AND email <> ''
      AND campaign_status = 'NEW'
    `;

    const args: string[] = [];

    if (savedCountry !== "ALL") {
      countSql += ` AND country = ?`;
      args.push(savedCountry);
    }

    if (savedCity !== "ALL") {
      countSql += ` AND city = ?`;
      args.push(savedCity);
    }

    const countResult =
      await db.execute({
        sql: countSql,
        args,
      });

    const target_count = Number(
      (countResult.rows[0] as any).count ?? 0
    );

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
          ?, ?, ?, ?, ?, 'DRAFT', ?
        )
      `,
      args: [
        campaign_id,
        subject,
        emailBody,
        savedCountry,
        savedCity,
        target_count,
      ],
    });

    return NextResponse.json({
      success: true,
      campaign_id,
      target_count,
    });
  } catch (err: any) {
    console.error("[CAMPAIGNS POST]", err);

    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}