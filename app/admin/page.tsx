"use client"

import { useEffect, useState } from "react"
import Link from "next/link";
// ===== [START] language map =====
const LANG_MAP: Record<string, string> = {
  korean: "KR",
  spanish: "ES",
  french: "FR",
  portuguese: "PT",
  english: "EN",
}

function parseProduct(productId: string) {
  if (!productId) return "-"
  const [lang, level] = productId.split("_")
  return `${LANG_MAP[lang] || lang?.toUpperCase()} (${level})`
}
// ===== [END] language map =====

type Report = {
  totalRevenue: number
  totalRefund: number
  netRevenue: number
  paymentCount: number
  refundCount: number
  recentPayments: any[]
  recentRefunds: any[]
  paymentMap: Record<string, any>
}

export default function AdminPage() {
  const [data, setData] = useState<Report | null>(null)

  const [visiblePayments, setVisiblePayments] = useState(20)
  const [visibleRefunds, setVisibleRefunds] = useState(20)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/admin/report", {
          headers: {
            "x-admin-email": process.env.NEXT_PUBLIC_ADMIN_EMAIL!,
          },
        })

        const json = await res.json()
        console.log("ADMIN REPORT", json)
        setData({ totalRevenue: json.totalRevenue || 0, totalRefund: json.totalRefund || 0, netRevenue: json.netRevenue || 0, paymentCount: json.paymentCount || 0, refundCount: json.refundCount || 0, recentPayments: Array.isArray(json.recentPayments) ? json.recentPayments : [], recentRefunds: Array.isArray(json.recentRefunds) ? json.recentRefunds : [], paymentMap: json.paymentMap || {} })
      } catch (e) {
        console.error(e)
      }
    }

    fetchData()
  }, [])

  if (!data) return <div style={{ padding: 20 }}>Loading...</div>

  // ===== 그래프 =====
  const dailyRevenue: Record<string, number> = {}

  data.recentPayments.forEach((p) => {
    const date = new Date(p.created * 1000).toLocaleDateString()
    dailyRevenue[date] = (dailyRevenue[date] || 0) + (p.amount || 0)
  })

  // ===== 언어별 매출 =====
  const langRevenue: Record<string, number> = {}

  data.recentPayments.forEach((p) => {
    const licenses = data.paymentMap?.[p.id]?.licenses || []

    licenses.forEach((l: any) => {
      if (!l.productId) return
      const [lang] = l.productId.split("_")
      const code = LANG_MAP[lang] || lang?.toUpperCase()

      langRevenue[code] = (langRevenue[code] || 0) + (p.amount || 0)
    })
  })

  return (
    <div style={{ padding: 20 }}>

      <div style={{ marginBottom: 20 }}>
        <Link href="/select-books">
          <button style={{ marginRight: 10 }}>📚← Back to Library</button>
        </Link>
      </div>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Admin Dashboard</h1>
      {/* 카드 */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Card title="Total Revenue" value={data.totalRevenue} />
        <Card title="Total Refund" value={data.totalRefund} />
        <Card title="Net Revenue" value={data.netRevenue} />
        <Card title="Payments" value={data.paymentCount} />
        <Card title="Refunds" value={data.refundCount} />
      </div>

      {/* ===== 언어별 매출 ===== */}
      <h2 style={{ marginTop: 40 }}>Revenue by Language</h2>

      <div style={{ marginTop: 10 }}>
        {Object.entries(langRevenue).map(([lang, amount]) => (
          <div key={lang} style={{ fontSize: 13 }}>
            {lang} : ${(amount / 100).toFixed(2)}
          </div>
        ))}
      </div>

      {/* ===== 그래프 ===== */}
      <h2 style={{ marginTop: 40 }}>Revenue Trend</h2>

      <div style={{ marginTop: 10 }}>
        {Object.entries(dailyRevenue).map(([date, amount]) => (
          <div key={date} style={{ fontSize: 12 }}>
            {date} : ${(amount / 100).toFixed(2)}
          </div>
        ))}
      </div>

      {/* ===== Payments ===== */}
      <h2 style={{ marginTop: 40 }}>Recent Payments</h2>

      <div>
        {data.recentPayments
          .slice(0, visiblePayments)
          .map((p, i) => {
            // 이메일: charge 객체 기준으로 가능한 모든 경로 탐색
            const email =
              p.billing_details?.email ||
              p.receipt_email ||
              p.payment_method?.billing_details?.email ||
              p.id

            // 국가: billing_details 우선, 없으면 payment_method
            const country =
              p.billing_details?.address?.country ||
              p.payment_method?.billing_details?.address?.country ||
              "-"

            return (
              <div key={p.id || i} style={{ padding: 8, borderBottom: "1px solid #eee" }}>

                💳 {((p.amount || 0) / 100).toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })} | {p.status}

                {/* 날짜 + 이메일 + 국가 */}
                <div style={{ fontSize: 12, color: "#444", marginTop: 2 }}>
                  📅 {new Date(p.created * 1000).toLocaleDateString("ko-KR")}
                  &nbsp;|&nbsp;
                  📧 <span style={{ fontFamily: "monospace" }}>{email}</span>
                  &nbsp;|&nbsp;
                  🌍 {country}
                </div>

                <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                  coupons: {data.paymentMap?.[p.id]?.coupons?.length || 0} | licenses: {data.paymentMap?.[p.id]?.licenses?.length || 0}
                </div>

                {data.paymentMap?.[p.id]?.licenses?.map((l: any) => (
                  <div key={l.id} style={{ fontSize: 11, color: "#999" }}>
                    - {parseProduct(l.productId)}
                  </div>
                ))}
              </div>
            )
          })}
      </div>

      {visiblePayments < data.recentPayments.length && (
        <button
          onClick={() => setVisiblePayments(prev => prev + 20)}
          style={{ marginTop: 10 }}
        >
          Load More Payments ({visiblePayments} / {data.recentPayments.length})
        </button>
      )}

      {/* ===== Refunds ===== */}
      <h2 style={{ marginTop: 40 }}>Recent Refunds</h2>

      <div>
        {data.recentRefunds
          ?.slice(0, visibleRefunds || 20)
          ?.map((r, i) => {
            // 환불 객체가 charge 자체인 경우를 포함해 모든 경로 탐색
            const refundEmail =
              (r as any).charge?.receipt_email ||
              (r as any).charge?.billing_details?.email ||
              (r as any).receipt_email ||
              (r as any).billing_details?.email ||
              (r as any).payment_intent?.receipt_email ||
              r.id.slice(0, 8) + "..." + r.id.slice(-4)

            return (
              <div key={r.id || i} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                💸 {(r.amount / 100).toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })}

                {/* 환불 날짜 + 이메일 */}
                <div style={{ fontSize: 12, color: "#444", marginTop: 2 }}>
                  📅 {new Date(r.created * 1000).toLocaleDateString("ko-KR")}
                  &nbsp;|&nbsp;
                  📧 <span style={{ fontFamily: "monospace" }}>{refundEmail}</span>
                </div>
              </div>
            )
          })}
      </div>

      {visibleRefunds < (data.recentRefunds?.length || 0) && (
        <button
          onClick={() => setVisibleRefunds(prev => prev + 20)}
          style={{ marginTop: 10 }}
        >
          Load More Refunds ({visibleRefunds} / {data.recentRefunds.length})
        </button>
      )}
    </div>
  )
}

function Card({ title, value }: { title: string; value: number }) {
  const isCount = title === "Payments" || title === "Refunds"

  return (
    <div
      style={{
        padding: 16,
        border: "1px solid #eee",
        borderRadius: 8,
        minWidth: 160,
      }}
    >
      <div style={{ fontSize: 12, color: "#888" }}>{title}</div>

      <div style={{ fontSize: 20, fontWeight: "bold" }}>
        {isCount
          ? value.toLocaleString()
          : (value / 100).toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })}
      </div>
    </div>
  )
}