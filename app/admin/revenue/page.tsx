// ===== [START] revenue page =====
"use client"

import { useEffect, useState } from "react"
import Link from "next/link";

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
  const [data, setData] = useState<Monthly[] | null>(null)
  const [days, setDays] = useState(30)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/admin/report?days=${days}`, {
          headers: {
            "x-admin-email": process.env.NEXT_PUBLIC_ADMIN_EMAIL!,
          },
        })

        const json = await res.json()
        setData(
  (json.monthlyRevenue || []).map((m: any) => ({
    month: m.month,
    revenue: m.amount / 100,
    refund: 0,
    net: m.amount / 100,
  }))
)
      } catch (e) {
        console.error(e)
        setData([])
      }
    }

    fetchData()
  }, [days])

  // 🔥 로딩
  if (!data) return <div style={{ padding: 20 }}>Loading...</div>

  // 🔥 데이터 없음
  if (data.length === 0) {
    return <div style={{ padding: 20 }}>No data</div>
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/select-books">
          <button style={{ marginRight: 10 }}>📚← Back to Library</button>
        </Link>
      </div>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>
        Revenue Dashboard
      </h1>

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
// ===== [END] revenue page =====