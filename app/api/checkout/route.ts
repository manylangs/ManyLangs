// app/api/checkout/route.ts

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/firebaseAdmin";
import admin from "firebase-admin";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

/* =======================
   0️⃣ ENV 안전 체크
======================= */
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  throw new Error("❌ STRIPE_SECRET_KEY is missing");
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  maxNetworkRetries: 2,
});

const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

/* =======================
   1️⃣ 타입 정의
======================= */
type Body = {
  amount: "3" | "5" | "20" | "50" | "100";
};

/* =======================
   2️⃣ Price 매핑
======================= */
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
    throw new Error(`❌ Missing STRIPE_PRICE_ID for amount=${amount}`);
  }

  if (!priceId.startsWith("price_")) {
    throw new Error(`❌ Invalid priceId: ${priceId}`);
  }

  return priceId;
}

/* =======================
   3️⃣ URL 생성
======================= */
function getBaseUrl(req: Request) {
  if (process.env.APP_URL) return process.env.APP_URL;

  const url = new URL(req.url);

  const proto =
    req.headers.get("x-forwarded-proto") ||
    url.protocol.replace(":", "");

  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    url.host;

  return `${proto}://${host}`;
}

/* =======================
   4️⃣ API 핸들러
======================= */
export async function POST(req: Request) {
  try {
    console.log("=== CHECKOUT START ===");

    /* 1️⃣ 인증 */
    const { userId } = await auth();

    if (!userId) {
      console.log("❌ Unauthorized");
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    /* 2️⃣ Body */
    let body: Body;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }

    const { amount } = body;

    if (!amount) {
      return NextResponse.json(
        { error: "missing amount" },
        { status: 400 }
      );
    }

    if (!["3", "5", "20", "50", "100"].includes(amount)) {
      return NextResponse.json(
        { error: "invalid amount" },
        { status: 400 }
      );
    }

    /* 3️⃣ Stripe 준비 */
    const baseUrl = getBaseUrl(req);
    const priceId = getPriceId(amount);

    console.log("=== STRIPE DEBUG ===");
    console.log("KEY:", STRIPE_SECRET_KEY.slice(0, 15));
    console.log("AMOUNT:", amount);
    console.log("PRICE:", priceId);
    console.log("BASE URL:", baseUrl);

    const successUrl =
      `${baseUrl}/select-books?checkout=success&session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl =
      `${baseUrl}/select-books?checkout=cancel`;

    /* 4️⃣ Stripe 호출 */
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_creation: "always",

      success_url: successUrl,
      cancel_url: cancelUrl,

      client_reference_id: userId,

      metadata: {
        userId,
        amount,
        couponCount:
          amount === "3" ? 2 :
          amount === "5" ? 4 :
          amount === "20" ? 20 :
          amount === "50" ? 60 :
          amount === "100" ? 150 : 0,
      },

      payment_intent_data: {
        metadata: {
          userId,
          amount,
          priceId,
        },
      },

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
    });

    console.log("✅ SESSION CREATED:", session.id);

    /* 5️⃣ Firestore 기록 */
    await db
      .collection("checkoutSessions")
      .doc(session.id)
      .set({
        sessionId: session.id,
        userId,
        amount,
        priceId,
        status: "created",
        processed: false,
        issuedCouponCodes: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

    console.log("=== CHECKOUT SUCCESS ===");

    return NextResponse.json({ url: session.url });

  } catch (e: any) {
    console.error("=== STRIPE ERROR FULL ===");
    console.error("message:", e?.message);
    console.error("type:", e?.type);
    console.error("code:", e?.code);
    console.error("statusCode:", e?.statusCode);
    console.error("raw:", e);
    console.error("==========================");

    return NextResponse.json(
      {
        error: e?.message,
        type: e?.type,
        code: e?.code,
        statusCode: e?.statusCode,
      },
      { status: 500 }
    );
  }
}