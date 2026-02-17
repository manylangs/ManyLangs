import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createCoupons } from "@/lib/coupons";
import { PRICE_TO_COUPON_QTY } from "@/lib/pricing";
import { db } from "@/lib/firebaseAdmin";

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

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const eventId = event.id;
  const session = event.data.object as Stripe.Checkout.Session;

  const stripeEventRef = db.collection("stripeEvents").doc(eventId);
  const existing = await stripeEventRef.get();

  if (existing.exists) {
    return NextResponse.json(
      { received: true, skipped: "event already handled" },
      { status: 200 }
    );
  }

  await stripeEventRef.set({
    eventId,
    type: event.type,
    sessionId: session.id,
    handled: false,
    resultStatus: "processing",
    receivedAt: new Date(),
  });

  const metadata = session.metadata ?? {};
  const purchaseType = metadata.purchase_type;
  const userId = metadata.user_id;

  if (!purchaseType || !userId) {
    return NextResponse.json(
      { error: "missing required metadata", metadata },
      { status: 400 }
    );
  }

  if (session.payment_status !== "paid") {
    return NextResponse.json(
      { skipped: "payment not completed" },
      { status: 200 }
    );
  }

  // priceId 추출
  let priceId: string | undefined;
  try {
    const full = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["line_items.data.price"],
    });

    const p = full.line_items?.data?.[0]?.price;
    priceId = typeof p === "object" ? (p?.id as string | undefined) : undefined;
  } catch {}

  priceId = priceId ?? metadata.price_id ?? undefined;

  const qty =
    (priceId && (PRICE_TO_COUPON_QTY as any)[priceId]) ||
    Number(metadata.coupon_qty ?? 0);

  if (!qty || qty <= 0) {
    await stripeEventRef.update({
      handled: true,
      resultStatus: "failed_qty_unknown",
      processingTimeMs: 0,
      error: "unable to determine coupon quantity",
    });

    return NextResponse.json(
      { error: "unable to determine coupon quantity", priceId },
      { status: 400 }
    );
  }

  const start = Date.now();

  // ✅ 쿠폰 생성
  const coupons = await createCoupons(userId, qty);

  // ✅ checkoutSessions 업데이트 (🔥 핵심 추가 부분)
  const checkoutRef = db.collection("checkoutSessions").doc(session.id);

  await checkoutRef.update({
    processed: true,
    status: "completed",
    issuedCouponCodes: coupons.map((c) => c.code),
    updatedAt: new Date(),
  });

  // stripeEvents 처리 완료 표시
  await stripeEventRef.update({
    handled: true,
    resultStatus: "success",
    processingTimeMs: Date.now() - start,
  });

  console.log("[STRIPE] coupons issued", {
    purchaseType,
    userId,
    qty,
    priceId,
    codes: coupons.map((c) => c.code),
    sessionId: session.id,
  });

  return NextResponse.json(
    { received: true, handled: purchaseType, qty },
    { status: 200 }
  );
}
