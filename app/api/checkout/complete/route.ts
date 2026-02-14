// app/api/checkout/complete/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

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
    // Stripe 세션 조회 (검증/표시용)
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // webhook 처리 결과 조회
    const snap = await db.collection("checkoutSessions").doc(sessionId).get();
    const data = snap.exists ? snap.data() : null;

    // ✅ 발급은 절대 여기서 하지 않음 (조회 전용)
    return NextResponse.json(
      {
        ok: true,
        session: {
          id: session.id,
          payment_status: session.payment_status,
          amount_total: session.amount_total,
          currency: session.currency,
        },
        processing: data
          ? {
              processed: data.processed ?? false,
              status: data.status ?? null,
              issuedCouponCodes: data.issuedCouponCodes ?? [],
              stripeEventId: data.stripeEventId ?? null,
              updatedAt: data.updatedAt ?? null,
            }
          : null,
      },
      { status: 200 }
    );
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "checkout complete failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
