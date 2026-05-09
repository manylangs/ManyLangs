import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

const DAY_MS = 1000 * 60 * 60 * 24;
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
const MAX_COUNT = 200; // 1회 최대 생성 수

// PRM-XXXX-XXXX 형태 랜덤 코드 생성
function generatePromoCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 혼동 문자 제외 (0,O,1,I)
  const segment = (len: number) =>
    Array.from({ length: len }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  return `PRM-${segment(4)}-${segment(4)}`;
}

export async function POST(req: Request) {
  // 관리자 인증
  const adminEmail = req.headers.get("x-admin-email");
  if (!adminEmail || adminEmail !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { count?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const count = Math.min(Number(body?.count) || 10, MAX_COUNT);
  if (count < 1) {
    return NextResponse.json({ error: "invalid count" }, { status: 400 });
  }

  const now = Date.now();
  const activationDeadline = now + DAY_MS * 7; // 7일 안에 활성화
  const durationDays = 14; // 활성화 후 14일

  const codes: string[] = [];
  const batch = db.batch();

  let attempts = 0;
  const maxAttempts = count * 5;

  while (codes.length < count && attempts < maxAttempts) {
    attempts++;
    const code = generatePromoCode();

    if (codes.includes(code)) continue;

    // 중복 체크
    const existing = await db.collection("coupons").doc(code).get();
    if (existing.exists) continue;

    codes.push(code);

    const ref = db.collection("coupons").doc(code);
    batch.set(ref, {
      code,
      source: "promo",
      activationDeadline,
      durationDays,
      isUsed: false,
      used: false,
      createdAt: FieldValue.serverTimestamp(),
      createdAtMs: now,
    });
  }

  if (codes.length === 0) {
    return NextResponse.json(
      { error: "Failed to generate codes" },
      { status: 500 }
    );
  }

  await batch.commit();

  return NextResponse.json(
    {
      success: true,
      count: codes.length,
      codes,
      activationDeadline,
      durationDays,
    },
    { status: 200 }
  );
}
