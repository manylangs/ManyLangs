// app/api/stripe/webhook/route.ts

import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createCoupons, type Coupon } from "@/lib/coupons";
import { PRICE_TO_COUPON_QTY } from "@/lib/pricing";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// ✅ dev용 중복 처리 방지(웹훅 재시도 대비) - 인메모리(사이클3에서 Firestore로 교체 예정)
const g = globalThis as any;
g.__STRIPE_HANDLED__ ||= new Set<string>();
const HANDLED: Set<string> = g.__STRIPE_HANDLED__;

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    // ✅ 보안상 400 유지 (Stripe가 아닌 호출)
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

  const purchaseType = metadata.purchase_type;
  const userId = metadata.user_id;

  // ✅ (변경) metadata 누락은 400 대신 200 스킵 (재시도 방지)
  if (!purchaseType || !userId) {
    return NextResponse.json(
      { received: true, skipped: "missing required metadata", metadata, sessionId: session.id },
      { status: 200 }
    );
  }

  // 결제 완료 안전 체크
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true, skipped: "payment not completed" }, { status: 200 });
  }

  // ✅ 중복 웹훅 방지 (dev 전용)
  const dedupeKey = session.id;
  if (HANDLED.has(dedupeKey)) {
    return NextResponse.json({ received: true, skipped: "already handled" }, { status: 200 });
  }

  // 세션 재조회
  let priceId: string | undefined;
  try {
    const full = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["line_items.data.price"],
    });

    const p = full.line_items?.data?.[0]?.price;
    priceId = typeof p === "object" ? p.id : undefined;
  } catch {
    // ignore
  }

  priceId = priceId ?? metadata.price_id ?? undefined;

  const qty =
    (priceId && (PRICE_TO_COUPON_QTY as Record<string, number>)[priceId]) ||
    Number(metadata.coupon_qty ?? 0);

  // ✅ (변경) qty 실패도 400 대신 200 스킵 (재시도 방지)
  if (!qty || qty <= 0) {
    return NextResponse.json(
      { received: true, skipped: "unable to determine coupon quantity", priceId, metadata, sessionId: session.id },
      { status: 200 }
    );
  }

  const coupons: Coupon[] = await createCoupons(userId, qty);

  HANDLED.add(dedupeKey);

  console.log("[STRIPE] coupons issued", {
    purchaseType,
    userId,
    qty,
    priceId,
    codes: coupons.map((c) => c.code),
    sessionId: session.id,
  });

  return NextResponse.json({ received: true, handled: purchaseType, qty }, { status: 200 });
}
