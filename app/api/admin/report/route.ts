import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  // 기본: 최근 30일
  const now = Math.floor(Date.now() / 1000)
  const days = Number(searchParams.get("days") || 30)

  const createdFilter = {
    gte: now - days * 24 * 60 * 60,
  }
  try {
    // 🔐 admin 체크 (핵심)
    const email = req.headers.get("x-admin-email")

    if (email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 💳 결제
    const payments = await stripe.paymentIntents.list({
      limit: 100,
      created: createdFilter,
    })
    // 💸 환불
    const refunds = await stripe.refunds.list({
      limit: 100,
      created: createdFilter,
    })
    const filteredPayments = payments.data.filter(
      (p) =>
        p.status === "succeeded" &&
        p.currency === "usd"
    )

    const filteredRefunds = refunds.data.filter(
      (r) =>
        r.currency === "usd"
    )
    // 📊 계산
    const totalRevenue = filteredPayments.reduce(
      (sum, p) => sum + (p.amount_received || 0),
      0
    )

    const totalRefund = filteredRefunds.reduce(
      (sum, r) => sum + (r.amount || 0),
      0
    )0
    )

    const netRevenue = totalRevenue - totalRefund

    return NextResponse.json({
      totalRevenue,
      totalRefund,
      netRevenue,
      paymentCount: payments.data.length,
      refundCount: refunds.data.length,

      recentPayments: filteredPayments.slice(0, 20),
      recentRefunds: filteredRefunds.slice(0, 20),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}