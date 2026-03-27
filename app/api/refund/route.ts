import Stripe from "stripe";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import {
  revokeLicensesByPaymentIntent,
  deleteCouponsByPaymentIntent,
} from "@/lib/refunds";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "missing userId" },
        { status: 400 }
      );
    }

    // 🔍 사용자 쿠폰 조회
    const couponsSnap = await db
      .collection("coupons")
      .where("ownerId", "==", userId)
      .get();

    if (couponsSnap.empty) {
      return NextResponse.json(
        { error: "no coupons found" },
        { status: 404 }
      );
    }

    // 🔍 paymentIntentId 수집
    const paymentIntents = new Set<string>();

    couponsSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.paymentIntentId) {
        paymentIntents.add(data.paymentIntentId);
      }
    });

    if (paymentIntents.size === 0) {
      return NextResponse.json(
        { error: "no paymentIntentId found" },
        { status: 400 }
      );
    }
    // 🔥 그룹별 "사용 여부" 체크

    // 🔥 1️⃣ 라이선스 기준 used coupon 수집
    const licensesSnap = await db
      .collection("licenses")
      .where("userId", "==", userId)
      .get();

    const usedCouponCodes = new Set<string>();

    licensesSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.source === "coupon" && data.code) {
        usedCouponCodes.add(data.code);
      }
    });

    // 🔥 2️⃣ paymentIntent 그룹화
    const grouped: Record<string, any[]> = {};

    couponsSnap.docs.forEach((doc) => {
      const data = doc.data();

      if (!data.paymentIntentId) return;

      if (!grouped[data.paymentIntentId]) {
        grouped[data.paymentIntentId] = [];
      }

      grouped[data.paymentIntentId].push(data);
    });

    // 🔥 3️⃣ 환불 가능한 paymentIntent만 필터
    const refundablePaymentIntents: string[] = [];

    for (const [pid, group] of Object.entries(grouped)) {

      const anyUsed = group.some((c: any) =>
        usedCouponCodes.has(c.code)
      );

      if (!anyUsed) {
        refundablePaymentIntents.push(pid);
      }
    }


    // ❌ 하나도 환불 가능 없으면 차단
    if (refundablePaymentIntents.length === 0) {
      return NextResponse.json(
        { error: "no refundable purchases (all used)" },
        { status: 400 }
      )
    }

    // 🔥 핵심 처리
    for (const paymentIntentId of refundablePaymentIntents) {
      // Stripe refund 확인
      const refunds = await stripe.refunds.list({
        payment_intent: paymentIntentId,
      });

      const alreadyRefunded = refunds.data.length > 0;

      if (!alreadyRefunded) {
        await stripe.refunds.create({
          payment_intent: paymentIntentId,
        });
      }

      // 🔥 항상 실행 (중요)
      await revokeLicensesByPaymentIntent(paymentIntentId);
      await deleteCouponsByPaymentIntent(paymentIntentId);
    }

    return NextResponse.json({
      success: true,
    });

  } catch (err) {
    console.error("refund error:", err);

    return NextResponse.json(
      { error: "refund failed" },
      { status: 500 }
    );
  }
}