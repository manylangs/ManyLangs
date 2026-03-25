"use client";

import Link from "next/link";
import { useViewerTarget } from "@/app/viewer/context/ViewerTargetContext";
import { LANGUAGES } from "@/app/config/languages";
import { useEffect, useState } from "react";

export default function CurriculumPage() {
  const { targetLang, setTargetLang } = useViewerTarget();


  const safeLang = targetLang || "kr";

  const seriesList =
    CURRICULUM[safeLang] || CURRICULUM["kr"];

  return (
    <main style={main}>
      <div style={container}>

        {/* HEADER */}
        <div style={header}>
          <Link href="/" style={linkReset}>
            <button style={backBtn}>← Back</button>
          </Link>

          <div style={headerRight}>
            <button
              onClick={async () => {
                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: "Curriculum",
                      url: window.location.href,
                    });
                  } catch { }
                } else {
                  await navigator.clipboard.writeText(window.location.href);
                  alert("Link copied!");
                }
              }}
              style={copyBtn}
            >
              Copy link
            </button>

            <a href="/app" style={linkReset}>
              <button style={btnHeaderPrimary}>
                Unlock Full Access
              </button>
            </a>
          </div>
        </div>

        {/* TITLE */}
        <h1 style={title}>📚 Curriculum</h1>

        {/* DROPDOWN */}
        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          style={select}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>

        {/* SERIES */}
        <div style={grid}>
          {seriesList.map((s) => (
            <Link
              key={s.key}
              href={`/curriculum/${s.key}/${safeLang}`}
              style={linkReset}
            >
              <div
                style={{
                  ...card,
                  background: s.bg,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow =
                    "0 10px 24px rgba(0,0,0,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 2px 6px rgba(0,0,0,0.04)";
                }}
              >
                <div style={cardTop}>
                  <h3 style={cardTitle}>
                    {s.icon} {s.name}
                  </h3>
                  <span style={arrow}>›</span>
                </div>

                <p style={desc}>{s.desc}</p>

                {s.fixedInfo && (
                  <p style={fixedInfo}>
                    {s.fixedInfo}
                  </p>
                )}

                <div style={meta}>
                  <div>Levels: {s.levels}</div>
                  <div>Chapters: {s.chapters}</div>
                </div>

                <div style={cta}>
                  👉 Tap to explore detailed structure
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </main>
  );
}

/* ================= DATA ================= */

const BASE_SERIES = [
  {
    key: "grammar",
    name: "Grammar",
    icon: "🧩",
    bg: "#f6f8ff",
    desc: "Structured grammar learning from A1 to C2",
    levels: "A1–C2",
  },
  {
    key: "conversation",
    name: "Conversation",
    icon: "🗣️",
    bg: "#f6fff9",
    desc: "Real conversation patterns and dialogues",
    fixedInfo:
      "Each chapter includes 10 dialogue sets (6 lines per set: A×3, B×3).",
    levels: "A1–C2",
  },
  {
    key: "vocabulary",
    name: "Vocabulary",
    icon: "📖",
    bg: "#fffaf6",
    desc: "Core words and usage examples",
    fixedInfo:
      "Each chapter includes 5 words, each with 3 example sentences.",
    levels: "A1–C2",
  },
  {
    key: "idioms",
    name: "Idioms",
    icon: "💬",
    bg: "#f9f6ff",
    desc: "Natural expressions used by natives",
    fixedInfo:
      "Each chapter includes 5 idioms, each with a definition and 5 example sentences.",
    levels: "A2–C2",
  },
  {
    key: "real",
    name: "Real-world usage",
    icon: "🌍",
    bg: "#f6fbff",
    desc: "Situational language for daily life",
    levels: "A1–B2",
  },
];

const CURRICULUM: Record<string, any[]> = {
  kr: BASE_SERIES.map((s) => ({
    ...s,
    chapters: getChapterCount("kr", s.key),
  })),
  en: BASE_SERIES.map((s) => ({
    ...s,
    chapters: getChapterCount("en", s.key),
  })),
};

function getChapterCount(lang: string, series: string) {
  const map: any = {
    kr: {
      grammar: "84",
      conversation: "60",
      vocabulary: "200",
      idioms: "38",
      real: "120",
    },
    en: {
      grammar: "120+",
      conversation: "100+",
      vocabulary: "150+",
      idioms: "110+",
      real: "90+",
    },
  };

  return map[lang]?.[series] || "—";
}

/* ================= STYLE ================= */

const main: React.CSSProperties = {
  background: "#fff",
  minHeight: "100vh",
};

const container: React.CSSProperties = {
  maxWidth: 1000,
  margin: "0 auto",
  padding: "24px 16px 60px",
};

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20,
};

const headerRight: React.CSSProperties = {
  display: "flex",
  gap: 8,
};

const backBtn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
};

const copyBtn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "#f5f5f5",
  cursor: "pointer",
};

const btnHeaderPrimary: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  background: "#111",
  color: "#fff",
  border: "none",
  fontWeight: 600,
};

const title: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  marginBottom: 16,
};

const select: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #ddd",
  marginBottom: 24,
};

const grid: React.CSSProperties = {
  display: "grid",
  gap: 16,
};

const card: React.CSSProperties = {
  borderRadius: 16,
  padding: 18,
  cursor: "pointer",
  transition: "all 0.2s ease",
  border: "1px solid rgba(0,0,0,0.04)",
};

const cardTop: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
};

const cardTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
};

const arrow: React.CSSProperties = {
  fontSize: 18,
  color: "#aaa",
};

const desc: React.CSSProperties = {
  fontSize: 13,
  color: "#666",
  marginTop: 6,
};

const meta: React.CSSProperties = {
  fontSize: 12,
  marginTop: 10,
  color: "#444",
};

const cta: React.CSSProperties = {
  marginTop: 12,
  fontSize: 12,
  color: "#5b6cff",
  fontWeight: 600,
};

const linkReset: React.CSSProperties = {
  textDecoration: "none",
};

const fixedInfo: React.CSSProperties = {
  fontSize: 12,
  color: "#4f46e5",
  marginTop: 6,
  fontWeight: 600,
};