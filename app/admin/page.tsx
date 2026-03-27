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
}

export default function AdminPage() {
  const [data, setData] = useState<Report | null>(null)

  // ✅ Load More 상태
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