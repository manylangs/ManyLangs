import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

export async function GET(req: NextRequest) {
  try {
    const adminEmail = req.headers.get("x-admin-email");

    if (adminEmail !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const days = Number(req.nextUrl.searchParams.get("days") || "30");

    const since = Math.floor(
      (Date.now() - days * 24 * 60 * 60 * 1000) / 1000
    );

    // 페이지네이션으로 전체 건수 제한 없이 가져오기
    const allCharges: Stripe.Charge[] = [];
    let lastId: string | undefined;

    while (true) {
      const batch = await stripe.charges.list({
        limit: 100,
        starting_after: lastId,
        created: { gte: since },
      });

      allCharges.push(...batch.data);

      if (!batch.has_more) break;
      lastId = batch.data[batch.data.length - 1].id;
    }

    const charges = { data: allCharges };

    console.log(
      "days:",
      days,
      "charges:",
      charges.data.length
    );

    const monthlyMap: Record<string, number> = {};

    charges.data.forEach((charge) => {
      if (!charge.paid) return;
      if (charge.refunded) return;

      const month = new Date(charge.created * 1000)
        .toISOString()
        .slice(0, 7);

      monthlyMap[month] =
        (monthlyMap[month] || 0) + charge.amount;
    });

    const monthlyRevenue = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({
        month,
        amount,
      }));

    const totalRevenue = charges.data
      .filter((c) => c.paid)
      .reduce((sum, c) => sum + c.amount, 0);

    const totalRefund = charges.data
      .filter((c) => c.refunded)
      .reduce((sum, c) => sum + c.amount_refunded, 0);

    const paymentCount = charges.data.filter(
      (c) => c.paid
    ).length;

    const refundCount = charges.data.filter(
      (c) => c.refunded
    ).length;

    const recentPayments = charges.data
      .filter((c) => c.paid)
      .map((c) => ({
        ...c,
        adminEmail:
          c.billing_details?.email ||
          c.receipt_email ||
          null,
        chargeId: c.id,
        paymentIntentId:
          typeof c.payment_intent === "string"
            ? c.payment_intent
            : c.payment_intent?.id || null,
      }));

    const refunds = await stripe.refunds.list({
      limit: 100,
      created: {
        gte: since,
      },
    });

    const recentRefunds = await Promise.all(
      refunds.data.map(async (refund) => {
        let charge: Stripe.Charge | null = null;

        try {
          charge = await stripe.charges.retrieve(
            refund.charge as string
          );
        } catch {
          charge = null;
        }

        return {
          refundId: refund.id,
          amount: refund.amount,
          created: refund.created,

          chargeId: charge?.id || null,

          paymentIntentId:
            typeof charge?.payment_intent === "string"
              ? charge.payment_intent
              : charge?.payment_intent?.id || null,

          adminEmail:
            charge?.billing_details?.email ||
            charge?.receipt_email ||
            null,
        };
      })
    );

    return NextResponse.json({
      monthlyRevenue,

      totalRevenue,
      totalRefund,
      netRevenue: totalRevenue - totalRefund,

      paymentCount,
      refundCount,

      recentPayments,
      recentRefunds,

      paymentMap: {},
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}