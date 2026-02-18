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
    console.log("❌ constructEvent failed:", err.message);
    return NextResponse.json(
      { error: "invalid signature", message: err.message },
      { status: 400 }
    );
  }

  console.log("📌 EVENT TYPE:", event.type);

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const eventId = event.id;
  const session = event.data.object as Stripe.Checkout.Session;

  console.log("📦 CHECKOUT SESSION:", {
    id: session.id,
    metadata: session.metadata,
    payment_status: session.payment_status,
  });

  const stripeEventRef = db.collection("stripeEvents").doc(eventId);

  try {
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(stripeEventRef);

      if (doc.exists) {
        throw new Error("EVENT_ALREADY_PROCESSED");
      }

      tx.set(stripeEventRef, {
        eventId,
        type: event.type,
        sessionId: session.id,
        handled: false,
        resultStatus: "processing",
        receivedAt: new Date(),
      });
    });
  } catch (e: any) {
    if (e.message === "EVENT_ALREADY_PROCESSED") {
      console.log("⚠️ Event already processed (transaction lock):", eventId);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    console.error("🔥 Transaction failed:", e);
    return NextResponse.json({ error: "transaction_failed" }, { status: 500 });
  }

  const metadata = session.metadata ?? {};
  const userId = metadata.userId;

  if (!userId) {
    console.log("❌ Missing userId in metadata:", metadata);

    await stripeEventRef.update({
      handled: true,
      resultStatus: "failed_missing_userId",
    });

    return NextResponse.json(
      { error: "missing userId in metadata", metadata },
      { status: 400 }
    );
  }

  if (session.payment_status !== "paid") {
    console.log("⚠️ Payment not completed:", session.payment_status);
    return NextResponse.json(
      { skipped: "payment not completed" },
      { status: 200 }
    );
  }

  // 🔥 priceId 추출
  let priceId: string | undefined;

  try {
    const full = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["line_items.data.price"],
    });

    const p = full.line_items?.data?.[0]?.price;
    priceId = typeof p === "object" ? p.id : undefined;
  } catch (e: any) {
    console.log("❌ price expand failed:", e?.message);
  }

  console.log("💰 priceId:", priceId);

  if (!priceId) {
    await stripeEventRef.update({
      handled: true,
      resultStatus: "failed_missing_priceId",
    });

    return NextResponse.json(
      { error: "missing priceId on session" },
      { status: 400 }
    );
  }

  const qty = (PRICE_TO_COUPON_QTY as any)[priceId];

  console.log("🎟 qty:", qty);

  if (!qty || qty <= 0) {
    await stripeEventRef.update({
      handled: true,
      resultStatus: "failed_qty_unknown",
    });

    return NextResponse.json(
      { error: "unable to determine coupon quantity", priceId },
      { status: 400 }
    );
  }

  const start = Date.now();

  const coupons = await createCoupons(userId, qty);

  const checkoutRef = db.collection("checkoutSessions").doc(session.id);

  await checkoutRef.set(
    {
      processed: true,
      status: "completed",
      issuedCouponCodes: coupons.map((c) => c.code),
      updatedAt: new Date(),
    },
    { merge: true }
  );

  await stripeEventRef.update({
    handled: true,
    resultStatus: "success",
    processingTimeMs: Date.now() - start,
  });

  console.log("✅ coupons issued:", {
    userId,
    qty,
    priceId,
    codes: coupons.map((c) => c.code),
    sessionId: session.id,
  });

  return NextResponse.json(
    { received: true, qty },
    { status: 200 }
  );
}
