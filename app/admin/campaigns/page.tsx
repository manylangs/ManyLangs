"use client";
import { useEffect, useState } from "react";

interface Campaign {
  id: number;
  campaign_id: string;
  subject: string;
  country?: string;
  city?: string;
  status: string;
  target_count: number;
  created_at: string;
}

interface SendResult {
  success: boolean;
  mode: string;
  campaign_id: string;
  target_count: number;
  sample: { name: string; email: string; status: string }[];
  message: string;
  error?: string;
}

const ALL_VALUE = "ALL";
const ALL_COUNTRY_LABEL = "All Countries";
const ALL_CITY_LABEL = "All Cities";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Scope (country / city) — same pattern as Leads page
  const [countries, setCountries] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);

  // Form state
  const [subject, setSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [country, setCountry] = useState(ALL_VALUE);
  const [city, setCity] = useState(ALL_VALUE);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");

  // Target check state
  const [checking, setChecking] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [readyCount, setReadyCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);

  // Send state
  // NOTE: campaign_id 단위로 관리해야 특정 Campaign만 "Sending..." 상태가 됩니다.
  // (기존에는 boolean 하나를 공유해서 모든 버튼이 동시에 Sending...으로 바뀌는 문제가 있었습니다.)
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/admin/crm/campaigns", {
        cache: "no-store",
      });

      const data = await res.json();

      setCampaigns(data.campaigns ?? []);

      // KPI도 함께 갱신
      setReadyCount(data.kpi?.ready_to_send ?? 0);
      setSentCount(data.kpi?.sent ?? 0);
    } finally {
      setLoading(false);
    }
  };

  const fetchCountries = async () => {
    try {
      const res = await fetch("/api/admin/crm/locations");
      const data = await res.json();
      setCountries(data.countries || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCities = async (selectedCountry: string) => {
    if (selectedCountry === ALL_VALUE) {
      setCities([]);
      return;
    }
    try {
      const params = new URLSearchParams({ country: selectedCountry });
      const res = await fetch(`/api/admin/crm/locations?${params.toString()}`);
      const data = await res.json();
      setCities(data.cities || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchCountries();
  }, []);

  useEffect(() => {
    fetchCities(country);
  }, [country]);

  const handleCheckTarget = async () => {
    setChecking(true);
    setHasChecked(true);

    try {
      const params = new URLSearchParams();

      if (country !== "ALL") {
        params.set("country", country);
      }

      if (city !== "ALL") {
        params.set("city", city);
      }

      const url =
        params.toString().length > 0
          ? `/api/admin/crm/leads?${params.toString()}`
          : "/api/admin/crm/leads";

      const res = await fetch(
        `${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`,
        {
          cache: "no-store",
        }
      );
      const data = await res.json();
      const leads = data.leads ?? [];

      const readyLeads = leads.filter(
        (l: any) => l.campaign_status === "NEW"
      );
      const sentLeads = leads.filter(
        (l: any) => l.campaign_status === "SENT"
      );

      setReadyCount(readyLeads.length);
      setSentCount(sentLeads.length);
    } catch (e) {
      console.error(e);
      setReadyCount(0);
      setSentCount(0);
    } finally {
      setChecking(false);
    }
  };

  const handleCreate = async () => {
    if (!subject.trim() || !emailBody.trim()) {
      setCreateMsg("❌ Subject와 Email Body를 입력하세요.");
      return;
    }
    setCreating(true);
    setCreateMsg("");
    try {
      const res = await fetch("/api/admin/crm/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country,
          city,
          subject,
          body: emailBody,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCreateMsg(`✅ 생성 완료 — ${data.campaign_id} (대상: ${data.target_count}건)`);
        setSubject("");
        setEmailBody("");
        fetchCampaigns();
      } else {
        setCreateMsg(`❌ ${data.error}`);
      }
    } catch (e: any) {
      setCreateMsg(`❌ ${e.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleTestSend = async (campaign_id: string) => {
    // 이미 다른 Campaign이 발송 중이면 중복 실행 방지
    if (sendingId !== null) return;

    setSendingId(campaign_id);
    setSendResult(null);
    try {
      const res = await fetch("/api/admin/crm/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id }),
      });
      const data: SendResult = await res.json();

      setSendResult(data);

      // Campaign History + READY/SENT KPI 갱신
      await fetchCampaigns();
    } catch (e: any) {
      setSendResult({ success: false, mode: "TEST", campaign_id, target_count: 0, sample: [], message: "", error: e.message });
    } finally {
      setSendingId(null);
    }
  };

  const handleReset = async () => {
    if (!confirm("현재 선택한 범위의 SENT를 READY로 되돌리시겠습니까?")) return;

    try {
      const res = await fetch("/api/admin/crm/campaigns/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          country,
          city,
        }),
      });

      const data = await res.json();

      alert(`복구 완료 (${data.updated}건)`);

      await fetchCampaigns();

      if (hasChecked) {
        await handleCheckTarget();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) return <div style={{ padding: 40, color: "#888" }}>Loading...</div>;

  return (
    <div style={{ padding: 40, maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>📧 Campaigns</h1>
      <p style={{ color: "#666", fontSize: 13, marginBottom: 32 }}>
        SES 연결 완료. TEST SEND는 실제 이메일을 발송합니다.
      </p>

      {/* Scope selector */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <label style={labelStyle}>
          Country
          <select
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setCity(ALL_VALUE);
              setHasChecked(false);
            }}
            style={selectStyle}
          >
            <option value={ALL_VALUE}>{ALL_COUNTRY_LABEL}</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          City
          <select
            value={city}
            disabled={country === ALL_VALUE}
            onChange={(e) => {
              setCity(e.target.value);
              setHasChecked(false);
            }}
            style={selectStyle}
          >
            <option value={ALL_VALUE}>{ALL_CITY_LABEL}</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={handleCheckTarget}
          disabled={checking}
          style={{ ...btnPrimary, marginTop: 18, opacity: checking ? 0.6 : 1 }}
        >
          {checking ? "조회 중..." : "🔍 Check Target"}
        </button>
        <button
          onClick={handleReset}
          disabled={sendingId !== null || checking}
          style={{
            ...btnPrimary,
            marginTop: 18,
            background: "#dc2626",
          }}
        >
          ↩ Reset SENT
        </button>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 40 }}>
        {[
          { label: "READY TO SEND", value: hasChecked ? readyCount : 0, color: "#7c3aed" },
          { label: "SENT", value: hasChecked ? sentCount : 0, color: "#16a34a" },
        ].map((c) => (
          <div key={c.label} style={{
            background: c.color, color: "#fff", borderRadius: 12,
            padding: "20px 16px", textAlign: "center",
          }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{c.value.toLocaleString()}</div>
            <div style={{ fontSize: 11, marginTop: 4, opacity: 0.85 }}>{c.label}</div>
          </div>
        ))}
      </div>
      {!hasChecked && (
        <p style={{ color: "#9ca3af", fontSize: 12, marginTop: -28, marginBottom: 32 }}>
          Country / City 선택 후 Check Target을 눌러야 대상 수가 표시됩니다.
        </p>
      )}

      {/* Create Campaign Form */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 28, marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>새 Campaign 생성</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <label style={labelStyle}>
            Country
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setCity(ALL_VALUE);
                setHasChecked(false);
              }}
              style={selectStyle}
            >
              <option value={ALL_VALUE}>{ALL_COUNTRY_LABEL}</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            City
            <select
              value={city}
              disabled={country === ALL_VALUE}
              onChange={(e) => {
                setCity(e.target.value);
                setHasChecked(false);
              }}
              style={selectStyle}
            >
              <option value={ALL_VALUE}>{ALL_CITY_LABEL}</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label style={{ ...labelStyle, display: "block", marginBottom: 16 }}>
          Subject
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="예: ManyLangs Partner Invitation"
            style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
          />
        </label>

        <label style={{ ...labelStyle, display: "block", marginBottom: 20 }}>
          Email Body
          <textarea
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            rows={6}
            placeholder={"안녕하세요,\n\nManyLangs 파트너십 제안드립니다...\n\n감사합니다."}
            style={{ ...inputStyle, width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }}
          />
        </label>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={handleCreate} disabled={creating} style={btnPrimary}>
            {creating ? "생성 중..." : "✅ Campaign 생성"}
          </button>
          {createMsg && (
            <span style={{ fontSize: 13, color: createMsg.startsWith("✅") ? "#16a34a" : "#dc2626" }}>
              {createMsg}
            </span>
          )}
        </div>
      </div>

      {/* Send Result */}
      {sendResult && (
        <div style={{
          border: `1px solid ${sendResult.success ? "#86efac" : "#fca5a5"}`,
          borderRadius: 10,
          padding: 20,
          marginBottom: 32,
          background: sendResult.success ? "#f0fdf4" : "#fef2f2",
          fontSize: 13,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>
            {sendResult.success ? "✅ 이메일 발송 완료" : `❌ 오류: ${sendResult.error}`}
          </div>
          {sendResult.success && (
            <>
              <div>Campaign ID: <strong>{sendResult.campaign_id}</strong></div>
              <div>발송 예정 대상: <strong>{sendResult.target_count}건</strong></div>
              <div style={{ marginTop: 8, color: "#6b7280" }}>{sendResult.message}</div>
              {sendResult.sample.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>샘플 대상 (최대 5건):</div>
                  {sendResult.sample.map((s, i) => (
                    <div key={i} style={{ fontFamily: "monospace", fontSize: 12, color: "#374151" }}>
                      {s.name} — {s.email} [{s.status}]
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Campaign History */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Campaign History</h2>
        {campaigns.length === 0 ? (
          <div style={{ color: "#9ca3af", fontSize: 13 }}>아직 생성된 Campaign이 없습니다.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f3f4f6", borderBottom: "2px solid #e5e7eb" }}>
                  {["Campaign ID", "Subject", "Country", "City", "대상 수", "Status", "Test Send", "생성일"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const isSendingThis = sendingId === c.campaign_id;
                  const isSendingAny = sendingId !== null;

                  const statusColors: Record<string, { bg: string; fg: string }> = {
                    DRAFT: { bg: "#f3f4f6", fg: "#6b7280" },
                    READY: { bg: "#dcfce7", fg: "#16a34a" },
                    SENDING: { bg: "#fef9c3", fg: "#ca8a04" },
                    SENT: { bg: "#dbeafe", fg: "#2563eb" },
                  };
                  const statusStyle = statusColors[c.status] ?? statusColors.DRAFT;

                  return (
                    <tr key={c.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12 }}>{c.campaign_id}</td>
                      <td style={{ padding: "10px 14px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.subject}</td>
                      <td style={{ padding: "10px 14px", color: "#6b7280" }}>{c.country || "—"}</td>
                      <td style={{ padding: "10px 14px", color: "#6b7280" }}>{c.city || "—"}</td>
                      <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 600 }}>{Number(c.target_count).toLocaleString()}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                          background: statusStyle.bg,
                          color: statusStyle.fg,
                        }}>{c.status}</span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <button
                          onClick={() => handleTestSend(c.campaign_id)}
                          disabled={isSendingAny}
                          style={{
                            padding: "4px 12px", borderRadius: 6, border: "1px solid #d1d5db",
                            background: "#fff", fontSize: 12, cursor: isSendingAny ? "not-allowed" : "pointer",
                            opacity: isSendingAny ? 0.5 : 1,
                          }}
                        >
                          {isSendingThis ? "Sending..." : "📧 REAL SEND"}
                        </button>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#9ca3af", fontSize: 11, whiteSpace: "nowrap" }}>
                        {new Date(c.created_at).toLocaleDateString("ko-KR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#374151",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 13,
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  background: "#fff",
  cursor: "pointer",
};

const btnPrimary: React.CSSProperties = {
  padding: "10px 24px",
  borderRadius: 8,
  background: "#111",
  color: "#fff",
  border: "none",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};