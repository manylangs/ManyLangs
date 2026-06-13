"use client"

import { useEffect, useState } from "react"

type Stats = {
  total_sent: number
  total_opened: number
  total_clicked: number
  total_opens: number
  total_clicks: number
  open_rate: number
  click_rate: number
}

type TrackRow = {
  tracking_id: string
  email: string
  campaign_id: string
  open_count: number
  click_count: number
  opened_at: string
  clicked_at: string
  created_at: string
}

export default function TrackingPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [rows, setRows] = useState<TrackRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch("/api/admin/crm/tracking")
        const json = await res.json()
        setStats(json.stats)
        setRows(json.rows || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetch_()
  }, [])

  const StatCard = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 8, minWidth: 120 }}>
      <div style={{ fontSize: 12, color: "#888" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#aaa" }}>{sub}</div>}
    </div>
  )

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, marginBottom: 20 }}>📊 Tracking</h1>

      {/* 통계 카드 */}
      {stats && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
          <StatCard label="Sent" value={stats.total_sent} />
          <StatCard label="Opened" value={stats.total_opened} sub={`${stats.open_rate}%`} />
          <StatCard label="Clicked" value={stats.total_clicked} sub={`${stats.click_rate}%`} />
          <StatCard label="Total Opens" value={stats.total_opens} sub="중복 포함" />
          <StatCard label="Total Clicks" value={stats.total_clicks} sub="중복 포함" />
        </div>
      )}

      {/* 퍼널 바 */}
      {stats && stats.total_sent > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, color: "#555", marginBottom: 8 }}>Funnel</div>
          {[
            { label: "Sent", value: stats.total_sent, color: "#6366f1" },
            { label: "Opened", value: stats.total_opened, color: "#22c55e" },
            { label: "Clicked", value: stats.total_clicked, color: "#f97316" },
          ].map(item => (
            <div key={item.label} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                <span>{item.label}</span>
                <span>{item.value}</span>
              </div>
              <div style={{ background: "#f0f0f0", borderRadius: 4, height: 8 }}>
                <div style={{
                  width: `${(item.value / stats.total_sent) * 100}%`,
                  background: item.color,
                  height: 8,
                  borderRadius: 4,
                  transition: "width 0.4s"
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 상세 테이블 */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            {["Email", "Campaign", "Opens", "Clicks", "First Open", "First Click", "Sent At"].map(h => (
              <th key={h} style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #eee" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={7} style={{ padding: 16, color: "#999" }}>No tracking data</td></tr>
          ) : rows.map(r => (
            <tr key={r.tracking_id} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ padding: "8px 12px", fontSize: 12 }}>{r.email}</td>
              <td style={{ padding: "8px 12px", fontSize: 11, color: "#888" }}>{r.campaign_id}</td>
              <td style={{ padding: "8px 12px", fontWeight: r.open_count > 0 ? 700 : 400, color: r.open_count > 0 ? "#22c55e" : "#ccc" }}>{r.open_count}</td>
              <td style={{ padding: "8px 12px", fontWeight: r.click_count > 0 ? 700 : 400, color: r.click_count > 0 ? "#f97316" : "#ccc" }}>{r.click_count}</td>
              <td style={{ padding: "8px 12px", fontSize: 11, color: "#888" }}>{r.opened_at?.slice(0, 16) || "-"}</td>
              <td style={{ padding: "8px 12px", fontSize: 11, color: "#888" }}>{r.clicked_at?.slice(0, 16) || "-"}</td>
              <td style={{ padding: "8px 12px", fontSize: 11, color: "#aaa" }}>{r.created_at?.slice(0, 16)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
