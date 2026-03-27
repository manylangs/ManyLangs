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

  // 🔥 Load More 상태
  const [paymentLimit, setPaymentLimit] = useState(20)
  const [refundLimit, setRefundLimit] = useState(20)

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

      {/* 카드 영역 */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Card title="Total Revenue" value={data.totalRevenue} />
        <Card title="Total Refund" value={data.totalRefund} />
        <Card title="Net Revenue" value={data.netRevenue} />
        <Card title="Payments" value={data.paymentCount} />
        <Card title="Refunds" value={data.refundCount} />
      </div>

      {/* 최근 결제 */}
      <h2 style={{ marginTop: 40 }}>Recent Payments</h2>
      <div>
        {data.recentPayments.slice(0, paymentLimit).map((p) => (
          <div key={p.id} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
            💳 {(p.amount_received / 100).toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}{" "}
            | {p.status}
          </div>
        ))}
      </div>

      {/* Load More 버튼 */}
      {paymentLimit < data.recentPayments.length && (
        <button
          onClick={() => setPaymentLimit((prev) => prev + 20)}
          style={{ marginTop: 10 }}
        >
          Load More Payments
        </button>
      )}

      {/* 최근 환불 */}
      <h2 style={{ marginTop: 40 }}>Recent Refunds</h2>
      <div>
        {data.recentRefunds.slice(0, refundLimit).map((r) => (
          <div key={r.id} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
            💸 {(r.amount / 100).toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}
          </div>
        ))}
      </div>

      {/* Load More 버튼 */}
      {refundLimit < data.recentRefunds.length && (
        <button
          onClick={() => setRefundLimit((prev) => prev + 20)}
          style={{ marginTop: 10 }}
        >
          Load More Refunds
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