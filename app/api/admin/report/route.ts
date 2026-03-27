import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  // 기본: 최근 30일
  const now = Math.floor(Date.now() / 1000)
  const days = Number(searchParams.get("days") || 365)

  const createdFilter = {
    gte: now - days * 24 * 60 * 60,
  }

  try {
    // 🔐 admin 체크
    const email = req.headers.get("x-admin-email")

    if (email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const payments = await stripe.paymentIntents.list({
      limit: 100,
      created: createdFilter,
    })

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

    // 📊 총합 계산
    const totalRevenue = filteredPayments.reduce(
      (sum, p) => sum + (p.amount_received || 0),
      0
    )

    const totalRefund = filteredRefunds.reduce(
      (sum, r) => sum + (r.amount || 0),
      0
    )

    const netRevenue = totalRevenue - totalRefund

    // 📊 월별 집계
    const monthlyMap: Record<string, number> = {}

    filteredPayments.forEach((p) => {
      const date = new Date(p.created * 1000)
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`

      if (!monthlyMap[key]) monthlyMap[key] = 0
      monthlyMap[key] += p.amount_received || 0
    })

    const monthlyRevenue = Object.entries(monthlyMap)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month))

    return NextResponse.json({
      totalRevenue,
      totalRefund,
      netRevenue,
      paymentCount: payments.data.length,
      refundCount: refunds.data.length,

      recentPayments: filteredPayments,
      recentRefunds: filteredRefunds,

      // ✅ 추가됨
      monthlyRevenue,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}