"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const actionButtonStyle: React.CSSProperties = {
  height: 40,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 14,
};

export default function PlaceQueuePage() {

  const [metrics, setMetrics] = useState({
    placeIds: 0,
    websites: 0,
    newEmails: 0,
    totalEmails: 0,
  });

  const [result, setResult] = useState<any>(null);

  // ── 위치 필터 ──────────────────────────────────────────
  const [countries, setCountries] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);

  const [country, setCountry] = useState("ALL");
  const [city, setCity] = useState("ALL");

  // ── 액션 로딩 ──────────────────────────────────────────
  const [loading, setLoading] = useState(false);
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

      if (
        country === "ALL" ||
        city === "ALL"
      ) {
        setMetrics({
          placeIds: 0,
          websites: 0,
          newEmails: 0,
          totalEmails: 0,
        });
        return;
      }

      const params = new URLSearchParams();

      params.set("country", country);
      params.set("city", city);

      const res = await fetch(
        `/api/admin/crm/place-queue/init?${params.toString()}`
      );

      const data = await res.json();

      setMetrics({
        placeIds: data.placeIds || 0,
        websites: data.websites || 0,
        newEmails: data.newEmails || 0,
        totalEmails: data.totalEmails || 0,
      });

    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadStats();
  }, [country, city]);

  const runProcess = async () => {
    setLoading(true);

    try {
      let totalWebsite = 0;
      let totalEmail = 0;

      while (true) {
        const params = new URLSearchParams();

        params.set("country", country);
        params.set("city", city);

        const res = await fetch(
          `/api/admin/crm/place-queue/process?${params.toString()}`
        );

        const data = await res.json();

        totalWebsite +=
          data.websiteProcessed || 0;

        totalEmail +=
          data.emailProcessed || 0;

        if (!data.hasMore) {
          break;
        }
      }

      setResult({
        success: true,
        websiteProcessed: totalWebsite,
        emailProcessed: totalEmail,
      });

      await loadStats();
    } catch (e) {
      console.error(e);
    }

    setLoading(false);
  };

  const runImport = async () => {
    setImportLoading(true);
    try {
      const params = new URLSearchParams();

      params.set("country", country);
      params.set("city", city);

      const res = await fetch(
        `/api/admin/crm/place-queue/import?${params.toString()}`
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
    <div style={{ padding: 24, maxWidth: 1400 }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/select-books">
          <button style={{ marginRight: 10 }}>
            📚← Back to Library
          </button>
        </Link>
      </div>
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
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 30,
        }}
      >
        {[
          ["PLACE IDS", metrics.placeIds],
          ["WEBSITES", metrics.websites],
          ["NEW EMAILS", metrics.newEmails],
          ["TOTAL EMAILS", metrics.totalEmails],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 12,
              minWidth: 160,
              background: "#fff",
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
              {label}
            </div>

            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              {value}
            </div>
          </div>
        ))}
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
        <button
          onClick={runProcess}
          disabled={
            country === "ALL" ||
            city === "ALL" ||
            loading
          }
          style={actionButtonStyle}
        >
          {loading ? "처리중..." : "⚙️ Process Queue"}
        </button>

        <button
          onClick={runImport}
          disabled={
            country === "ALL" ||
            city === "ALL" ||
            importLoading
          }
          style={actionButtonStyle}
        >
          {importLoading ? "처리중..." : "📥 CRM 등록"}
        </button>
      </div>

    </div>
  );
}
