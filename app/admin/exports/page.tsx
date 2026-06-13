"use client";
import { useState } from "react";

interface ExportBtn {
  label: string;
  type: string;
  emoji: string;
  desc: string;
}

const EXPORTS: ExportBtn[] = [
  { label: "Export All Leads",         type: "all",           emoji: "📋", desc: "전체 리드" },
  { label: "Export HOT Leads",         type: "hot",           emoji: "🔥", desc: "점수 70+ 리드" },
  { label: "Export WARM Leads",        type: "warm",          emoji: "🌤️", desc: "점수 40–69 리드" },
  { label: "Export COLD Leads",        type: "cold",          emoji: "❄️", desc: "점수 10–39 리드" },
  { label: "Export APOLLO Leads",      type: "apollo",        emoji: "🚀", desc: "Apollo 소스 리드" },
  { label: "Export READY TO SEND",     type: "ready_to_send", emoji: "✉️", desc: "이메일 발송 준비 완료" },
];

export default function ExportsPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate]   = useState("");

  const download = async (type: string) => {
    setLoading(type);
    try {
      const params = new URLSearchParams({ type });
      if (startDate) params.set("startDate", startDate);
      if (endDate)   params.set("endDate",   endDate);

      const res  = await fetch(`/api/admin/crm/exports?${params}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${type}_leads_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Export 실패");
    } finally {
      setLoading(null);
    }
  };

  const btnStyle = (active: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "14px 20px",
    borderRadius: 10,
    border: "1px solid #e0e0e0",
    background: active ? "#f0f0f0" : "#fff",
    cursor: active ? "not-allowed" : "pointer",
    opacity: active ? 0.6 : 1,
    width: "100%",
    textAlign: "left",
  });

  return (
    <div style={{ padding: 32, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Export System</h1>
      <p style={{ color: "#666", marginBottom: 28, fontSize: 14 }}>
        Turso CRM 데이터를 CSV로 다운로드합니다. 최대 5,000건.
      </p>

      {/* 날짜 필터 */}
      <div style={{ display: "flex", gap: 12, marginBottom: 28, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>시작일 (선택)</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ border: "1px solid #ddd", borderRadius: 6, padding: "6px 10px", fontSize: 13 }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>종료일 (선택)</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ border: "1px solid #ddd", borderRadius: 6, padding: "6px 10px", fontSize: 13 }}
          />
        </div>
        {(startDate || endDate) && (
          <button
            onClick={() => { setStartDate(""); setEndDate(""); }}
            style={{ marginTop: 18, fontSize: 12, color: "#999", background: "none", border: "none", cursor: "pointer" }}
          >
            ✕ 초기화
          </button>
        )}
      </div>

      {/* Export 버튼 목록 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {EXPORTS.map((ex) => {
          const active = loading === ex.type;
          return (
            <button key={ex.type} style={btnStyle(active)} onClick={() => download(ex.type)} disabled={!!loading}>
              <span style={{ fontSize: 22 }}>{ex.emoji}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{ex.label}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{ex.desc}</div>
              </div>
              {active && (
                <span style={{ marginLeft: "auto", fontSize: 12, color: "#666" }}>다운로드 중...</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}