import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createCouponsTx } from "@/lib/coupons";
import { PRICE_TO_COUPON_QTY } from "@/lib/pricing";
import { db } from "@/lib/firebaseAdmin";
import {
  revokeLicensesByPaymentIntent,
  deleteCouponsByPaymentIntent,
} from "@/lib/refunds";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "missing stripe signature" },
      { status: 400 }
    );
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

  if (
    event.type === "charge.refunded" ||
    event.type === "charge.updated"
  ) {
    const charge = event.data.object as Stripe.Charge;

    const paymentIntentId =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;

    // 🔥 핵심: 실제 환불 여부 기준
    if (paymentIntentId && charge.amount_refunded > 0) {
      await revokeLicensesByPaymentIntent(paymentIntentId);
      await deleteCouponsByPaymentIntent(paymentIntentId);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const eventId = event.id;
  const userId = session.client_reference_id as string | null;

  let stripeCustomerId: string | undefined;
  if (typeof session.customer === "string") {
    stripeCustomerId = session.customer;
  } else if (session.customer && "id" in session.customer) {
    stripeCustomerId = session.customer.id;
  }

  if (stripeCustomerId && userId) {
    await db
      .collection("users")
      .doc(userId)
      .set({ stripeCustomerId }, { merge: true });
  }

  if (!userId) {
    return NextResponse.json(
      { error: "missing client_reference_id" },
      { status: 400 }
    );
  }

  if (session.payment_status !== "paid") {
    return NextResponse.json({ skipped: "not paid" }, { status: 200 });
  }

  const stripeEventRef = db.collection("stripeEvents").doc(eventId);
  const checkoutRef = db.collection("checkoutSessions").doc(session.id);

  // 🔥 여기 추가
  const checkoutSnap = await checkoutRef.get();

  if (checkoutSnap.exists && checkoutSnap.data()?.processed) {
    return NextResponse.json({ received: true }, { status: 200 });
  }


  // 1순위: Firestore checkoutSessions에 저장된 priceId 사용
  let priceId: string | undefined;
  try {
    const checkoutSnap = await checkoutRef.get();
    priceId = checkoutSnap.data()?.priceId;
  } catch { }

  // 2순위: 없을 때만 Stripe fallback 조회
  if (!priceId) {
    try {
      const full = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["line_items.data.price"],
      });
      const p = full.line_items?.data?.[0]?.price;
      priceId = typeof p === "object" ? p.id : undefined;
    } catch { }
  }

  if (!priceId) {
    return NextResponse.json({ error: "missing priceId" }, { status: 400 });
  }

  const qty = (PRICE_TO_COUPON_QTY as Record<string, number>)[priceId];

  if (!qty) {
    return NextResponse.json({ error: "invalid priceId mapping" }, { status: 400 });
  }

  try {
    await db.runTransaction(async (tx) => {
      const existing = await tx.get(stripeEventRef);
      if (existing.exists) throw new Error("EVENT_ALREADY_PROCESSED");

      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id;

      tx.set(stripeEventRef, {
        eventId,
        type: event.type,
        sessionId: session.id,
        handled: false,
        resultStatus: "processing",
        receivedAt: new Date(),
      });

      const coupons = createCouponsTx(
        tx,
        userId,
        qty,
        paymentIntentId ?? null,
        session.id
      );

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

      tx.update(stripeEventRef, {
        handled: true,
        resultStatus: "success",
      });
    });
  } catch (e: any) {
    if (e?.message === "EVENT_ALREADY_PROCESSED") {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    return NextResponse.json(
      { error: "transaction_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}