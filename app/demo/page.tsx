"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { copyLink } from "@/utils/share";
import { LANGUAGES } from "@/app/config/languages";

const demoData = [
  { category: "Vocabulary", desc: "Learn essential words", icon: "📘", bg: "#fffaf6", items: [{ title: "A1 - Chapter 1", series: "voca" }] },
  { category: "Grammar", desc: "Understand sentence structures", icon: "🧠", bg: "#f6f8ff", items: [{ title: "A1 - Chapter 1", series: "grammar" }] },
  { category: "Conversation", desc: "Practice dialogues", icon: "💬", bg: "#f6fff9", items: [{ title: "A1 - Chapter 1", series: "conversation" }] },
  { category: "Idioms", desc: "Learn expressions", icon: "🎭", bg: "#f9f6ff", items: [{ title: "A1 - Chapter 1", series: "idiom" }] },
  { category: "Real Situations", desc: "Real-life language", icon: "🌍", bg: "#f6fbff", items: [{ title: "A1 - Chapter 1", series: "real" }] },
];

export default function DemoPage() {
  const [lang, setLang] = useState("kr");

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copyLink(undefined, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <main style={container}>
      <div style={wrapper}>

        {/* HEADER */}
        <div style={{ ...headerRow, position: "relative", zIndex: 10 }}>
          <button
            type="button"
            onClick={() => { window.location.href = "/"; }}
            style={btnBack}
          >
            ← Back
          </button>

          <div style={headerActions}>
            <button
              type="button"
              onClick={handleCopy}
              style={btnSecondary}
            >
              Copy link
            </button>
            <button
              type="button"
              onClick={() => { window.location.href = "/app"; }}
              style={btnHeaderPrimary}
            >
              Unlock Full Access
            </button>
          </div>
        </div>

        {/* INFO */}
        <div style={infoBox}>
          <p style={infoText}>You're viewing sample content.</p>

          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            style={selectStyle}
            suppressHydrationWarning
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {/* CONTENT */}
        {demoData.map((section) => (
          <div key={section.category} style={sectionWrap}>
            <div style={sectionHeader}>
              <div style={iconStyle}>{section.icon}</div>
              <div>
                <h2 style={sectionTitle}>{section.category}</h2>
                <p style={sectionDesc}>{section.desc}</p>
              </div>
            </div>

            <div style={grid}>
              {section.items.map((item) => (
                <div
                  key={item.series}
                  onClick={() => {
                    window.location.href = `/demo/viewer/${lang}/${item.series}/a1/001?mode=demo`;
                  }}
                  style={{
                    ...card,
                    background: section.bg,
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 10px 24px rgba(0,0,0,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 6px rgba(0,0,0,0.04)";
                  }}
                >
                  <div>
                    <h3 style={cardTitle}>
                      {lang.toUpperCase()} {item.title}
                    </h3>
                    <p style={cardMeta}>Beginner • A1</p>
                  </div>

                  <p style={cardHint}>👉 Start learning</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {copied && (
        <div
          style={{
            position: "fixed",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#111",
            color: "#fff",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 13,
            zIndex: 9999,
          }}
        >
          Link copied
        </div>
      )}
    </main>
  );
}

/* ================= styles ================= */

const container: CSSProperties = {
  minHeight: "100dvh",
  display: "flex",
  justifyContent: "center",
  background: "#fff",
};

const wrapper: CSSProperties = {
  width: "100%",
  maxWidth: 900,
  padding: "clamp(20px, 4vw, 40px)",
};

const headerRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 20,
};

const headerActions: CSSProperties = {
  display: "flex",
  gap: 8,
};

const btnBack: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
  textDecoration: "none",
};

const btnSecondary: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "#f5f5f5",
  cursor: "pointer",
};

const btnHeaderPrimary: CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  background: "#111",
  color: "#fff",
  border: "none",
  fontWeight: 600,
  cursor: "pointer",
};

const infoBox: CSSProperties = {
  marginBottom: 28,
};

const infoText: CSSProperties = {
  color: "#555",
  marginBottom: 8,
};

const selectStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
};

const sectionWrap: CSSProperties = {
  marginBottom: 36,
};

const sectionHeader: CSSProperties = {
  display: "flex",
  gap: 12,
  marginBottom: 14,
};

const iconStyle: CSSProperties = {
  fontSize: 22,
};

const sectionTitle: CSSProperties = {
  fontWeight: 700,
  fontSize: 18,
};

const sectionDesc: CSSProperties = {
  color: "#777",
  fontSize: 13,
};

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};

const card: CSSProperties = {
  padding: 20,
  borderRadius: 16,
  border: "1px solid rgba(0,0,0,0.04)",
  transition: "all 0.2s ease",
  boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
};

const cardTitle: CSSProperties = {
  fontWeight: 600,
};

const cardMeta: CSSProperties = {
  fontSize: 12,
  color: "#888",
};

const cardHint: CSSProperties = {
  marginTop: 12,
  fontSize: 13,
  color: "#5b6cff",
  fontWeight: 600,
};