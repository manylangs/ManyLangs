import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function GET(req: NextRequest) {
  try {
    // 🔐 admin 체크 (핵심)
    const email = req.headers.get("x-admin-email")

    if (email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 💳 결제
    const payments = await stripe.paymentIntents.list({
      limit: 50,
    })

    // 💸 환불
    const refunds = await stripe.refunds.list({
      limit: 50,
    })

    // 📊 계산
    const totalRevenue = payments.data.reduce(
      (sum, p) => sum + (p.amount_received || 0),
      0
    )

    const totalRefund = refunds.data.reduce(
      (sum, r) => sum + (r.amount || 0),
      0
    )

    const netRevenue = totalRevenue - totalRefund

    return NextResponse.json({
      totalRevenue,
      totalRefund,
      netRevenue,
      paymentCount: payments.data.length,
      refundCount: refunds.data.length,
      recentPayments: payments.data.slice(0, 10),
      recentRefunds: refunds.data.slice(0, 10),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}