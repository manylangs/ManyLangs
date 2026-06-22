"use client";

import { useEffect, useState } from "react";

export default function PlaceQueuePage() {
  const [stats, setStats] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);

  const [country, setCountry] = useState("ALL");
  const [city, setCity] = useState("ALL");
  const [district, setDistrict] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedCard, setSelectedCard] = useState("ALL");

  const [loading, setLoading] = useState(false);
  const [websiteLoading, setWebsiteLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

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

  const runDetails = async () => {
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

  const runWebsite = async () => {
    setWebsiteLoading(true);

    try {
      const res = await fetch(
        "/api/admin/crm/place-queue/website"
      );

      const data = await res.json();

      setResult(data);

      await loadStats();
    } catch (e) {
      console.error(e);
    }

    setWebsiteLoading(false);
  };

  const runEmail = async () => {
    setEmailLoading(true);

    try {
      const res = await fetch(
        "/api/admin/crm/place-queue/extract-email"
      );

      const data = await res.json();

      setResult(data);

      await loadStats();
    } catch (e) {
      console.error(e);
    }

    setEmailLoading(false);
  };

  const runImport = async () => {
    setImportLoading(true);

    try {
      const res = await fetch(
        "/api/admin/crm/place-queue/import"
      );

      const data = await res.json();

      setResult(data);

      await loadStats();
    } catch (e) {
      console.error(e);
    }

    setImportLoading(false);
  };

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 1400,
      }}
    >
      <h1>⚙️ Place Queue</h1>

      {/* Filters */}

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginTop: 20,
          marginBottom: 24,
        }}
      >
        <select
          value={country}
          onChange={(e) =>
            setCountry(e.target.value)
          }
        >
          <option>ALL</option>
          <option>Argentina</option>
          <option>Brazil</option>
          <option>Korea</option>
        </select>

        <select
          value={city}
          onChange={(e) =>
            setCity(e.target.value)
          }
        >
          <option>ALL</option>
          <option>Buenos Aires</option>
          <option>Sao Paulo</option>
          <option>Seoul</option>
        </select>

        <select
          value={district}
          onChange={(e) =>
            setDistrict(e.target.value)
          }
        >
          <option>ALL</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
        >
          <option>ALL</option>
          <option>NEW</option>
          <option>DETAILS_DONE</option>
          <option>HTML_DONE</option>
          <option>EMAIL_DONE</option>
          <option>EMAIL_NOT_FOUND</option>
          <option>HTML_FAILED</option>
        </select>
      </div>

      {/* Status Cards */}

      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 30,
        }}
      >
        {stats.map((row: any) => (
          <div
            key={row.status}
            onClick={() =>
              setSelectedCard(row.status)
            }
            style={{
              border:
                selectedCard === row.status
                  ? "2px solid #000"
                  : "1px solid #ddd",

              borderRadius: 10,
              padding: 16,
              minWidth: 160,
              cursor: "pointer",
              background:
                selectedCard === row.status
                  ? "#fafafa"
                  : "#fff",
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
                fontSize: 30,
                fontWeight: 700,
                marginTop: 6,
              }}
            >
              {row.count}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 30,
        }}
      >
        <button
          onClick={runDetails}
          disabled={loading}
        >
          {loading
            ? "Running Details..."
            : "Run Details"}
        </button>

        <button
          onClick={runWebsite}
          disabled={websiteLoading}
        >
          {websiteLoading
            ? "Running Website..."
            : "Run Website"}
        </button>

        <button
          onClick={runEmail}
          disabled={emailLoading}
        >
          {emailLoading
            ? "Running Email..."
            : "Run Email"}
        </button>

        <button
          onClick={runImport}
          disabled={importLoading}
        >
          {importLoading
            ? "Running Import..."
            : "Run Import"}
        </button>
      </div>

      {/* Queue Table Placeholder */}

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 14,
            fontWeight: 700,
            borderBottom:
              "1px solid #eee",
          }}
        >
          Queue Items
        </div>

        <table
          style={{
            width: "100%",
            borderCollapse:
              "collapse",
          }}
        >
          <thead>
            <tr>
              <th>Name</th>
              <th>Country</th>
              <th>City</th>
              <th>Status</th>
              <th>Website</th>
              <th>Email</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td
                colSpan={6}
                style={{
                  padding: 30,
                  textAlign: "center",
                  color: "#999",
                }}
              >
                API 연결 예정
              </td>
            </tr>
          </tbody>
        </table>
      </div>

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
            {JSON.stringify(
              result,
              null,
              2
            )}
          </pre>
        </div>
      )}
    </div>
  );
}