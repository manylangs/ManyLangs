// ===== [START] checkout route =====

// app/api/checkout/route.ts

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/firebaseAdmin";
import admin from "firebase-admin";
import { auth } from "@clerk/nextjs/server";

// ===== [START] import logger =====
import { logError } from "@/lib/logger";
// ===== [END] import logger =====

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

/* ✅ amount만 필요 */
type Body = {
  amount: "3" | "5" | "20" | "50" | "100";
};

const PRICE_ID_MAP: Record<Body["amount"], string> = {
  "3": process.env.STRIPE_PRICE_ID_3 as string,
  "5": process.env.STRIPE_PRICE_ID_5 as string,
  "20": process.env.STRIPE_PRICE_ID_20 as string,
  "50": process.env.STRIPE_PRICE_ID_50 as string,
  "100": process.env.STRIPE_PRICE_ID_100 as string,
};

function getPriceId(amount: Body["amount"]) {
  const priceId = PRICE_ID_MAP[amount];
  if (!priceId) {
    throw new Error(`Missing STRIPE_PRICE_ID env for amount=${amount}`);
  }
  return priceId;
}

function getBaseUrl(req: Request) {
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
     1️⃣ 서버 인증
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

  const { amount } = body;

  if (!amount) {
    return NextResponse.json(
      { error: "missing required fields" },
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

    // ===== [START] test error =====
    throw new Error("test error")
    // ===== [END] test error =====

    const baseUrl = getBaseUrl(req);

    const successUrl =
      `${baseUrl}/select-books?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl =
      `${baseUrl}/select-books?checkout=cancel`;

    const priceId = getPriceId(amount);

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
          couponCount:
            amount === "3" ? 2 :
            amount === "5" ? 4 :
            amount === "20" ? 20 :
            amount === "50" ? 60 :
            amount === "100" ? 150 : 0,
        },
      },

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
    });

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

    return NextResponse.json(
      { url: session.url },
      { status: 200 }
    );

  } catch (e: any) {
    const msg =
      typeof e?.message === "string"
        ? e.message
        : "checkout failed";

    // ===== [START] checkout log =====
    await logError({
      type: "checkout_error",
      error: msg,
      userId,
    });
    // ===== [END] checkout log =====

    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}

// ===== [END] checkout route =====