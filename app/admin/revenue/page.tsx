"use client"

import { useEffect, useState } from "react"

type Report = {
  totalRevenue: number
  totalRefund: number
  netRevenue: number
  paymentCount: number
  refundCount: number
}

export default function RevenuePage() {
  const [data, setData] = useState<Report | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/admin/report", {
        headers: {
          "x-admin-email": process.env.NEXT_PUBLIC_ADMIN_EMAIL!,
        },
      })

      const json = await res.json()
      setData(json)
    }

    fetchData()
  }, [])

  if (!data) return <div style={{ padding: 20 }}>Loading...</div>

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>
        Revenue Overview
      </h1>

      <div style={{ display: "flex", gap: 20 }}>
        <div>
          <h3>Total Revenue</h3>
          <p>${data.totalRevenue.toFixed(2)}</p>
        </div>

        <div>
          <h3>Total Refund</h3>
          <p>${data.totalRefund.toFixed(2)}</p>
        </div>

        <div>
          <h3>Net Revenue</h3>
          <p>${data.netRevenue.toFixed(2)}</p>
        </div>
      </div>

      {/* 🔥 간단 그래프 (막대 형태) */}
      <div style={{ marginTop: 40 }}>
        <div style={{ display: "flex", gap: 40, alignItems: "flex-end", height: 200 }}>
          <div style={{
            width: 60,
            height: data.totalRevenue,
            background: "green"
          }}>
            Revenue
          </div>

          <div style={{
            width: 60,
            height: data.totalRefund,
            background: "red"
          }}>
            Refund
          </div>

          <div style={{
            width: 60,
            height: data.netRevenue,
            background: "blue"
          }}>
            Net
          </div>
        </div>
      </div>
    </div>
  )
}