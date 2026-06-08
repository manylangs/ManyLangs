"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from "recharts"

const LANG_MAP: Record<string, string> = {
  korean: "Korean",
  spanish: "Spanish",
  french: "French",
  portuguese: "Portuguese",
  english: "English",
}

export default function SalesPage() {
  const [days, setDays] = useState(30)
  const [chartData, setChartData] = useState<any[] | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setChartData(null)
      try {
        const res = await fetch(`/api/admin/report?days=${days}`, {
          headers: { "x-admin-email": process.env.NEXT_PUBLIC_ADMIN_EMAIL! },
        })
        const json = await res.json()

        const langMap: Record<string, number> = {}

        ;(json.recentPayments || []).forEach((p: any) => {
          const licenses = json.paymentMap?.[p.id]?.licenses || []
          licenses.forEach((l: any) => {
            if (!l.productId) return
            const [lang] = l.productId.split("_")
            const name = LANG_MAP[lang] || lang?.toUpperCase()
            langMap[name] = (langMap[name] || 0) + (p.amount || 0)
          })
        })

        const data = Object.entries(langMap)
          .map(([lang, amount]) => ({ lang, revenue: amount / 100 }))
          .sort((a, b) => b.revenue - a.revenue)

        setChartData(data)
      } catch (e) {
        console.error(e)
        setChartData([])
      }
    }
    fetchData()
  }, [days])

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/admin"><button style={{ marginRight: 10 }}>← Admin</button></Link>
        <Link href="/select-books"><button>📚← Back to Library</button></Link>
      </div>

      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Sales by Language</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {[7, 30, 365].map((v) => (
          <button
            key={v}
            onClick={() => setDays(v)}
            style={{
              minWidth: 82, minHeight: 48, padding: "12px 18px",
              fontSize: 18, fontWeight: 700, borderRadius: 10,
              border: days === v ? "2px solid #111" : "1px solid #ccc",
              background: days === v ? "#111" : "#fff",
              color: days === v ? "#fff" : "#111",
              cursor: "pointer",
            }}
          >
            {v === 7 ? "7D" : v === 30 ? "30D" : "1Y"}
          </button>
        ))}
      </div>

      {!chartData ? (
        <div>Loading...</div>
      ) : chartData.length === 0 ? (
        <div>No data</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <XAxis dataKey="lang" />
              <YAxis tickFormatter={(v) => `$${Number(v).toLocaleString()}`} />
              <Tooltip formatter={(v: any) => `$${Number(v).toLocaleString()}`} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#4f46e5" />
            </BarChart>
          </ResponsiveContainer>

          <div style={{ marginTop: 24 }}>
            {chartData.map((d) => (
              <div key={d.lang} style={{ padding: "8px 0", borderBottom: "1px solid #eee", fontSize: 14 }}>
                {d.lang} : ${d.revenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
