"use client";

import Link from "next/link";
import { useState } from "react";
import type { CSSProperties } from "react";

import { LANGUAGES } from "@/app/config/languages";

const demoData = [
  { category: "Vocabulary", desc: "Learn essential words", icon: "📘", items: [{ title: "A1 - Chapter 1", series: "voca" }] },
  { category: "Grammar", desc: "Understand sentence structures", icon: "🧠", items: [{ title: "A1 - Chapter 1", series: "grammar" }] },
  { category: "Conversation", desc: "Practice dialogues", icon: "💬", items: [{ title: "A1 - Chapter 1", series: "conversation" }] },
  { category: "Idioms", desc: "Learn expressions", icon: "🎭", items: [{ title: "A1 - Chapter 1", series: "idiom" }] },
  { category: "Real Situations", desc: "Real-life language", icon: "🌍", items: [{ title: "A1 - Chapter 1", series: "real" }] },
];

export default function DemoPage() {
  const [lang, setLang] = useState("kr");

  return (
    <main style={container}>
      <div style={wrapper}>

        {/* HEADER */}
        <div style={headerRow}>
          <Link href="/">
            <span style={linkReset}>
              <button style={btnBack}>← Back</button>
            </span>
          </Link>

          <div style={headerActions}>
            <button
              onClick={async () => {
                if (navigator.share) {
                  try {
                    await navigator.share({ title: "Try Demo", url: window.location.href });
                  } catch { }
                } else {
                  await navigator.clipboard.writeText(window.location.href);
                  alert("Link copied!");
                }
              }}
              style={btnSecondary}
            >
              Copy link
            </button>

            <a href="/app" style={linkReset}>
              <button type="button" style={btnHeaderPrimary}>
                Unlock Full Access
              </button>
            </a>

          </div>
        </div>

        {/* INFO */}
        <div style={infoBox}>
          <p style={infoText}>You're viewing sample content.</p>

          {/* 🔥 hydration 안전 */}
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
                <Link
                  key={item.series}
                  href={`/demo/viewer/${lang}/${item.series}/a1/001?mode=demo`}
                  style={card}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)";
                  }}
                >
                  <div>
                    <h3 style={cardTitle}>
                      {lang.toUpperCase()} {item.title}
                    </h3>
                    <p style={cardMeta}>Beginner • A1</p>
                  </div>

                  <p style={cardHint}>Start learning →</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

/* ================= styles ================= */

const selectStyle: CSSProperties = {
  marginTop: 10,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #ddd",
};

const container: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  background: "#fafafa",
};

const wrapper: CSSProperties = {
  width: "100%",
  maxWidth: 900,
  padding: "clamp(20px, 4vw, 40px)",
};

const headerRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 16,
};

const headerActions: CSSProperties = {
  display: "flex",
  gap: 8,
};

const infoBox: CSSProperties = { marginBottom: 24 };
const infoText: CSSProperties = { color: "#555" };

const sectionWrap: CSSProperties = { marginBottom: 32 };

const sectionHeader: CSSProperties = {
  display: "flex",
  gap: 12,
  marginBottom: 12,
};

const iconStyle: CSSProperties = { fontSize: 22 };

const sectionTitle: CSSProperties = { fontWeight: 600 };
const sectionDesc: CSSProperties = { color: "#777" };

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};

const card: CSSProperties = {
  padding: 20,
  border: "1px solid #e5e5e5",
  borderRadius: 14,
  background: "#fff",
  transition: "all 0.2s ease",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

const cardTitle: CSSProperties = { fontWeight: 600 };
const cardMeta: CSSProperties = { fontSize: 12, color: "#999" };
const cardHint: CSSProperties = { marginTop: 12, color: "#666" };

const btnPrimary: CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  background: "#111",
  color: "#fff",
  border: "none",
};

const btnSecondary: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #eee",
  background: "#fff",
};

const btnBack: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #eee",
};

const linkReset: CSSProperties = {
  textDecoration: "none",
};
const btnHeaderPrimary: React.CSSProperties = {
  padding: "8px 14px",
  fontSize: 13,
  borderRadius: 8,
  background: "#111",
  color: "#fff",
  border: "none",
  fontWeight: 600,
  whiteSpace: "nowrap",
  minWidth: 150, // 🔥 핵심 (길게)
};