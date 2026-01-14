// app/api/stripe/webhook/route.ts

import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

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

  // ✅ checkout.session.completed만 처리
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata ?? {};

  const purchaseType = metadata.purchase_type; // personal | teacher | institution
  const userId = metadata.user_id;
  const couponQty = Number(metadata.coupon_qty ?? "0");

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

  // ✅ 결제 타입 분기
  switch (purchaseType) {
    case "personal":
      // 개인 구독
      // 👉 다음 단계에서: 라이선스 부여 + (선택) 개인 쿠폰 지급
      console.log("[STRIPE] personal purchase", { userId, sessionId: session.id });
      break;

    case "teacher":
    case "institution":
      // 교사 / 기관 (동일 처리)
      // 👉 다음 단계에서: couponQty만큼 쿠폰 생성
      console.log("[STRIPE] coupon purchase", {
        ownerType: purchaseType,
        userId,
        couponQty,
        sessionId: session.id,
      });
      break;

    default:
      return NextResponse.json(
        { error: "unknown purchase_type", purchaseType },
        { status: 400 }
      );
  }

  return NextResponse.json({ received: true, handled: purchaseType }, { status: 200 });
}
