"use client";

const EXPORT_BUTTONS = [
  { label: "Export All Leads",          type: "all",           emoji: "📋" },
  { label: "Export HOT Leads",          type: "hot",           emoji: "🔥" },
  { label: "Export WARM Leads",         type: "warm",          emoji: "🌤️" },
  { label: "Export COLD Leads",         type: "cold",          emoji: "❄️" },
  { label: "Export READY TO SEND",      type: "ready_to_send", emoji: "✉️" },
];

export default function ExportsPage() {
  const handleExport = (type: string, startDate?: string, endDate?: string) => {
    let url = `/api/admin/crm/exports?type=${type}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate)   url += `&endDate=${endDate}`;
    window.location.href = url;
  };

  return (
    <div style={{ padding: 40, maxWidth: 700, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Export System</h1>
      <p style={{ color: "#666", marginBottom: 32 }}>CSV 다운로드 — 최대 5,000건</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 40 }}>
        {EXPORT_BUTTONS.map((btn) => (
          <button
            key={btn.type}
            onClick={() => handleExport(btn.type)}
            style={{
              padding: "14px 20px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "#fff",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 10,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
          >
            <span style={{ fontSize: 20 }}>{btn.emoji}</span>
            {btn.label}
          </button>
        ))}
      </div>

      {/* 날짜 범위 Export */}
      <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>날짜 범위 Export</h2>
        <DateRangeExport onExport={handleExport} />
      </div>
    </div>
  );
}

function DateRangeExport({ onExport }: { onExport: (type: string, s: string, e: string) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.currentTarget);
        onExport("all", fd.get("startDate") as string, fd.get("endDate") as string);
      }}
      style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}
    >
      <label style={{ fontSize: 13 }}>
        시작일<br />
        <input name="startDate" type="date" defaultValue="2026-01-01"
          style={{ marginTop: 4, padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13 }} />
      </label>
      <label style={{ fontSize: 13 }}>
        종료일<br />
        <input name="endDate" type="date" defaultValue={today}
          style={{ marginTop: 4, padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13 }} />
      </label>
      <button type="submit"
        style={{ padding: "8px 20px", borderRadius: 6, background: "#111", color: "#fff", border: "none", fontSize: 13, cursor: "pointer" }}>
        📥 Download
      </button>
    </form>
  );
}