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
  const [loading, setLoading] = useState(true)

  const [country, setCountry] = useState("ALL")
  const [city, setCity] = useState("ALL")

  const [countries, setCountries] = useState<string[]>(["ALL"])
  const [cities, setCities] = useState<string[]>(["ALL"])

  const fetchLeads = async (
    selectedCountry = "ALL",
    selectedCity = "ALL"
  ) => {
    setLoading(true)

    try {
      const params = new URLSearchParams()

      if (selectedCountry !== "ALL") {
        params.set("country", selectedCountry)
      }

      if (selectedCity !== "ALL") {
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

  const fetchScope = async (selectedCountry = "ALL") => {
    try {
      const params = new URLSearchParams()

      if (selectedCountry !== "ALL") {
        params.set("country", selectedCountry)
      }

      const url =
        params.toString().length > 0
          ? `/api/admin/crm/place-queue/init?${params.toString()}`
          : "/api/admin/crm/place-queue/init"

      const res = await fetch(url)
      const json = await res.json()

      setCountries(["ALL", ...(json.countries || [])])
      setCities(["ALL", ...(json.cities || [])])
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchScope("ALL")
  }, [])

  useEffect(() => {
    if (country !== "ALL") {
      fetchScope(country)
    }
  }, [country])

  useEffect(() => {
    fetchLeads(country, city)
  }, [country, city])

  const getDisplayName = (l: Lead) => {
    if (l.school_name) return l.school_name
    try {
      return new URL(l.website).hostname
    } catch {
      return l.website
    }
  }

  const totalLeads = leads.length

  const newLeads = leads.filter(
    (l) => l.campaign_status === "NEW"
  ).length

  const contactedLeads = leads.filter(
    (l) => l.campaign_status !== "NEW"
  ).length

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, marginBottom: 20 }}>
        🎯 Leads
      </h1>

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
            setCity("ALL")
          }}
        >
          {countries.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          {cities.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
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
            CONTACTED
          </div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>
            {contactedLeads}
          </div>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
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