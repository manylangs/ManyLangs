import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

const seoulDistricts = [
  "Gangnam",
  "Gangdong",
  "Gangbuk",
  "Gangseo",
  "Gwanak",
  "Gwangjin",
  "Guro",
  "Geumcheon",
  "Nowon",
  "Dobong",
  "Dongdaemun",
  "Dongjak",
  "Mapo",
  "Seodaemun",
  "Seocho",
  "Seongdong",
  "Seongbuk",
  "Songpa",
  "Yangcheon",
  "Yeongdeungpo",
  "Yongsan",
  "Eunpyeong",
  "Jongno",
  "Jung",
  "Jungnang",
];

export async function GET() {
  const db = getDb();

  let inserted = 0;

  for (const district of seoulDistricts) {
    await db.execute({
      sql: `
        INSERT OR IGNORE INTO location_master
        (country, city, district, source)
        VALUES (?, ?, ?, ?)
      `,
      args: ["South Korea", "Seoul", district, "seed"],
    });

    inserted++;
  }

  return NextResponse.json({
    success: true,
    inserted,
    country: "South Korea",
    city: "Seoul",
  });
}
