"use client";

import { useEffect, useState } from "react";

export default function PlaceQueuePage() {
  const [stats, setStats] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    try {
      const res = await fetch(
        "/api/admin/crm/place-queue/init"
      );

      const data = await res.json();

      setStats(data.rows || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const runWorker = async () => {
    setLoading(true);

    try {
      const res = await fetch(
        "/api/admin/crm/place-queue/details"
      );

      const data = await res.json();

      setResult(data);

      await loadStats();
    } catch (e) {
      console.error(e);
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <h1>⚙️ Place Queue</h1>

      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 20,
          marginBottom: 30,
          flexWrap: "wrap",
        }}
      >
        {stats.map((row: any) => (
          <div
            key={row.status}
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 16,
              minWidth: 140,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "#666",
              }}
            >
              {row.status}
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              {row.count}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={runWorker}
        disabled={loading}
        style={{
          padding: "12px 20px",
          borderRadius: 8,
          border: "1px solid #ddd",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        {loading
          ? "Running Details Worker..."
          : "Run Details Worker"}
      </button>

      {result && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: 8,
            background: "#fafafa",
          }}
        >
          <h3>Last Run Result</h3>

          <pre
            style={{
              overflow: "auto",
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}