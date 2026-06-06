// ===== [START] admin report api FINAL =====
import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebaseAdmin"
import { logError } from "@/lib/logger" // 🔥 추가

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  // 기본: 최근 365일
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

    // ==============================
    // Stripe 데이터
    // ==============================

    const payments = await stripe.paymentIntents.list({
      limit: 100,
      created: createdFilter,
      expand: ['data.payment_method'],
    })

    const refunds = await stripe.refunds.list({
      limit: 100,
      created: createdFilter,
      expand: ['data.charge'],
    })

    const filteredPayments = payments.data.filter(
      (p) => p.status === "succeeded" && p.currency === "usd"
    )

    const filteredRefunds = refunds.data.filter(
      (r) => r.currency === "usd"
    )

    // ==============================
    // 총합 계산
    // ==============================

    const totalRevenue = filteredPayments.reduce(
      (sum, p) => sum + (p.amount_received || 0),
      0
    )

    const totalRefund = filteredRefunds.reduce(
      (sum, r) => sum + (r.amount || 0),
      0
    )

    const netRevenue = totalRevenue - totalRefund

    // ==============================
    // 월별 집계
    // ==============================

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

    // ==============================
    // 🔥 STEP 3: paymentIntent 매핑
    // ==============================

    const paymentMap: Record<string, any> = {}

    filteredPayments.forEach((p) => {
      paymentMap[p.id] = {
        amount: p.amount_received,
        coupons: [],
        licenses: [],
      }
    })

    // Firestore 조회
    const couponsSnap = await db.collection("coupons").get()
    const licensesSnap = await db.collection("licenses").get()

    const coupons = couponsSnap.docs.map((doc) => doc.data())
    const licenses = licensesSnap.docs.map((doc) => doc.data())

    // coupons 연결
    coupons.forEach((c: any) => {
      if (c.paymentIntentId && paymentMap[c.paymentIntentId]) {
        paymentMap[c.paymentIntentId].coupons.push(c)
      }
    })

    // licenses 연결
    licenses.forEach((l: any) => {
      if (l.paymentIntentId && paymentMap[l.paymentIntentId]) {
        paymentMap[l.paymentIntentId].licenses.push(l)
      }
    })

    // ==============================
    // 응답
    // ==============================

    return NextResponse.json({
      totalRevenue,
      totalRefund,
      netRevenue,
      paymentCount: payments.data.length,
      refundCount: refunds.data.length,

      recentPayments: filteredPayments,
      recentRefunds: filteredRefunds,

      monthlyRevenue,
      paymentMap,
    })

  } catch (e) {
    // ===== [START] admin error log =====
    await logError({
      type: "admin_api_error",
      error: String(e),
    })
    // ===== [END] admin error log =====

    console.error(e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
// ===== [END] admin report api FINAL =====