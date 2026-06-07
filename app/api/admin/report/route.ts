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

    const charges = await stripe.charges.list({
      limit: 100,
      created: {
        gte: since,
      },
    });

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

    return NextResponse.json({
      monthlyRevenue,
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
