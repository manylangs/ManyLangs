"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"

const LANG_LABEL: Record<string, string> = {
  kr: "Korean", es: "Spanish", fr: "French", pt: "Portuguese", en: "English",
}

export default function ActivePage() {
  const [days, setDays] = useState(30)
  const [chartData, setChartData] = useState<any[] | null>(null)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      setChartData(null)
      try {
        const res = await fetch(`/api/admin/licenses?days=${days}`, {
          headers: { "x-admin-email": process.env.NEXT_PUBLIC_ADMIN_EMAIL! },
        })
        const json = await res.json()
        setTotal(json.total || 0)
        const data = Object.entries(json.langCount || {})
          .map(([lang, count]) => ({ lang: LANG_LABEL[lang] || lang.toUpperCase(), count }))
          .sort((a: any, b: any) => b.count - a.count)
        setChartData(data)
      } catch (e) { console.error(e); setChartData([]) }
    }
    fetchData()
  }, [days])

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/select-books"><button>📚← Back to Library</button></Link>
      </div>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Active Users by Language</h1>
      <div style={{ fontSize: 14, color: "#666", marginBottom: 20 }}>Activations in period: {total}</div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {[7, 30, 365].map((v) => (
          <button key={v} onClick={() => setDays(v)} style={{
            minWidth: 82, minHeight: 48, padding: "12px 18px",
            fontSize: 18, fontWeight: 700, borderRadius: 10,
            border: days === v ? "2px solid #111" : "1px solid #ccc",
            background: days === v ? "#111" : "#fff",
            color: days === v ? "#fff" : "#111", cursor: "pointer",
          }}>
            {v === 7 ? "7D" : v === 30 ? "30D" : "1Y"}
          </button>
        ))}
      </div>

      {!chartData ? <div>Loading...</div> : chartData.length === 0 ? <div>No data</div> : (
        <>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <XAxis dataKey="lang" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="Activations" fill="#4f46e5" />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 24 }}>
            {chartData.map((d: any) => (
              <div key={d.lang} style={{ padding: "8px 0", borderBottom: "1px solid #eee", fontSize: 14 }}>
                {d.lang} : {d.count}건
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
