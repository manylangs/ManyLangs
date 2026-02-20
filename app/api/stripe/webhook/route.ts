import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createCouponsTx } from "@/lib/coupons";
import { PRICE_TO_COUPON_QTY } from "@/lib/pricing";
import { db } from "@/lib/firebaseAdmin";
import admin from "firebase-admin"; // ✅ 추가

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp; // ✅ 추가

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
  const startTime = Date.now();

  const metadata = session.metadata ?? {};
  const userId = metadata.userId;

  if (!userId) {
    return NextResponse.json({ error: "missing userId" }, { status: 400 });
  }

  if (session.payment_status !== "paid") {
    return NextResponse.json({ skipped: "not paid" }, { status: 200 });
  }

  let priceId: string | undefined;
  try {
    const full = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["line_items.data.price"],
    });
    const p = full.line_items?.data?.[0]?.price;
    priceId = typeof p === "object" ? p.id : undefined;
  } catch {}

  if (!priceId) {
    return NextResponse.json({ error: "missing priceId" }, { status: 400 });
  }

  const qty = (PRICE_TO_COUPON_QTY as any)[priceId];
  if (!qty || qty <= 0) {
    return NextResponse.json({ error: "invalid qty" }, { status: 400 });
  }

  const stripeEventRef = db.collection("stripeEvents").doc(eventId);
  const checkoutRef = db.collection("checkoutSessions").doc(session.id);
  const paymentsRef = db.collection("payments").doc(session.id);

  try {
    await db.runTransaction(async (tx) => {
      const existing = await tx.get(stripeEventRef);

      // 🔁 Duplicate 처리
      if (existing.exists) {
        const data = existing.data() || {};
        const currentCount = data.duplicateCount || 0;

        tx.update(stripeEventRef, {
          duplicateCount: currentCount + 1,
          lastDuplicateAt: serverTimestamp(), // ✅ 변경
        });

        return;
      }

      // 1️⃣ stripeEvents 최초 기록
      tx.create(stripeEventRef, {
        eventId,
        type: event.type,
        created: event.created,
        sessionId: session.id,
        userId,
        priceId,
        amount: session.amount_total,
        currency: session.currency,
        handled: false,
        resultStatus: "processing",
        receivedAt: serverTimestamp(), // ✅ 변경
        duplicateCount: 0,
      });

      // 2️⃣ payments 미러 생성
      tx.set(
        paymentsRef,
        {
          userId,
          sessionId: session.id,
          eventId,
          priceId,
          qty,
          amount: session.amount_total,
          currency: session.currency,
          status: "paid",
          createdAt: serverTimestamp(), // ✅ 변경
          paidAt: serverTimestamp(),    // ✅ 변경
        },
        { merge: true }
      );

      // 3️⃣ 쿠폰 생성
      const coupons = createCouponsTx(tx, userId, qty);

      // 4️⃣ checkoutSessions 확정
      tx.set(
        checkoutRef,
        {
          processed: true,
          status: "completed",
          issuedCouponCodes: coupons.map((c) => c.code),
          updatedAt: serverTimestamp(), // ✅ 변경
        },
        { merge: true }
      );

      // 5️⃣ stripeEvents 성공 처리
      tx.update(stripeEventRef, {
        handled: true,
        resultStatus: "success",
        processingTimeMs: Date.now() - startTime,
      });
    });
  } catch (e: any) {
    await stripeEventRef.set(
      {
        handled: false,
        resultStatus: "failed",
        errorMessage: e?.message ?? "unknown_error",
        processingTimeMs: Date.now() - startTime,
      },
      { merge: true }
    );

    return NextResponse.json({ error: "transaction_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}