"use client";
import { useEffect, useState } from "react";

interface KPI {
  ready_to_send: number;
  hot: number;
  warm: number;
  cold: number;
}

interface Campaign {
  id: number;
  campaign_id: string;
  subject: string;
  target_type: string;
  country: string;
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

const TARGET_TYPES = ["ALL", "HOT", "WARM", "COLD", "APOLLO", "YOUTUBE"];
const COUNTRIES = ["ALL", "US", "KR", "JP", "GB", "FR", "DE", "ES", "BR", "CA", "AU"];

export default function CampaignsPage() {
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [subject, setSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [targetType, setTargetType] = useState("HOT");
  const [country, setCountry] = useState("ALL");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");

  // Send state
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [sending, setSending] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/crm/campaigns");
      const data = await res.json();
      setKpi(data.kpi);
      setCampaigns(data.campaigns ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

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
        body: JSON.stringify({ subject, email_body: emailBody, target_type: targetType, country }),
      });
      const data = await res.json();
      if (data.success) {
        setCreateMsg(`✅ 생성 완료 — ${data.campaign_id} (대상: ${data.target_count}건)`);
        setSubject("");
        setEmailBody("");
        fetchData();
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
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/admin/crm/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id }),
      });
      const data: SendResult = await res.json();
      setSendResult(data);
      fetchData();
    } catch (e: any) {
      setSendResult({ success: false, mode: "TEST", campaign_id, target_count: 0, sample: [], message: "", error: e.message });
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div style={{ padding: 40, color: "#888" }}>Loading...</div>;

  return (
    <div style={{ padding: 40, maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>📧 Campaigns</h1>
      <p style={{ color: "#666", fontSize: 13, marginBottom: 32 }}>
        SES 승인 전 — TEST MODE 운영 중. 실제 이메일은 발송되지 않습니다.
      </p>

      {/* KPI */}
      {kpi && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 40 }}>
          {[
            { label: "READY TO SEND", value: kpi.ready_to_send, color: "#7c3aed" },
            { label: "HOT",           value: kpi.hot,           color: "#dc2626" },
            { label: "WARM",          value: kpi.warm,          color: "#ea580c" },
            { label: "COLD",          value: kpi.cold,          color: "#2563eb" },
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
      )}

      {/* Create Campaign Form */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 28, marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>새 Campaign 생성</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <label style={labelStyle}>
            Target Type
            <select value={targetType} onChange={(e) => setTargetType(e.target.value)} style={selectStyle}>
              {TARGET_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            Country
            <select value={country} onChange={(e) => setCountry(e.target.value)} style={selectStyle}>
              {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
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
            {sendResult.success ? "✅ TEST MODE 시뮬레이션 완료" : `❌ 오류: ${sendResult.error}`}
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
                  {["Campaign ID", "Subject", "Target", "Country", "대상 수", "Status", "Test Send", "생성일"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12 }}>{c.campaign_id}</td>
                    <td style={{ padding: "10px 14px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.subject}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                        background: c.target_type === "HOT" ? "#fee2e2" : c.target_type === "WARM" ? "#ffedd5" : "#f3f4f6",
                        color: c.target_type === "HOT" ? "#dc2626" : c.target_type === "WARM" ? "#ea580c" : "#374151",
                      }}>{c.target_type}</span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#6b7280" }}>{c.country}</td>
                    <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 600 }}>{Number(c.target_count).toLocaleString()}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                        background: c.status === "READY" ? "#dcfce7" : "#f3f4f6",
                        color: c.status === "READY" ? "#16a34a" : "#6b7280",
                      }}>{c.status}</span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <button
                        onClick={() => handleTestSend(c.campaign_id)}
                        disabled={sending}
                        style={{
                          padding: "4px 12px", borderRadius: 6, border: "1px solid #d1d5db",
                          background: "#fff", fontSize: 12, cursor: sending ? "not-allowed" : "pointer",
                          opacity: sending ? 0.5 : 1,
                        }}
                      >
                        {sending ? "..." : "🧪 Test"}
                      </button>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#9ca3af", fontSize: 11, whiteSpace: "nowrap" }}>
                      {new Date(c.created_at).toLocaleDateString("ko-KR")}
                    </td>
                  </tr>
                ))}
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