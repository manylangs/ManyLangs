"use client"

import { useEffect, useState } from "react"

type Lead = {
  id: number
  school_name: string
  website: string
  email: string
  country: string
  lead_type: string
  lead_status: string
  lead_score: number
  campaign_status: string
  source: string
}

const STATUS_COLOR: Record<string, string> = {
  HOT: "#ef4444",
  WARM: "#f97316",
  COLD: "#3b82f6",
  BLOCKED: "#9ca3af",
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("ALL")
  const [scoring, setScoring] = useState(false)
  const [message, setMessage] = useState("")

  const fetchLeads = async (status = "ALL") => {
    setLoading(true)
    try {
      const url = status === "ALL" ? "/api/admin/crm/leads" : `/api/admin/crm/leads?status=${status}`
      const res = await fetch(url)
      const json = await res.json()
      setLeads(json.leads || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLeads(filter) }, [filter])

  const handleScore = async () => {
    setScoring(true)
    setMessage("")
    try {
      const res = await fetch("/api/admin/crm/leads/score", { method: "POST" })
      const json = await res.json()
      setMessage(`✅ ${json.updated} leads scored`)
      fetchLeads(filter)
    } catch {
      setMessage("❌ Scoring 실패")
    } finally {
      setScoring(false)
    }
  }

  const filterBtn = (label: string, value: string) => (
    <button
      key={value}
      onClick={() => setFilter(value)}
      style={{
        padding: "5px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer",
        background: filter === value ? "#111" : "#f5f5f5",
        color: filter === value ? "#fff" : "#444",
        border: "1px solid", borderColor: filter === value ? "#111" : "#ddd",
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, marginBottom: 20 }}>🎯 Leads</h1>

      {/* 액션 바 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {filterBtn("ALL", "ALL")}
        {filterBtn("🔴 HOT", "HOT")}
        {filterBtn("🟠 WARM", "WARM")}
        {filterBtn("🔵 COLD", "COLD")}
        {filterBtn("⬜ BLOCKED", "BLOCKED")}

        <div style={{ flex: 1 }} />

        <button
          onClick={handleScore}
          disabled={scoring}
          style={{
            padding: "6px 16px", borderRadius: 6, fontSize: 13,
            background: "#111", color: "#fff", border: "none", cursor: "pointer"
          }}
        >
          {scoring ? "Scoring..." : "⚡ Score All"}
        </button>
      </div>

      {message && <div style={{ marginBottom: 12, fontSize: 13, color: "#333" }}>{message}</div>}

      {/* 테이블 */}
      {loading ? <div>Loading...</div> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              {["School", "Email", "Country", "Type", "Score", "Status", "Campaign"].map(h => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #eee" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 16, color: "#999" }}>No leads found</td></tr>
            ) : leads.map(l => (
              <tr key={l.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "8px 12px", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <a href={l.website} target="_blank" rel="noreferrer" style={{ color: "#111", textDecoration: "none" }}>
                    {l.school_name || l.website}
                  </a>
                </td>
                <td style={{ padding: "8px 12px", fontSize: 12, color: "#555" }}>{l.email || "-"}</td>
                <td style={{ padding: "8px 12px" }}>{l.country || "-"}</td>
                <td style={{ padding: "8px 12px", fontSize: 11, color: "#888" }}>{l.lead_type}</td>
                <td style={{ padding: "8px 12px", fontWeight: 600 }}>{l.lead_score}</td>
                <td style={{ padding: "8px 12px" }}>
                  <span style={{
                    background: STATUS_COLOR[l.lead_status] || "#ccc",
                    color: "#fff", padding: "2px 8px", borderRadius: 4, fontSize: 11
                  }}>
                    {l.lead_status}
                  </span>
                </td>
                <td style={{ padding: "8px 12px", fontSize: 11, color: "#888" }}>{l.campaign_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
