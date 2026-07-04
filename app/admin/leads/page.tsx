"use client"

import { useEffect, useState } from "react"

type Lead = {
  id: number
  school_name: string
  website: string
  email: string
  country: string
  city: string
  campaign_status: string
  source: string
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const [country, setCountry] = useState("Select Country")
  const [city, setCity] = useState("Select City")

  const [countries, setCountries] = useState<string[]>([
    "Select Country",
  ])

  const [cities, setCities] = useState<string[]>([
    "Select City",
  ])

  // ── 수동 이메일 등록 ─────────────────────────────────────────────
  const [manualOpen, setManualOpen] = useState(false)
  const [manualText, setManualText] = useState("")
  const [manualCountry, setManualCountry] = useState("Select Country")
  const [manualCity, setManualCity] = useState("Select City")
  const [manualCities, setManualCities] = useState<string[]>(["Select City"])
  const [manualSubmitting, setManualSubmitting] = useState(false)
  const [manualResult, setManualResult] = useState<{
    imported: number
    duplicated: number
    invalid_count: number
  } | null>(null)

  const handleManualSubmit = async () => {
    if (!manualText.trim()) return

    setManualSubmitting(true)
    setManualResult(null)

    try {
      const res = await fetch("/api/admin/crm/leads/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: manualText,
          country: manualCountry === "Select Country" ? "" : manualCountry,
          city: manualCity === "Select City" ? "" : manualCity,
        }),
      })

      const json = await res.json()

      if (json.success) {
        setManualResult({
          imported: json.imported ?? 0,
          duplicated: json.duplicated ?? 0,
          invalid_count: json.invalid_count ?? 0,
        })
        setManualText("")

        // 현재 검색 조건이 있으면 목록 새로고침
        if (hasSearched) {
          fetchLeads(country, city)
        }
      } else {
        alert(`등록 실패: ${json.error || "알 수 없는 오류"}`)
      }
    } catch (e) {
      console.error(e)
      alert("등록 중 오류가 발생했습니다.")
    } finally {
      setManualSubmitting(false)
    }
  }

  const fetchLeads = async (
    selectedCountry = "Select Country",
    selectedCity = "Select City"
  ) => {
    setLoading(true)
    setHasSearched(true)

    try {
      const params = new URLSearchParams()

      if (selectedCountry !== "Select Country") {
        params.set("country", selectedCountry)
      }

      if (selectedCity !== "Select City") {
        params.set("city", selectedCity)
      }

      const url =
        params.toString().length > 0
          ? `/api/admin/crm/leads?${params.toString()}`
          : "/api/admin/crm/leads"

      const res = await fetch(url)
      const json = await res.json()

      setLeads(json.leads || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const res = await fetch(
          "/api/admin/crm/locations"
        )

        const json = await res.json()

        setCountries([
          "Select Country",
          ...(json.countries || []),
        ])
      } catch (e) {
        console.error(e)
      }
    }

    loadCountries()
  }, [])

  useEffect(() => {
    const loadCities = async () => {
      try {
        setCities(["Select City"])
        setCity("Select City")

        if (country === "Select Country") {
          return
        }

        const res = await fetch(
          `/api/admin/crm/locations?country=${encodeURIComponent(
            country
          )}`
        )

        const json = await res.json()

        setCities([
          "Select City",
          ...(json.cities || []),
        ])
      } catch (e) {
        console.error(e)
      }
    }

    loadCities()
  }, [country])

  useEffect(() => {
    const loadManualCities = async () => {
      try {
        setManualCities(["Select City"])
        setManualCity("Select City")

        if (manualCountry === "Select Country") {
          return
        }

        const res = await fetch(
          `/api/admin/crm/locations?country=${encodeURIComponent(
            manualCountry
          )}`
        )

        const json = await res.json()

        setManualCities([
          "Select City",
          ...(json.cities || []),
        ])
      } catch (e) {
        console.error(e)
      }
    }

    loadManualCities()
  }, [manualCountry])

  const getDisplayName = (l: Lead) => {
    if (l.school_name) return l.school_name
    try {
      return new URL(l.website).hostname
    } catch {
      return l.website
    }
  }

  const totalLeads = hasSearched
    ? leads.length
    : 0

  const newLeads = hasSearched
    ? leads.filter(
      (l) => l.campaign_status === "NEW"
    ).length
    : 0

  const sentLeads = hasSearched
    ? leads.filter(
      (l) => l.campaign_status === "SENT"
    ).length
    : 0

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, marginBottom: 20 }}>
        🎯 Leads
      </h1>

      {/* 수동 이메일 등록 */}
      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 8,
          marginBottom: 20,
          overflow: "hidden",
        }}
      >
        <button
          onClick={() => setManualOpen((v) => !v)}
          style={{
            width: "100%",
            textAlign: "left",
            padding: "12px 16px",
            background: "#fafafa",
            border: "none",
            borderBottom: manualOpen ? "1px solid #eee" : "none",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {manualOpen ? "▾" : "▸"} ✍️ 수동으로 이메일 등록 (Manual Add)
        </button>

        {manualOpen && (
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>
              한 줄에 이메일 하나씩 붙여넣으세요. <code>이메일,이름</code> 형식으로 이름도 함께 넣을 수 있습니다.
              등록된 이메일은 <strong>campaign_status = NEW</strong> 상태로 저장되어, Campaigns 페이지에서 바로 캠페인 생성/발송 대상이 됩니다.
            </div>

            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder={"jane@example.com\njohn@example.com, John's School"}
              rows={6}
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #ddd",
                borderRadius: 6,
                fontFamily: "monospace",
                fontSize: 13,
                marginBottom: 10,
                boxSizing: "border-box",
              }}
            />

            <div style={{ display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
              <select
                value={manualCountry}
                onChange={(e) => setManualCountry(e.target.value)}
                style={{
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  fontSize: 13,
                }}
              >
                {countries.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>

              <select
                value={manualCity}
                disabled={manualCountry === "Select Country"}
                onChange={(e) => setManualCity(e.target.value)}
                style={{
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  fontSize: 13,
                }}
              >
                {manualCities.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>

              <button
                onClick={handleManualSubmit}
                disabled={manualSubmitting || !manualText.trim()}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  background: manualSubmitting || !manualText.trim() ? "#ccc" : "#111",
                  color: "#fff",
                  cursor: manualSubmitting || !manualText.trim() ? "not-allowed" : "pointer",
                }}
              >
                {manualSubmitting ? "등록 중..." : "등록"}
              </button>
            </div>

            {manualResult && (
              <div style={{ fontSize: 13, color: "#333" }}>
                ✅ 신규 등록 {manualResult.imported}건 · 중복 제외 {manualResult.duplicated}건
                {manualResult.invalid_count > 0 && (
                  <span style={{ color: "#c0392b" }}>
                    {" "}· 형식 오류 {manualResult.invalid_count}건 (무시됨)
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <select
          value={country}
          onChange={(e) => {
            setCountry(e.target.value)
            setCity("Select City")
          }}
        >
          {countries.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <select
          value={city}
          disabled={country === "Select Country"}
          onChange={(e) => setCity(e.target.value)}
        >
          {cities.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <button
          disabled={
            country === "Select Country" ||
            city === "Select City"
          }
          onClick={() => fetchLeads(country, city)}
          style={{
            padding: "8px 16px",
            border: "1px solid #ddd",
            borderRadius: 6,
            background:
              country === "Select Country" ||
                city === "Select City"
                ? "#ccc"
                : "#111",
            color: "#fff",
            cursor:
              country === "Select Country" ||
                city === "Select City"
                ? "not-allowed"
                : "pointer",
          }}
        >
          Search
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(180px,1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            padding: 16,
            border: "1px solid #eee",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>
            TOTAL LEADS
          </div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>
            {totalLeads}
          </div>
        </div>

        <div
          style={{
            padding: 16,
            border: "1px solid #eee",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>
            NEW LEADS
          </div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>
            {newLeads}
          </div>
        </div>

        <div
          style={{
            padding: 16,
            border: "1px solid #eee",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>
            SENT LEADS
          </div>

          <div style={{ fontSize: 24, fontWeight: 700 }}>
            {sentLeads}
          </div>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : !hasSearched ? (
        <div
          style={{
            padding: 24,
            color: "#666",
            textAlign: "center",
            border: "1px solid #eee",
            borderRadius: 8,
          }}
        >
          Select Country and Search
        </div>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
          }}
        >
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              {[
                "School",
                "Email",
                "Country",
                "City",
                "Campaign Status",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "8px 12px",
                    textAlign: "left",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: 16,
                    color: "#999",
                  }}
                >
                  No leads found
                </td>
              </tr>
            ) : (
              leads.map((l) => (
                <tr
                  key={l.id}
                  style={{
                    borderBottom:
                      "1px solid #f0f0f0",
                  }}
                >
                  <td
                    style={{
                      padding: "8px 12px",
                      maxWidth: 250,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >

                    <a href={l.website}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {getDisplayName(l)}
                    </a>
                  </td>

                  <td
                    style={{
                      padding: "8px 12px",
                    }}
                  >
                    {l.email}
                  </td>

                  <td
                    style={{
                      padding: "8px 12px",
                    }}
                  >
                    {l.country}
                  </td>

                  <td
                    style={{
                      padding: "8px 12px",
                    }}
                  >
                    {l.city}
                  </td>

                  <td
                    style={{
                      padding: "8px 12px",
                    }}
                  >
                    {l.campaign_status}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}