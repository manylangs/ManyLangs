// app/api/checkout/complete/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/firebaseAdmin";
import { PRICE_TO_COUPON_QTY, type Coupon } from "@/lib/coupons";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

// ✅ 쿠폰 코드 생성 (기존 규칙 유지)
function genCouponCode() {
  return "ML-" + Math.random().toString(36).slice(2, 10).toUpperCase();
}

async function issueCouponsToFirestore(ownerId: string, qty: number) {
  const now = Date.now();
  const batch = db.batch();

  const codes: string[] = [];

  for (let i = 0; i < qty; i++) {
    const code = genCouponCode();
    codes.push(code);

    const ref = db.collection("coupons").doc(code);

    const doc: Coupon = {
      code,
      ownerId,
      issuedAt: now,
      used: false,
      // used*는 redeem 시 채워짐
    };

    batch.set(ref, doc, { merge: true });
  }

  await batch.commit();
  return codes;
}

export async function POST(req: Request) {
  let body: { session_id?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const sessionId = String(body?.session_id ?? "").trim();
  if (!sessionId) {
    return NextResponse.json({ error: "missing session_id" }, { status: 400 });
  }

  try {
    // 1) Stripe 세션 조회
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // 2) userId 확보 (네 프로젝트는 checkout 생성 시 userId를 넣는 구조여야 함)
    // - 가장 안전: session.client_reference_id
    // - 혹은 session.metadata.userId
    const ownerId =
      (session.client_reference_id as string) ||
      (session.metadata?.userId as string) ||
      "";

    if (!ownerId) {
      return NextResponse.json(
        { error: "missing userId on stripe session (client_reference_id or metadata.userId)" },
        { status: 400 }
      );
    }

    // 3) 결제 금액 → 쿠폰 수량 매핑
    // Stripe는 보통 amount_total이 "센트"라서 /100 필요
    const amountTotal = session.amount_total ?? 0;
    const price = Math.round(amountTotal / 100); // ex) $5 → 5

    const qty = PRICE_TO_COUPON_QTY[price];
    if (!qty) {
      return NextResponse.json({ error: `Unsupported price: ${price}` }, { status: 400 });
    }

    // 4) Firestore에 쿠폰 발급 저장
    const codes = await issueCouponsToFirestore(ownerId, qty);

    // 5) 프론트가 기대하는 형태로 반환
    return NextResponse.json({ coupons: codes }, { status: 200 });
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "checkout complete failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
