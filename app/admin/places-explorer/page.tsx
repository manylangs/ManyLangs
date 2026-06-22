"use client";

import { useState } from "react";

export default function PlacesExplorerPage() {
  const [country, setCountry] = useState("South Korea");
  const [city, setCity] = useState("Seoul");
  const [district, setDistrict] = useState("Gangnam");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runExplorer = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/admin/crm/places-explorer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          country,
          city,
          district,
        }),
      });

      const json = await res.json();

      setResult(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1
        style={{
          fontSize: 24,
          marginBottom: 20,
        }}
      >
        Places Explorer
      </h1>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <input
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="Country"
          style={{
            padding: 8,
            width: 220,
            border: "1px solid #ddd",
            borderRadius: 6,
          }}
        />

        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
          style={{
            padding: 8,
            width: 220,
            border: "1px solid #ddd",
            borderRadius: 6,
          }}
        />

        <input
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          placeholder="District"
          style={{
            padding: 8,
            width: 220,
            border: "1px solid #ddd",
            borderRadius: 6,
          }}
        />

        <button
          onClick={runExplorer}
          disabled={loading}
        >
          {loading ? "Running..." : "Run Explorer"}
        </button>
      </div>

      {result && (
        <div
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: 16,
          }}
        >
          <div>
            <strong>Country</strong>
            <br />
            {result.country}
          </div>

          <div>
            <strong>City</strong>
            <br />
            {result.city}
          </div>

          <div>
            <strong>District</strong>
            <br />
            {result.district}
          </div>

          <div>
            <strong>Found</strong>
            <br />
            {result.found ?? 0}
          </div>

          <div>
            <strong>Added</strong>
            <br />
            {result.added ?? 0}
          </div>

          <div>
            <strong>Total In Term</strong>
            <br />
            {result.totalInTerm ?? 0}
          </div>
        </div>
      )}
    </div>
  );
}