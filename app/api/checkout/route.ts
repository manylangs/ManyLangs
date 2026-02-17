// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/firebaseAdmin"; // ✅ 추가

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

type Body = {
  userId: string;
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
  if (!priceId) throw new Error(`Missing STRIPE_PRICE_ID env for amount=${amount}`);
  return priceId;
}

function getBaseUrl(req: Request) {
  const url = new URL(req.url);
  const proto =
    req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host =
    req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  let body: Body;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { userId, lang, series, level, amount } = body;

  if (!userId || !lang || !series || !level || !amount) {
    return NextResponse.json(
      { error: "missing required fields" },
      { status: 400 }
    );
  }

  if (!["3", "5", "20", "50", "100"].includes(amount)) {
    return NextResponse.json({ error: "invalid amount" }, { status: 400 });
  }

  try {
    const baseUrl = getBaseUrl(req);

    const successUrl = `${baseUrl}/select-books?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/select-books?checkout=cancel`;

    const priceId = getPriceId(amount);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,

      client_reference_id: userId,
      metadata: {
        userId,
        lang,
        series,
        level,
        amount,
      },

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
    });

    // ✅ checkoutSessions 선기록 추가
    await db.collection("checkoutSessions").doc(session.id).set({
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
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "checkout failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
