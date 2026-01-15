// app/api/checkout/route.ts

import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST() {
  const session = await stripe.checkout.sessions.create({
    mode: "payment", // 또는 subscription
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "ManyLangs Personal Plan",
          },
          unit_amount: 500, // $5
        },
        quantity: 1,
      },
    ],
    success_url: "http://localhost:3000/success",
    cancel_url: "http://localhost:3000/cancel",

    // ✅ 핵심: metadata
    metadata: {
      purchase_type: "personal",
      user_id: "test_user_123",
      coupon_qty: "10",
    },
  });

  return NextResponse.json({ url: session.url });
}
