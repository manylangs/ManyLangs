// app/api/stripe/webhook/route.ts

import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createCoupons } from "@/lib/coupons";
import { PRICE_TO_COUPON_QTY } from "@/lib/pricing";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const sig = (await headers()).get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "missing stripe signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "invalid signature", message: err.message },
      { status: 400 }
    );
  }

  // checkout.session.completed만 처리
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata ?? {};

  const purchaseType = metadata.purchase_type; // personal | teacher | institution
  const userId = metadata.user_id;

  if (!purchaseType || !userId) {
    return NextResponse.json(
      { error: "missing required metadata", metadata },
      { status: 400 }
    );
  }

  // 결제 완료 안전 체크
  if (session.payment_status !== "paid") {
    return NextResponse.json({ skipped: "payment not completed" }, { status: 200 });
  }

  // 🔑 priceId 추출 (line_items → metadata fallback)
  const priceId =
    session.line_items?.data?.[0]?.price?.id ??
    metadata.price_id;

  // 🔢 쿠폰 수량 결정
  const qty =
    (priceId && PRICE_TO_COUPON_QTY[priceId]) ??
    Number(metadata.coupon_qty ?? 0);

  if (!qty || qty <= 0) {
    return NextResponse.json(
      { error: "unable to determine coupon quantity", priceId, metadata },
      { status: 400 }
    );
  }

  // ✅ 공통 쿠폰 생성
  const coupons = createCoupons(userId, qty);

  console.log("[STRIPE] coupons issued", {
    purchaseType,
    userId,
    qty,
    priceId,
    codes: coupons.map(c => c.code),
    sessionId: session.id,
  });

  return NextResponse.json(
    { received: true, handled: purchaseType, qty },
    { status: 200 }
  );
}
