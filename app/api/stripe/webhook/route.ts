// app/api/stripe/webhook/route.ts

import Stripe from "stripe";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import { createCoupons, type Coupon, qtyFromPriceId } from "@/lib/coupons";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing stripe signature" }, { status: 400 });

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: "invalid signature", message: err.message }, { status: 400 });
  }

  // ✅ completed만 처리, 나머지는 200으로 무시
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata ?? {};

  const userId = metadata.user_id || metadata.userId; // 둘 다 허용
  const purchaseType = metadata.purchase_type;

  const sessionId = session.id;
  const sessionRef = db.collection("checkoutSessions").doc(sessionId);

  // 결제 미완료면 무시(200)
  if (session.payment_status !== "paid") {
    await sessionRef.set(
      {
        sessionId,
        status: "skipped_not_paid",
        stripeEventId: event.id,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return NextResponse.json({ received: true, skipped: "payment not completed" }, { status: 200 });
  }

  // 메타데이터 부족이면 실패 기록 후 200 (재시도 폭탄 방지)
  if (!userId || !purchaseType) {
    await sessionRef.set(
      {
        sessionId,
        userId: userId ?? null,
        status: "failed_missing_metadata",
        processed: false,
        stripeEventId: event.id,
        metadata,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return NextResponse.json({ received: true, error: "missing required metadata" }, { status: 200 });
  }

  // ✅ 트랜잭션으로 중복 처리 차단 (락: status=processing)
  let shouldIssue = false;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(sessionRef);

    // 문서가 없으면 만들어 두고 진행(락 걸기)
    if (!snap.exists) {
      tx.set(
        sessionRef,
        {
          sessionId,
          userId,
          processed: false,
          status: "processing",
          stripeEventId: event.id,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      shouldIssue = true;
      return;
    }

    const data = snap.data() as any;

    // 이미 성공 처리됨 → 중복 발급 방지
    if (data.processed === true) {
      shouldIssue = false;
      return;
    }

    // 이미 처리 중이면(동시/재시도) → 중복 방지
    if (data.status === "processing") {
      shouldIssue = false;
      return;
    }

    // 처리 전 → processing 락
    tx.set(
      sessionRef,
      {
        userId,
        processed: false,
        status: "processing",
        stripeEventId: event.id,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    shouldIssue = true;
  });

  if (!shouldIssue) {
    return NextResponse.json({ received: true, skipped: "already processing/processed" }, { status: 200 });
  }

  // ✅ 쿠폰 수량은 무조건 priceId 기반 (단일 소스)
  let priceId: string | null =
    (metadata.priceId as string) ||
    (metadata.price_id as string) ||
    null;

  // metadata에 없으면 line items에서 price.id 추출
  if (!priceId) {
    try {
      const items = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 10 });
      priceId = (items.data?.[0]?.price?.id ?? null) as any;
    } catch {
      // ignore
    }
  }

  // qty 계산
  let qty = 0;
  try {
    if (priceId) qty = qtyFromPriceId(priceId);
  } catch {
    qty = 0;
  }

  if (!qty || qty <= 0) {
    // ❗ 여기서는 processed=true로 찍지 않는다 (수동 재처리 가능하게)
    await sessionRef.set(
      {
        status: "failed_qty_unknown",
        processed: false,
        priceId: priceId ?? null,
        metadata,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return NextResponse.json({ received: true, error: "unable to determine coupon quantity" }, { status: 200 });
  }

  // ✅ 쿠폰 발급
  const coupons: Coupon[] = await createCoupons(userId, qty);
  const codes = coupons.map((c) => c.code);

  // ✅ 성공 기록 (최종적으로 processed=true)
  await sessionRef.set(
    {
      status: "success",
      processed: true,
      priceId: priceId ?? null,
      qty,
      issuedCouponCodes: codes,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log("[STRIPE] coupons issued", { sessionId, userId, purchaseType, qty, priceId, codes });

  return NextResponse.json({ received: true, handled: purchaseType, qty }, { status: 200 });
}
