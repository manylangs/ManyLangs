import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createCouponsTx } from "@/lib/coupons";
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
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const eventId = event.id;

  const metadata = session.metadata ?? {};
  const userId = metadata.userId;

  if (!userId) {
    return NextResponse.json({ error: "missing userId" }, { status: 400 });
  }

  if (session.payment_status !== "paid") {
    return NextResponse.json({ skipped: "not paid" }, { status: 200 });
  }

  // 🔎 priceId 추출
  let priceId: string | undefined;
  try {
    const full = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["line_items.data.price"],
    });
    const p = full.line_items?.data?.[0]?.price;
    priceId = typeof p === "object" ? p.id : undefined;
  } catch { }

  if (!priceId) {
    return NextResponse.json({ error: "missing priceId" }, { status: 400 });
  }

  const qty = (PRICE_TO_COUPON_QTY as any)[priceId];
  if (!qty || qty <= 0) {
    return NextResponse.json({ error: "invalid qty" }, { status: 400 });
  }

  const stripeEventRef = db.collection("stripeEvents").doc(eventId);
  const checkoutRef = db.collection("checkoutSessions").doc(session.id);

  try {
    await db.runTransaction(async (tx) => {
      const existing = await tx.get(stripeEventRef);

      if (existing.exists) {
        throw new Error("EVENT_ALREADY_PROCESSED");
      }

      // 1️⃣ stripeEvents processing 상태 생성
      tx.set(stripeEventRef, {
        eventId,
        type: event.type,
        sessionId: session.id,
        handled: false,
        resultStatus: "processing",
        receivedAt: new Date(),
      });

      // 2️⃣ 쿠폰 생성 (transaction 내부)
      const coupons = createCouponsTx(tx, userId, qty);
 
      // 3️⃣ checkoutSessions 확정
      tx.set(
        checkoutRef,
        {
          processed: true,
          status: "completed",
          issuedCouponCodes: coupons.map((c) => c.code),
          updatedAt: new Date(),
        },
        { merge: true }
      );

      // 4️⃣ stripeEvents 성공 처리
      tx.update(stripeEventRef, {
        handled: true,
        resultStatus: "success",
      });
    });
  } catch (e: any) {
    if (e.message === "EVENT_ALREADY_PROCESSED") {
      return NextResponse.json({ received: true }, { status: 200 });
    }
    return NextResponse.json({ error: "transaction_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
