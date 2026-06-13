import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

function calcScore(lead: Record<string, any>): number {
  let score = 0;
  if (lead.email)   score += 30;
  if (lead.website) score += 20;
  if (lead.country) score += 10;
  if (lead.phone)   score += 10;
  if (lead.linkedin) score += 10;
  if (lead.lead_type === "UNIVERSITY_LANGUAGE_CENTER") score += 20;
  else if (lead.lead_type === "LANGUAGE_SCHOOL")       score += 15;
  return score;
}

function calcStatus(score: number): string {
  if (score >= 70) return "HOT";
  if (score >= 40) return "WARM";
  if (score >= 10) return "COLD";
  return "BLOCKED";
}

export async function POST() {
  try {
    const db = getDb();

    const result = await db.execute(
      `SELECT id, email, website, country, phone, linkedin, lead_type FROM schools`
    );

    let updated = 0;

    for (const lead of result.rows) {
      const score  = calcScore(lead);
      const status = calcStatus(score);

      await db.execute({
        sql: `UPDATE schools SET lead_score = ?, lead_status = ? WHERE id = ?`,
        args: [score, status, lead.id],
      });
      updated++;
    }

    return NextResponse.json({ success: true, updated });
  } catch (err: any) {
    console.error("[LEADS SCORE]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}