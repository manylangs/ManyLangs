"use client"

import { useEffect, useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

type Monthly = {
  month: string
  revenue: number
  refund: number
  net: number
}

export default function RevenuePage() {
  const [data, setData] = useState<Monthly[]>([])
  const [days, setDays] = useState(30)

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(`/api/admin/report?days=${days}`, {
        headers: {
          "x-admin-email": process.env.NEXT_PUBLIC_ADMIN_EMAIL!,
        },
      })

      const json = await res.json()
      setData(json.monthlyRevenue || [])
    }

    fetchData()
  }, [days])

  if (!data.length) return <div style={{ padding: 20 }}>Loading...</div>

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>
        Revenue Dashboard
      </h1>
      <button
        onClick={() => window.location.href = "/select-books"}
        style={{ marginBottom: 20 }}
      >
        ← Back to Library
      </button>
      {/* ✅ 날짜 필터 */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setDays(7)}>7D</button>{" "}
        <button onClick={() => setDays(30)}>30D</button>{" "}
        <button onClick={() => setDays(365)}>1Y</button>
      </div>

      {/* ✅ recharts 그래프 */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />

          <Bar dataKey="revenue" fill="green" />
          <Bar dataKey="refund" fill="red" />
          <Bar dataKey="net" fill="blue" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}