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

        if (days === 365) {
          // 1Y: monthlyRevenue 사용, 이번달 포함되도록 집계
          // API의 monthlyRevenue가 현재달을 포함하므로 그대로 사용
          setData(
            (json.monthlyRevenue || []).map((m: any) => ({
              month: m.month, // "2026-06" 형식
              revenue: m.amount / 100,
              refund: 0,
              net: m.amount / 100,
            }))
          )
        } else {
          // 7D / 30D: 날짜별 집계 (하루씩 막대)
          const dayCount = days
          const now = Date.now()

          // 날짜 슬롯 미리 생성 (오늘 포함 dayCount일)
          const slots: Record<string, number> = {}
          for (let i = dayCount - 1; i >= 0; i--) {
            const d = new Date(now - i * 24 * 60 * 60 * 1000)
            const label = d.toLocaleDateString("en-US", {
              month: "numeric",
              day: "numeric",
            })
            slots[label] = 0
          }

          const cutoff = now - dayCount * 24 * 60 * 60 * 1000

            ; (json.recentPayments || [])
              .filter((p: any) => p.created * 1000 >= cutoff)
              .forEach((p: any) => {
                const label = new Date(p.created * 1000).toLocaleDateString("en-US", {
                  month: "numeric",
                  day: "numeric",
                })
                if (label in slots) {
                  slots[label] = (slots[label] || 0) + (p.amount || 0)
                }
              })

          const sorted = Object.entries(slots).map(([date, amount]) => ({
            month: date,
            revenue: amount / 100,
            refund: 0,
            net: amount / 100,
          }))

          setData(sorted)
        }
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

      <h1 style={{ fontSize: 24, marginBottom: 20 }}>
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
              border: days === value ? "2px solid #111" : "1px solid #ccc",
              background: days === value ? "#111" : "#fff",
              color: days === value ? "#fff" : "#111",
              cursor: "pointer",
            }}
          >
            {value === 7 ? "7D" : value === 30 ? "30D" : "1Y"}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data}>
          <XAxis
            dataKey="month"
            tick={{ fontSize: days === 30 ? 10 : 12 }}
            interval={days === 30 ? 2 : 0}
          />

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

          <Bar dataKey="revenue" name="Revenue" fill="green" />
          <Bar dataKey="refund" name="Refund" fill="red" />
          <Bar dataKey="net" name="Net Revenue" fill="blue" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
// ===== [END] revenue page =====