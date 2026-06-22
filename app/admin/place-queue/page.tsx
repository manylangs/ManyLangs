"use client";

import { useEffect, useState } from "react";

const STATUS_LABELS: Record<string, string> = {
  NEW: "신규 수집",
  DETAILS_DONE: "홈페이지 확보",
  EMAIL_DONE: "이메일 확보",
  HTML_FAILED: "홈페이지 확보 실패",
  EMAIL_NOT_FOUND: "이메일 없음",
};

const CARD_ORDER = [
  "NEW",
  "DETAILS_DONE",
  "EMAIL_DONE",
  "HTML_FAILED",
  "EMAIL_NOT_FOUND",
];

const actionButtonStyle: React.CSSProperties = {
  height: 52,
  padding: "0 22px",
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 14,
};

export default function PlaceQueuePage() {
  const [stats, setStats] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);

  // ── 위치 필터 ──────────────────────────────────────────
  const [countries, setCountries] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);

  const [country, setCountry] = useState("ALL");
  const [city, setCity] = useState("ALL");
  const [selectedCard, setSelectedCard] = useState("ALL");

  // ── 액션 로딩 ──────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [websiteLoading, setWebsiteLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  // ── 국가 목록 로딩 (최초 1회) ──────────────────────────
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const res = await fetch("/api/admin/crm/locations");
        const data = await res.json();
        setCountries(data.countries || []);
      } catch (e) {
        console.error(e);
      }
    };
    loadCountries();
  }, []);

  // ── 도시 목록 로딩 (국가 변경 시) ──────────────────────
  useEffect(() => {
    setCities([]);
    setCity("ALL");

    if (country === "ALL") return;

    const loadCities = async () => {
      try {
        const res = await fetch(
          `/api/admin/crm/locations?country=${encodeURIComponent(country)}`
        );
        const data = await res.json();
        setCities(data.cities || []);
      } catch (e) {
        console.error(e);
      }
    };
    loadCities();
  }, [country]);

  // ── 통계 로딩 ──────────────────────────────────────────
  const loadStats = async () => {
    try {
      const params = new URLSearchParams();
      if (country !== "ALL") params.set("country", country);
      if (city !== "ALL") params.set("city", city);

      const res = await fetch(
        `/api/admin/crm/place-queue/init?${params.toString()}`
      );
      const data = await res.json();
      setStats(data.rows || []);
    } catch (e) {
      console.error(e);
    }
  };

  // ── 행 목록 로딩 ───────────────────────────────────────
  const loadRows = async () => {
    try {
      const params = new URLSearchParams();

      if (country !== "ALL") {
        params.set("country", country);
      }

      if (city !== "ALL") {
        params.set("city", city);
      }

      if (selectedCard !== "ALL") {
        params.set("status", selectedCard);
      }

      const res = await fetch(
        `/api/admin/crm/place-queue/list?${params.toString()}`
      );

      const data = await res.json();

      setRows(data.rows || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadStats();
    loadRows();
  }, [country, city, selectedCard]);

  // ── 액션 ───────────────────────────────────────────────
  const runDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/crm/place-queue/details");
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
      const res = await fetch("/api/admin/crm/place-queue/website");
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
      const res = await fetch("/api/admin/crm/place-queue/extract-email");
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
      const res = await fetch("/api/admin/crm/place-queue/import");
      const data = await res.json();
      setResult(data);
      await loadStats();
    } catch (e) {
      console.error(e);
    }
    setImportLoading(false);
  };

  return (
    <div style={{ padding: 24, maxWidth: 1400 }}>
      <h1>⚙️ Place Queue</h1>

      {/* ── 필터 ── */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginTop: 20,
          marginBottom: 12,
        }}
      >
        {/* 국가 — DB 기반 */}
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        >
          <option value="ALL">전체 국가</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* 도시 — 국가 선택 후 DB 기반 */}
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          disabled={country === "ALL"}
        >
          <option value="ALL">전체 도시</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* ── 현재 선택 표시 ── */}
      <div style={{ marginBottom: 24, color: "#666", fontSize: 14 }}>
        현재 선택: <strong>{country}</strong>
        {city !== "ALL" && (
          <>
            {" "}/ <strong>{city}</strong>
          </>
        )}
      </div>

      {/* ── 통계 카드 (선택 도시 기준) ── */}
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 30,
        }}
      >
        {CARD_ORDER.map((status) => {
          const row = stats.find((r: any) => r.status === status);
          const count = Number(row?.count || 0);

          return (
            <div
              key={status}
              onClick={() =>
                setSelectedCard(selectedCard === status ? "ALL" : status)
              }
              style={{
                border:
                  selectedCard === status
                    ? "2px solid #000"
                    : "1px solid #ddd",
                borderRadius: 12,
                padding: 20,
                minWidth: 180,
                cursor: "pointer",
                background: selectedCard === status ? "#fafafa" : "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: "#666",
                  marginBottom: 8,
                }}
              >
                {STATUS_LABELS[status]}
              </div>

              <div
                style={{
                  fontSize: 34,
                  fontWeight: 700,
                }}
              >
                {count}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 액션 버튼 ── */}
      <div
        style={{
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          marginBottom: 30,
        }}
      >
        <button onClick={runDetails} disabled={loading} style={actionButtonStyle}>
          {loading ? "처리중..." : "🔍 홈페이지 확보"}
        </button>

        <button onClick={runWebsite} disabled={websiteLoading} style={actionButtonStyle}>
          {websiteLoading ? "처리중..." : "🌐 홈페이지 분석"}
        </button>

        <button onClick={runEmail} disabled={emailLoading} style={actionButtonStyle}>
          {emailLoading ? "처리중..." : "📧 이메일 추출"}
        </button>

        <button onClick={runImport} disabled={importLoading} style={actionButtonStyle}>
          {importLoading ? "처리중..." : "📥 CRM 등록"}
        </button>
      </div>

      {/* ── 테이블 ── */}
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
            borderBottom: "1px solid #eee",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          지역별 Queue
          {selectedCard !== "ALL" && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                background: "#f0f0f0",
                borderRadius: 6,
                padding: "2px 10px",
                color: "#444",
              }}
            >
              {STATUS_LABELS[selectedCard]} 필터 중
            </span>
          )}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fafafa" }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Country</th>
              <th style={thStyle}>City</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Website</th>
              <th style={thStyle}>Email</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: 30,
                    textAlign: "center",
                    color: "#999",
                  }}
                >
                  데이터 없음
                </td>
              </tr>
            ) : (
              rows.map((row: any) => (
                <tr key={row.id}>
                  <td style={{ padding: 12 }}>{row.name || "-"}</td>
                  <td style={{ padding: 12 }}>{row.country || "-"}</td>
                  <td style={{ padding: 12 }}>{row.city || "-"}</td>
                  <td style={{ padding: 12 }}>{row.status}</td>
                  <td style={{ padding: 12 }}>
                    {row.website ? "✅" : "-"}
                  </td>
                  <td style={{ padding: 12 }}>
                    {row.email || "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 14px",
  textAlign: "left",
  fontSize: 13,
  fontWeight: 600,
  color: "#555",
  borderBottom: "1px solid #eee",
};