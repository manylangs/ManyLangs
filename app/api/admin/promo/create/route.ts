import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { PROMO_LANGUAGES } from "@/app/admin/promo/languages";

export const runtime = "nodejs";

const DAY_MS = 1000 * 60 * 60 * 24;
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

const VALID_REGIONS = [
  // 영어권
  "US","GB","CA","AU","NZ","PH","NG","ZA","GH","KE","IN","SG","IE",
  // 스페인어권
  "MX","CO","AR","ES","PE","VE","CL","EC","GT","CU","BO","DO","HN","PY","SV","NI","CR","PA","UY",
  // 포르투갈어권
  "BR","PT","AO","MZ",
  // 프랑스어권
  "FR","BE","CH","SN","CI","CM","MG","BF",
];

const VALID_LANGUAGES = PROMO_LANGUAGES.map((l) => l.code);

export async function POST(req: Request) {
  const adminEmail = req.headers.get("x-admin-email");

  if (!adminEmail || adminEmail !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    region?: string;
    language?: string;
    durationDays?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const durationDays = Number(body?.durationDays) || 10;

  let region = "";
  let language = "";

  if (durationDays === 7) {
    language = String(body?.language ?? "").toUpperCase();

    if (!VALID_LANGUAGES.includes(language)) {
      return NextResponse.json(
        { error: "invalid language" },
        { status: 400 }
      );
    }
  } else {
    region = String(body?.region ?? "").toUpperCase();

    if (!VALID_REGIONS.includes(region)) {
      return NextResponse.json(
        {
          error: `invalid region. valid: ${VALID_REGIONS.join(", ")}`,
        },
        { status: 400 }
      );
    }
  }

  const now = Date.now();
  const d = new Date(now);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const dateStr = `${mm}${dd}`;

  const code =
    durationDays === 7
      ? `PROMO-${dateStr}-${language}`
      : `PROMO-${dateStr}-${region}`;

  const startAt = now;
  const endAt = now + DAY_MS * durationDays;

  await db.collection("promoCampaigns").doc(code).set({
    code,
    region,
    language,
    dateStr,
    startAt,
    endAt,
    durationDays,
    usedCount: 0,
    source: "promo",
    createdAt: FieldValue.serverTimestamp(),
    createdAtMs: now,
  });

  return NextResponse.json(
    {
      success: true,
      code,
      region,
      language,
      startAt,
      endAt,
      durationDays,
    },
    { status: 200 }
  );
}