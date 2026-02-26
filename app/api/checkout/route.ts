// app/api/checkout/route.ts

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/firebaseAdmin";
import admin from "firebase-admin";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

type Body = {
  lang: string;
  series: string;
  level: string;
  amount: "3" | "5" | "20" | "50" | "100";
};

const PRICE_ID_MAP: Record<Body["amount"], string | undefined> = {
  "3": process.env.STRIPE_PRICE_ID_3,
  "5": process.env.STRIPE_PRICE_ID_5,
  "20": process.env.STRIPE_PRICE_ID_20,
  "50": process.env.STRIPE_PRICE_ID_50,
  "100": process.env.STRIPE_PRICE_ID_100,
};

function getPriceId(amount: Body["amount"]) {
  const priceId = PRICE_ID_MAP[amount];
  if (!priceId) {
    throw new Error(`Missing STRIPE_PRICE_ID env for amount=${amount}`);
  }
  return priceId;
}

function getBaseUrl(req: Request) {
  // 운영 환경에서는 APP_URL 사용 권장
  if (process.env.APP_URL) return process.env.APP_URL;

  const url = new URL(req.url);
  const proto =
    req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    url.host;

  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  /* =======================
     1️⃣ 서버 인증 (절대 클라 userId 신뢰 X)
  ======================== */
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401 }
    );
  }

  /* =======================
     2️⃣ Body 파싱
  ======================== */
  let body: Body;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid body" },
      { status: 400 }
    );
  }

  let { lang, series, level, amount } = body;

  if (!lang || !series || !amount) {
    return NextResponse.json(
      { error: "missing required fields" },
      { status: 400 }
    );
  }

  // ✅ 서버 강제 보정 (클라이언트 조작 방지)
  if (series === "voca" || series === "idiom") {
    level = "all";
  }

  // ✅ 레벨 필요한 시리즈만 검증
  const requiresLevel =
    series === "grammar" ||
    series === "conversation" ||
    series === "real";

  if (requiresLevel && !level) {
    return NextResponse.json(
      { error: "level required" },
      { status: 400 }
    );
  }

  if (!["3", "5", "20", "50", "100"].includes(amount)) {
    return NextResponse.json(
      { error: "invalid amount" },
      { status: 400 }
    );
  }

  /* =======================
     3️⃣ Stripe Session 생성
  ======================== */
  try {
    const baseUrl = getBaseUrl(req);

    const successUrl =
      `${baseUrl}/select-books?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl =
      `${baseUrl}/select-books?checkout=cancel`;

    const priceId = getPriceId(amount);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: {
        userId,      // 서버 인증 값
        lang,
        series,
        level,
        amount,
      },
      line_items: [
        {
          price: priceId,   // 서버 매핑 값
          quantity: 1,
        },
      ],
    });

    /* =======================
       4️⃣ checkoutSessions 선기록
    ======================== */
    await db.collection("checkoutSessions")
      .doc(session.id)
      .set({
        sessionId: session.id,
        userId,
        lang,
        series,
        level,
        amount,
        priceId,
        status: "created",
        processed: false,
        issuedCouponCodes: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

    return NextResponse.json(
      { url: session.url },
      { status: 200 }
    );

  } catch (e: any) {
    const msg =
      typeof e?.message === "string"
        ? e.message
        : "checkout failed";

    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}