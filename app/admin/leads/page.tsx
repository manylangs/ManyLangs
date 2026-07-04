"use client"

import { useEffect, useState } from "react"
import Link from "next/link";

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

  // ── 수동 등록 → 파일 생성기 ──────────────────────────────────────
  const [manualOpen, setManualOpen] = useState(false)
  const [manualText, setManualText] = useState("")
  const [manualTitle, setManualTitle] = useState("")
  const [manualCountry, setManualCountry] = useState("Select Country")
  const [manualCity, setManualCity] = useState("Select City")
  const [manualCities, setManualCities] = useState<string[]>(["Select City"])
  const [manualGeneratedMsg, setManualGeneratedMsg] = useState<string | null>(null)

  const sanitizeForFilename = (input: string): string => {
    return input
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .slice(0, 40) || "batch"
  }

  const canGenerateFile =
    manualText.trim().length > 0 &&
    manualTitle.trim().length > 0 &&
    manualCountry !== "Select Country" &&
    manualCity !== "Select City"

  const handleGenerateFile = () => {
    if (!canGenerateFile) return

    // ↓↓↓ 파일 이름 조합 로직 (Country_City_제목.txt) ↓↓↓
    const filename = `${sanitizeForFilename(manualCountry)}_${sanitizeForFilename(
      manualCity
    )}_${sanitizeForFilename(manualTitle)}.txt`
    // ↑↑↑ 파일 이름 조합 로직 ↑↑↑

    const blob = new Blob([manualText], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setManualGeneratedMsg(
      `✅ ${filename} 다운로드 완료. Campaigns 페이지의 "📁 파일로 캠페인 생성"에 업로드하세요.`
    )
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
      <div style={{ marginBottom: 20 }}>
        <Link href="/select-books">
          <button style={{ marginRight: 10 }}>
            📚← Back to Library
          </button>
        </Link>
      </div>
      <h1 style={{ fontSize: 22, marginBottom: 20 }}>
        🎯 Leads
      </h1>

      {/* 수동 등록 → 파일 생성기 */}
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
          {manualOpen ? "▾" : "▸"} 📄 이메일 → 파일 생성 (File Generator)
        </button>

        {manualOpen && (
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>
              한 줄에 이메일 하나씩 붙여넣으세요. Country/City/제목(카테고리)을 정하면
              <code> Country_City_제목.txt</code> 형식의 파일이 다운로드됩니다.
              그 파일을 Campaigns 페이지의 <strong>"📁 파일로 캠페인 생성"</strong>에 업로드하면
              중복/가짜 이메일 필터링과 함께 해당 제목으로 캠페인이 자동 생성됩니다.
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

            <input
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="제목 / 카테고리 (예: 영어학원, 스페인어학원, 한국어학원)"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: 6,
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
                onClick={handleGenerateFile}
                disabled={!canGenerateFile}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  background: !canGenerateFile ? "#ccc" : "#111",
                  color: "#fff",
                  cursor: !canGenerateFile ? "not-allowed" : "pointer",
                }}
              >
                📄 파일 생성
              </button>
            </div>

            {manualGeneratedMsg && (
              <div style={{ fontSize: 13, color: "#16a34a" }}>
                {manualGeneratedMsg}
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
                    <a
                      href={l.website}
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