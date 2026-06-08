"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"

const LANG_LABEL: Record<string, string> = {
  kr: "Korean", es: "Spanish", fr: "French", pt: "Portuguese", en: "English",
}

export default function ActivePage() {
  const [chartData, setChartData] = useState<any[] | null>(null)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/admin/licenses", {
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
  }, [])

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/select-books"><button>📚← Back to Library</button></Link>
      </div>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Active Textbooks by Language</h1>
      <div style={{ fontSize: 14, color: "#666", marginBottom: 24 }}>Total active: {total}</div>

      {!chartData ? <div>Loading...</div> : chartData.length === 0 ? <div>No data</div> : (
        <>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <XAxis dataKey="lang" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="Active Textbooks" fill="#4f46e5" />
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
