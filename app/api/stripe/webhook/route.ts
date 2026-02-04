// app/api/stripe/webhook/route.ts

import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createCoupons } from "@/lib/coupons";
import { PRICE_TO_COUPON_QTY } from "@/lib/pricing";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// ✅ dev용 중복 처리 방지(웹훅 재시도 대비) - 인메모리
const g = globalThis as any;
g.__STRIPE_HANDLED__ ||= new Set<string>();
const HANDLED: Set<string> = g.__STRIPE_HANDLED__;

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
    // ⚠️ 여기서 userId가 비면 "내 쿠폰이 안 뜸" 100% 발생
    return NextResponse.json(
      { error: "missing required metadata", metadata },
      { status: 400 }
    );
  }

  // 결제 완료 안전 체크
  if (session.payment_status !== "paid") {
    return NextResponse.json({ skipped: "payment not completed" }, { status: 200 });
  }

  // ✅ 중복 웹훅 방지
  const dedupeKey = session.id; // 세션ID 기준
  if (HANDLED.has(dedupeKey)) {
    return NextResponse.json({ received: true, skipped: "already handled" }, { status: 200 });
  }

  // ✅ line_items는 웹훅 payload에 없을 수 있음 → 세션 재조회 + expand
  let priceId: string | undefined;
  try {
    const full = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["line_items.data.price"],
    });

    const p = full.line_items?.data?.[0]?.price;
    priceId = typeof p === "object" ? (p?.id as string | undefined) : undefined;
  } catch {
    // ignore (metadata fallback)
  }

  // 🔑 priceId 추출 실패 시 metadata fallback
  priceId = priceId ?? metadata.price_id ?? undefined;

  // 🔢 쿠폰 수량 결정
  const qty =
    (priceId && (PRICE_TO_COUPON_QTY as any)[priceId]) ||
    Number(metadata.coupon_qty ?? 0);

  if (!qty || qty <= 0) {
    return NextResponse.json(
      { error: "unable to determine coupon quantity", priceId, metadata },
      { status: 400 }
    );
  }

  // ✅ 쿠폰 발급 (ownerId=userId)
  const coupons = createCoupons(userId, qty);

  // ✅ 처리 완료 표시 (중복 방지)
  HANDLED.add(dedupeKey);

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
