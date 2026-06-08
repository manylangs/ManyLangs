"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"

const LANG_LABEL: Record<string, string> = {
  kr: "Korean", es: "Spanish", fr: "French", pt: "Portuguese", en: "English",
}

export default function ActivePage() {
  const [days, setDays] = useState(30)
  const [langData, setLangData] = useState<any[] | null>(null)
  const [dateData, setDateData] = useState<any[] | null>(null)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      setLangData(null)
      setDateData(null)
      try {
        const res = await fetch(`/api/admin/licenses?days=${days}`, {
          headers: { "x-admin-email": process.env.NEXT_PUBLIC_ADMIN_EMAIL! },
        })
        const json = await res.json()
        setTotal(json.total || 0)
        setLangData(
          Object.entries(json.langCount || {})
            .map(([lang, count]) => ({ lang: LANG_LABEL[lang] || lang.toUpperCase(), count }))
            .sort((a: any, b: any) => b.count - a.count)
        )
        setDateData(json.dateChart || [])
      } catch (e) { console.error(e); setLangData([]); setDateData([]) }
    }
    fetchData()
  }, [days])

  const btnStyle = (v: number) => ({
    minWidth: 82, minHeight: 48, padding: "12px 18px",
    fontSize: 18, fontWeight: 700, borderRadius: 10,
    border: days === v ? "2px solid #111" : "1px solid #ccc",
    background: days === v ? "#111" : "#fff",
    color: days === v ? "#fff" : "#111",
    cursor: "pointer",
  } as React.CSSProperties)

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/select-books"><button>📚← Back to Library</button></Link>
      </div>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Active Users by Language</h1>
      <div style={{ fontSize: 14, color: "#666", marginBottom: 20 }}>Activations in period: {total}</div>

      <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
        {[7, 30, 365].map((v) => (
          <button key={v} onClick={() => setDays(v)} style={btnStyle(v)}>
            {v === 7 ? "7D" : v === 30 ? "30D" : "1Y"}
          </button>
        ))}
      </div>

      {/* 언어별 차트 */}
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>📊 Activations by Language</h2>
      {!langData ? <div>Loading...</div> : langData.length === 0 ? <div>No data</div> : (
        <>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={langData}>
              <XAxis dataKey="lang" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="Activations" fill="#4f46e5" />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 16, marginBottom: 40 }}>
            {langData.map((d: any) => (
              <div key={d.lang} style={{ padding: "6px 0", borderBottom: "1px solid #eee", fontSize: 14 }}>
                {d.lang} : {d.count}건
              </div>
            ))}
          </div>
        </>
      )}

      {/* 날짜/월별 차트 */}
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>
        📅 Activations by {days <= 30 ? "Date" : "Month"}
      </h2>
      {!dateData ? <div>Loading...</div> : dateData.length === 0 ? <div>No data</div> : (
        <>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={dateData}>
              <XAxis
                dataKey="date"
                interval={days === 365 ? 0 : days === 30 ? 2 : 0}
                tick={{ fontSize: 11 }}
              />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="Activations" fill="#059669" />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 16 }}>
            {dateData.filter(d => d.count > 0).map((d: any) => (
              <div key={d.date} style={{ padding: "6px 0", borderBottom: "1px solid #eee", fontSize: 14 }}>
                {d.date} : {d.count}건
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
