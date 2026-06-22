"use client";

import { useState } from "react";

export default function PlacesExplorerPage() {
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
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>
        Places Explorer
      </h1>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          style={{
            padding: 8,
            width: 300,
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
        <pre
          style={{
            marginTop: 20,
            background: "#f5f5f5",
            padding: 16,
            borderRadius: 8,
            overflow: "auto",
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}