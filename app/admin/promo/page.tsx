"use client";

import { useState } from "react";
import Link from "next/link";
import { PROMO_LANGUAGES } from "./languages";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL!;
const DAY_MS = 1000 * 60 * 60 * 24;

const REGIONS = [
  // 영어권
  { code: "US", label: "US - United States" },
  { code: "GB", label: "GB - United Kingdom" },
  { code: "CA", label: "CA - Canada" },
  { code: "AU", label: "AU - Australia" },
  { code: "NZ", label: "NZ - New Zealand" },
  { code: "PH", label: "PH - Philippines" },
  { code: "NG", label: "NG - Nigeria" },
  { code: "ZA", label: "ZA - South Africa" },
  { code: "GH", label: "GH - Ghana" },
  { code: "KE", label: "KE - Kenya" },
  { code: "IN", label: "IN - India" },
  { code: "SG", label: "SG - Singapore" },
  { code: "IE", label: "IE - Ireland" },
  // 스페인어권
  { code: "MX", label: "MX - Mexico" },
  { code: "CO", label: "CO - Colombia" },
  { code: "AR", label: "AR - Argentina" },
  { code: "ES", label: "ES - Spain" },
  { code: "PE", label: "PE - Peru" },
  { code: "VE", label: "VE - Venezuela" },
  { code: "CL", label: "CL - Chile" },
  { code: "EC", label: "EC - Ecuador" },
  { code: "GT", label: "GT - Guatemala" },
  { code: "CU", label: "CU - Cuba" },
  { code: "BO", label: "BO - Bolivia" },
  { code: "DO", label: "DO - Dominican Republic" },
  { code: "HN", label: "HN - Honduras" },
  { code: "PY", label: "PY - Paraguay" },
  { code: "SV", label: "SV - El Salvador" },
  { code: "NI", label: "NI - Nicaragua" },
  { code: "CR", label: "CR - Costa Rica" },
  { code: "PA", label: "PA - Panama" },
  { code: "UY", label: "UY - Uruguay" },
  // 포르투갈어권
  { code: "BR", label: "BR - Brazil" },
  { code: "PT", label: "PT - Portugal" },
  { code: "AO", label: "AO - Angola" },
  { code: "MZ", label: "MZ - Mozambique" },
  // 프랑스어권
  { code: "FR", label: "FR - France" },
  { code: "BE", label: "BE - Belgium" },
  { code: "CH", label: "CH - Switzerland" },
  { code: "SN", label: "SN - Senegal" },
  { code: "CI", label: "CI - Ivory Coast" },
  { code: "CM", label: "CM - Cameroon" },
  { code: "MG", label: "MG - Madagascar" },
  { code: "BF", label: "BF - Burkina Faso" },
];

type Campaign = {
  code: string;
  region: string | null;
  language: string | null;
  dateStr: string;
  startAt: number;
  endAt: number;
  durationDays: number;
  usedCount: number;
  createdAtMs: number;
};

type StatsData = {
  campaigns: Campaign[];
  languageRegionStats: Record<string, number>;
  dateStats: Record<string, number>;
  totalActivations: number;
};

export default function AdminPromoPage() {
  const [region, setRegion] = useState("BR");
  const [language, setLanguage] = useState("KOREAN");
  const [durationDays, setDurationDays] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [stats, setStats] = useState<StatsData | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const now = Date.now();

  async function handleGenerate() {
    if (generating) return;
    setGenerating(true);
    setNewCode(null);

    try {
      const res = await fetch("/api/admin/promo/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": ADMIN_EMAIL,
        },
        body: JSON.stringify(
          durationDays === 7
            ? {
              language,
              durationDays,
            }
            : {
              region,
              durationDays,
            }
        ),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to generate");
        return;
      }

      setNewCode(data.code);
      await fetchStats();
    } catch {
      alert("Network error");
    } finally {
      setGenerating(false);
    }
  }

  async function fetchStats() {
    setLoadingStats(true);

    try {
      const res = await fetch("/api/admin/promo/stats", {
        headers: { "x-admin-email": ADMIN_EMAIL },
      });

      const data = await res.json();

      if (res.ok) {
        setStats(data);
      } else {
        alert(data.error || "Failed to fetch stats");
      }
    } catch {
      alert("Network error");
    } finally {
      setLoadingStats(false);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // 날짜별 막대 그래프 폭 계산에 쓰이는 최댓값 (dateStats가 비어있어도 안전)
  const maxDateCount = Math.max(1, ...Object.values(stats?.dateStats ?? {}));

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/select-books">
          <button style={{ marginRight: 10 }}>📚← Back to Library</button>
        </Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: "bold", marginBottom: 24 }}>
        Promo Campaign Manager
      </h1>

      {/* ===== 생성 섹션 ===== */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 20,
          marginBottom: 32,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          Generate Campaign Code
        </h2>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>

          <label style={{ fontSize: 14, color: "#6b7280" }}>Duration</label>
          <select
            value={durationDays}
            onChange={(e) => setDurationDays(Number(e.target.value))}
            style={{
              padding: "6px 10px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 14,
            }}
          >
            <option value={7}>7 days</option>
            <option value={10}>10 days</option>
            <option value={14}>14 days</option>
          </select>
          {durationDays === 7 ? (
            <>
              <label style={{ fontSize: 14, color: "#6b7280" }}>Language</label>

              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{
                  padding: "6px 10px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
                  minWidth: 220,
                }}
              >
                {PROMO_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                style={{
                  padding: "6px 10px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
                  minWidth: 220,
                }}
              >
                {REGIONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>
            </>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              padding: "8px 20px",
              background: generating ? "#9ca3af" : "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: generating ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {generating ? "Generating..." : "Generate"}
          </button>
        </div>

        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>
          Format: 7D = PROMO-MMDD-LANGUAGE · 10D/14D = PROMO-MMDD-REGION
        </p>

        {newCode && (
          <div
            style={{
              marginTop: 16,
              padding: 16,
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 20,
                fontWeight: 700,
                color: "#16a34a",
                letterSpacing: 2,
              }}
            >
              {newCode}
            </span>

            <button
              onClick={() => copyCode(newCode)}
              style={{
                padding: "6px 14px",
                fontSize: 13,
                border: "1px solid #d1d5db",
                borderRadius: 5,
                cursor: "pointer",
                background: copied ? "#dcfce7" : "white",
              }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
      </div>

      {/* ===== 통계 섹션 ===== */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>
            Campaign Stats
            {stats && (
              <span style={{ fontSize: 13, color: "#6b7280", marginLeft: 8 }}>
                (Total: {stats.totalActivations} activations)
              </span>
            )}
          </h2>

          <button
            onClick={fetchStats}
            disabled={loadingStats}
            style={{
              padding: "6px 14px",
              fontSize: 13,
              border: "1px solid #d1d5db",
              borderRadius: 5,
              cursor: loadingStats ? "not-allowed" : "pointer",
              background: "white",
            }}
          >
            {loadingStats ? "Loading..." : "Refresh Stats"}
          </button>
        </div>

        {!stats && !loadingStats && (
          <p style={{ fontSize: 14, color: "#9ca3af" }}>
            Click Refresh Stats to load data.
          </p>
        )}
        {stats && (
          <>
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 24,
              }}
            >
              {Object.entries(stats?.languageRegionStats ?? {})
                .sort((a, b) => b[1] - a[1])
                .map(([r, count]) => {
                  const label =
                    PROMO_LANGUAGES.find((x) => x.code === r)?.name ??
                    REGIONS.find((x) => x.code === r)?.label ??
                    r;

                  return (
                    <div
                      key={r}
                      style={{
                        padding: "12px 20px",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        minWidth: 140,
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        {label}
                      </div>

                      <div style={{ fontSize: 22, fontWeight: 700 }}>
                        {count}
                      </div>
                    </div>
                  );
                })}
            </div>
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                By Date
              </h3>
              {Object.entries(stats?.dateStats ?? {})
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([date, count]) => (
                  <div
                    key={date}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 6,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: "#6b7280", width: 50 }}>
                      {date.slice(0, 2)}/{date.slice(2)}
                    </span>
                    <div
                      style={{
                        height: 16,
                        background: "#2563eb",
                        borderRadius: 4,
                        width: Math.max(4, (count / maxDateCount) * 200),
                      }}
                    />
                    <span style={{ fontWeight: 600 }}>{count}</span>
                  </div>
                ))}
            </div>

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr
                    style={{
                      background: "#f9fafb",
                      fontSize: 13,
                      color: "#6b7280",
                    }}
                  >
                    <th style={{ padding: "10px 16px", textAlign: "left" }}>Code</th>
                    <th style={{ padding: "10px 16px", textAlign: "left" }}>Language / Region</th>
                    <th style={{ padding: "10px 16px", textAlign: "left" }}>Activations</th>
                    <th style={{ padding: "10px 16px", textAlign: "left" }}>Status</th>
                    <th style={{ padding: "10px 16px", textAlign: "left" }}>Expires</th>
                  </tr>
                </thead>

                <tbody>
                  {stats?.campaigns?.map((c, i) => {
                    const daysLeft = Math.ceil((c.endAt - now) / DAY_MS);
                    const isActive = now < c.endAt;
                    const key = c.language ?? c.region;

                    const label =
                      PROMO_LANGUAGES.find((x) => x.code === key)?.name ??
                      REGIONS.find((x) => x.code === key)?.label ??
                      key;

                    return (
                      <tr
                        key={c.code}
                        style={{
                          borderTop: i === 0 ? "none" : "1px solid #f3f4f6",
                          fontSize: 13,
                          background: isActive ? "white" : "#fafafa",
                        }}
                      >
                        <td
                          style={{
                            padding: "10px 16px",
                            fontFamily: "monospace",
                            fontWeight: 600,
                          }}
                        >
                          {c.code}
                        </td>

                        <td style={{ padding: "10px 16px" }}>
                          <span
                            style={{
                              padding: "2px 8px",
                              background: "#eff6ff",
                              color: "#2563eb",
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            {label}
                          </span>
                        </td>

                        <td style={{ padding: "10px 16px", fontWeight: 700 }}>
                          {c.usedCount}
                        </td>

                        <td style={{ padding: "10px 16px" }}>
                          {isActive ? (
                            <span style={{ color: "#16a34a", fontWeight: 600 }}>
                              Active
                            </span>
                          ) : (
                            <span style={{ color: "#9ca3af" }}>Expired</span>
                          )}
                        </td>

                        <td style={{ padding: "10px 16px", color: "#6b7280" }}>
                          {isActive
                            ? `${daysLeft}d left`
                            : new Date(c.endAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}