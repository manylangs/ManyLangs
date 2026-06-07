// ===== [START] revenue page =====
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

type RevenueData = {
  month: string
  revenue: number
  refund: number
  net: number
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData[] | null>(null)
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

  if (!data) {
    return <div style={{ padding: 20 }}>Loading...</div>
  }

  if (data.length === 0) {
    return <div style={{ padding: 20 }}>No data</div>
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/select-books">
          <button style={{ marginRight: 10 }}>
            📚← Back to Library
          </button>
        </Link>
      </div>

      <h1
        style={{
          fontSize: 24,
          marginBottom: 20,
        }}
      >
        Revenue Dashboard
      </h1>

      <div
        style={{
          marginBottom: 24,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {[7, 30, 365].map((value) => (
          <button
            key={value}
            onClick={() => setDays(value)}
            style={{
              minWidth: 82,
              minHeight: 48,
              padding: "12px 18px",
              fontSize: 18,
              fontWeight: 700,
              borderRadius: 10,
              border:
                days === value
                  ? "2px solid #111"
                  : "1px solid #ccc",
              background:
                days === value
                  ? "#111"
                  : "#fff",
              color:
                days === value
                  ? "#fff"
                  : "#111",
              cursor: "pointer",
            }}
          >
            {value === 7
              ? "7D"
              : value === 30
                ? "30D"
                : "1Y"}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data}>
          <XAxis dataKey="month" />

          <YAxis
            tickFormatter={(value) =>
              `$${Number(value).toLocaleString()}`
            }
          />

          <Tooltip
            formatter={(value: any) =>
              `$${Number(value).toLocaleString()}`
            }
          />

          <Legend />

          <Bar
            dataKey="revenue"
            name="Revenue"
            fill="green"
          />

          <Bar
            dataKey="refund"
            name="Refund"
            fill="red"
          />

          <Bar
            dataKey="net"
            name="Net Revenue"
            fill="blue"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
// ===== [END] revenue page =====