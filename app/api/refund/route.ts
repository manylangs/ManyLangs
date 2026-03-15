import Stripe from "stripe";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import {
  revokeLicensesByPaymentIntent,
  resetCouponsByPaymentIntent,
} from "@/lib/refunds";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    console.log("===== REFUND REQUEST START =====", { userId });

    if (!userId) {
      return NextResponse.json(
        { error: "missing userId" },
        { status: 400 }
      );
    }

    // 🔎 쿠폰 조회
    const couponsSnap = await db
      .collection("coupons")
      .where("ownerId", "==", userId)
      .get();

    console.log("coupons found:", couponsSnap.size);

    if (couponsSnap.empty) {
      return NextResponse.json(
        { error: "No purchase found" },
        { status: 400 }
      );
    }

    const coupons = couponsSnap.docs.map((d) => d.data() as any);

    // 🔹 paymentIntent 그룹화
    const groups = new Map<string, any[]>();

    for (const c of coupons) {
      if (!c.paymentIntentId) continue;

      if (!groups.has(c.paymentIntentId)) {
        groups.set(c.paymentIntentId, []);
      }

      groups.get(c.paymentIntentId)!.push(c);
    }

    console.log("paymentIntent groups:", groups.size);

    for (const [pi, list] of groups.entries()) {
      console.log("PI group:", {
        paymentIntentId: pi,
        couponCount: list.length,
        anyUsed: list.some((c) => c.used),
      });
    }

    let targetPaymentIntent: string | null = null;
    let targetIssuedAt: number | null = null;

    let expired = false;
    let used = false;

    // 🔹 환불 가능한 결제 찾기
    for (const [pi, list] of groups.entries()) {

      const issuedAt = list[0].issuedAt;
      if (!issuedAt) continue;

      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      const isExpired = now - issuedAt > sevenDays;
      const anyUsed = list.some((c) => c.used);

      console.log("checking PI:", {
        pi,
        issuedAt,
        age: now - issuedAt,
        expired: isExpired,
        anyUsed,
      });

      if (isExpired) expired = true;
      if (anyUsed) used = true;

      if (isExpired || anyUsed) continue;

      targetPaymentIntent = pi;
      targetIssuedAt = issuedAt;

      console.log("SELECTED paymentIntent:", pi);

      break;
    }

    // 🔴 환불 불가
    if (!targetPaymentIntent || !targetIssuedAt) {

      let message = "No refundable purchase found";

      if (expired && used) {
        message =
          "Refund unavailable: purchase is older than 7 days and at least one coupon has already been used";
      } else if (expired) {
        message = "Refund period (7 days) has expired";
      } else if (used) {
        message = "One or more coupons have already been used";
      }

      console.log("REFUND BLOCKED:", {
        expired,
        used,
        message,
      });

      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

    const paymentIntentId = targetPaymentIntent;

    console.log("targetPaymentIntent:", paymentIntentId);

    // 🔹 Stripe PaymentIntent 조회
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    });

    console.log("Stripe PI status:", pi.status);

    const charge = pi.latest_charge;

    if (!charge || typeof charge === "string") {
      return NextResponse.json(
        { error: "Charge not found" },
        { status: 400 }
      );
    }

    console.log("Stripe charge:", {
      chargeId: charge.id,
      refunded: charge.refunded,
      amount: charge.amount,
      amount_refunded: charge.amount_refunded,
    });

    // 🔴 Stripe는 환불됐다고 하지만 쿠폰이 남아있는 경우
    if (charge.refunded || charge.amount_refunded >= charge.amount) {

      console.log("Stripe says already refunded BUT coupons exist");

      return NextResponse.json(
        {
          error:
            "Payment already refunded in Stripe but coupons still exist. Manual check required.",
        },
        { status: 400 }
      );
    }

    // 💳 환불 실행
    console.log("Creating Stripe refund...");

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: "requested_by_customer",
    });

    console.log("Refund created:", refund.id);

    // 🔁 라이선스 제거
    await revokeLicensesByPaymentIntent(paymentIntentId);
    console.log("Licenses revoked");

    // 🔁 쿠폰 리셋
    await resetCouponsByPaymentIntent(paymentIntentId);
    console.log("Coupons reset");

    console.log("===== REFUND SUCCESS =====");

    return NextResponse.json({
      success: true,
      message: "Refund processed",
    });

  } catch (err) {

    console.error("refund error:", err);

    return NextResponse.json(
      { error: "Refund failed" },
      { status: 500 }
    );
  }
}