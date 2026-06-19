"use client"

import { useState } from "react"

export default function PlacesPage() {
  const [query, setQuery] = useState("language school seoul")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])

  const collect = async () => {
    setLoading(true)

    try {
      const res = await fetch("/api/admin/crm/places", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query })
      })

      const json = await res.json()

      setResults(json.results || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, marginBottom: 20 }}>
        🌎 Google Places
      </h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: 400,
            padding: 8,
            border: "1px solid #ddd",
            borderRadius: 6
          }}
        />

        <button
          onClick={collect}
          disabled={loading}
          style={{
            padding: "8px 16px",
            background: "#111",
            color: "#fff",
            border: "none",
            borderRadius: 6
          }}
        >
          {loading ? "Collecting..." : "Collect"}
        </button>
      </div>

      <div>
        {results.map((r, i) => (
          <div
            key={i}
            style={{
              padding: 12,
              border: "1px solid #eee",
              borderRadius: 8,
              marginBottom: 10
            }}
          >
            <div><b>{r.displayName?.text}</b></div>
            <div>{r.websiteUri}</div>
            <div>{r.formattedAddress}</div>
            <div>{r.internationalPhoneNumber}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
