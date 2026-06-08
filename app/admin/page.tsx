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

const PAGE_SIZE = 5

function Pagination({ total, page, onPage }: { total: number; page: number; onPage: (p: number) => void }) {
  const totalPages = Math.ceil(total / PAGE_SIZE)
  if (totalPages <= 1) return null

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onPage(p)}
          style={{
            minWidth: 32,
            padding: "4px 8px",
            borderRadius: 4,
            border: p === page ? "2px solid #111" : "1px solid #ccc",
            background: p === page ? "#111" : "#fff",
            color: p === page ? "#fff" : "#111",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          {p}
        </button>
      ))}
    </div>
  )
}

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
  const [paymentPage, setPaymentPage] = useState(1)
  const [refundPage, setRefundPage] = useState(1)

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

  const paymentsSlice = data.recentPayments.slice(
    (paymentPage - 1) * PAGE_SIZE,
    paymentPage * PAGE_SIZE
  )

  const refundsSlice = data.recentRefunds.slice(
    (refundPage - 1) * PAGE_SIZE,
    refundPage * PAGE_SIZE
  )

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

      {/* ===== 결제 + 환불 좌우 배치 ===== */}
      <div style={{ display: "flex", gap: 32, marginTop: 40, alignItems: "flex-start" }}>

        {/* 왼쪽: Payments */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2>💳 Payments ({data.recentPayments.length})</h2>

          <div style={{ marginTop: 8 }}>
            {paymentsSlice.map((p, i) => {
              const email =
                p.billing_details?.email ||
                p.receipt_email ||
                p.payment_method?.billing_details?.email ||
                p.id

              const country =
                p.billing_details?.address?.country ||
                p.payment_method?.billing_details?.address?.country ||
                "-"

              return (
                <div key={p.id || i} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {((p.amount || 0) / 100).toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  })} | {p.status}

                  <div style={{ fontSize: 12, color: "#444", marginTop: 2 }}>
                    📅 {new Date(p.created * 1000).toLocaleDateString("ko-KR")}
                    &nbsp;|&nbsp;
                    📧 <span style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{email}</span>
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

          <Pagination
            total={data.recentPayments.length}
            page={paymentPage}
            onPage={setPaymentPage}
          />
        </div>

        {/* 오른쪽: Refunds */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2>💸 Refunds ({data.recentRefunds.length})</h2>

          <div style={{ marginTop: 8 }}>
            {refundsSlice.map((r, i) => {
              const refundEmail =
                (r as any).charge?.receipt_email ||
                (r as any).charge?.billing_details?.email ||
                (r as any).receipt_email ||
                (r as any).billing_details?.email ||
                (r as any).payment_intent?.receipt_email ||
                r.id.slice(0, 8) + "..." + r.id.slice(-4)

              return (
                <div key={r.id || i} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {(r.amount / 100).toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  })}

                  <div style={{ fontSize: 12, color: "#444", marginTop: 2 }}>
                    📅 {new Date(r.created * 1000).toLocaleDateString("ko-KR")}
                    &nbsp;|&nbsp;
                    📧 <span style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{refundEmail}</span>
                  </div>
                </div>
              )
            })}
          </div>

          <Pagination
            total={data.recentRefunds.length}
            page={refundPage}
            onPage={setRefundPage}
          />
        </div>

      </div>
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