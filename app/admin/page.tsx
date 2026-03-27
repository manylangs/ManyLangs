"use client"

import { useEffect, useState } from "react"

type Report = {
  totalRevenue: number
  totalRefund: number
  netRevenue: number
  paymentCount: number
  refundCount: number
  recentPayments: any[]
  recentRefunds: any[]
  paymentMap: Record<string, any> // ✅ 추가
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
        setData(json)
      } catch (e) {
        console.error(e)
      }
    }

    fetchData()
  }, [])

  if (!data) return <div style={{ padding: 20 }}>Loading...</div>

  // ✅ 그래프용 데이터 계산
  const dailyRevenue: Record<string, number> = {}

  data.recentPayments.forEach((p) => {
    const date = new Date(p.created * 1000).toLocaleDateString()
    dailyRevenue[date] = (dailyRevenue[date] || 0) + p.amount_received
  })

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Admin Dashboard</h1>

      <button
        onClick={() => window.location.href = "/select-books"}
        style={{ marginBottom: 20 }}
      >
        ← Back to Library
      </button>

      {/* 카드 */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Card title="Total Revenue" value={data.totalRevenue} />
        <Card title="Total Refund" value={data.totalRefund} />
        <Card title="Net Revenue" value={data.netRevenue} />
        <Card title="Payments" value={data.paymentCount} />
        <Card title="Refunds" value={data.refundCount} />
      </div>

      {/* ================= 그래프 ================= */}
      <h2 style={{ marginTop: 40 }}>Revenue Trend</h2>

      <div style={{ marginTop: 10 }}>
        {Object.entries(dailyRevenue).map(([date, amount]) => (
          <div key={date} style={{ fontSize: 12 }}>
            {date} : ${(amount / 100).toFixed(2)}
          </div>
        ))}
      </div>

      {/* ================= Payments ================= */}
      <h2 style={{ marginTop: 40 }}>Recent Payments</h2>

      <div>
        {data.recentPayments
          .slice(0, visiblePayments)
          .map((p, i) => (
            <div key={p.id || i} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
              💳 {(p.amount_received / 100).toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
              })}{" "}
              | {p.status}

              {/* ===== STEP3 UI ===== */}
              <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                coupons: {data.paymentMap?.[p.id]?.coupons?.length || 0} | licenses: {data.paymentMap?.[p.id]?.licenses?.length || 0}
              </div>

              {/* 상세 license */}
              {data.paymentMap?.[p.id]?.licenses?.map((l: any) => (
                <div key={l.id} style={{ fontSize: 11, color: "#999" }}>
                  - {l.productId}
                </div>
              ))}
            </div>
          ))}
      </div>

      {visiblePayments < data.recentPayments.length && (
        <button
          onClick={() => setVisiblePayments(prev => prev + 20)}
          style={{ marginTop: 10 }}
        >
          Load More Payments ({visiblePayments} / {data.recentPayments.length})
        </button>
      )}

      {/* ================= Refunds ================= */}
      <h2 style={{ marginTop: 40 }}>Recent Refunds</h2>

      <div>
        {data.recentRefunds
          ?.slice(0, visibleRefunds || 20)
          ?.map((r, i) => (
            <div key={r.id || i} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
              💸 {(r.amount / 100).toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
              })}
            </div>
          ))}
      </div>

      {visibleRefunds < data.recentRefunds.length && (
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