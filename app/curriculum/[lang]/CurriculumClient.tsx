"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LANGUAGES } from "@/app/config/languages";
import { copyLink } from "@/utils/share";

export default function CurriculumClient({ lang }: { lang: string }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  // URL is the single source of truth — no Context, no localStorage,
  // no ?lang= query param. If an unsupported code ever slips into the
  // URL we still render (falling back to English data) instead of
  // crashing.
  const safeLang = lang || "en";
  const languageNames: Record<string, string> = {
    kr: "Korean",
    en: "English",
    es: "Spanish",
    fr: "French",
    pt: "Portuguese",
  };
  const seriesList = CURRICULUM[safeLang] || CURRICULUM["en"];

  const handleCopy = () => {
    copyLink(`${window.location.origin}/curriculum/${safeLang}`, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleLangChange = (nextLang: string) => {
    router.push(`/curriculum/${nextLang}`);
  };

  return (
    <main style={main}>
      <div style={container}>
        {/* HEADER */}
        <div style={headerWrap}>
          {/* 🔥 1줄: Sign In / Create Account — 좌우 꽉 채움 */}
          <div style={authRow}>
            <Link href="/login" style={{ flex: 1, textDecoration: "none" }}>
              <button type="button" style={{ ...btnBack, width: "100%" }}>
                Sign In
              </button>
            </Link>

            <Link href="/signup" style={{ flex: 1, textDecoration: "none" }}>
              <button type="button" style={{ ...btnHeaderPrimary, width: "100%" }}>
                Create Account
              </button>
            </Link>
          </div>

          {/* 🔥 2줄: Back / Copy link */}
          <div style={secondaryRow}>
            <Link href="/" style={linkReset}>
              <button type="button" style={btnBack}>
                ← Back
              </button>
            </Link>

            <button type="button" onClick={handleCopy} style={btnSecondary}>
              Copy link
            </button>
          </div>
        </div>

        {/* TITLE */}
        <h1 style={title}>📚 Curriculum</h1>

        {/* DROPDOWN */}
        <select
          value={safeLang}
          onChange={(e) => handleLangChange(e.target.value)}
          style={select}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
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
                    {s.icon} {languageNames[safeLang]} {s.name}
                  </h3>
                  <span style={arrow}>›</span>
                </div>

                <p style={desc}>{s.desc}</p>

                {s.fixedInfo && <p style={fixedInfo}>{s.fixedInfo}</p>}

                <div style={meta}>
                  <div>Levels: {s.levels}</div>
                  <div>Chapters: {s.chapters}</div>
                </div>

                <div style={cta}>👉 Tap to explore detailed structure</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ===== [START toast] ===== */}
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
      {/* ===== [END toast] ===== */}
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
    fixedInfo: "Each chapter includes 5 words, each with 3 example sentences.",
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
    levels: "A1–C2",
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
      grammar: "210",
      conversation: "60",
      vocabulary: "144",
      idioms: "42",
      real: "120",
    },
    en: {
      grammar: "155",
      conversation: "60",
      vocabulary: "144",
      idioms: "42",
      real: "120",
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

const baseBtn: React.CSSProperties = {
  height: 32,
  padding: "0 10px",
  fontSize: 12,
  lineHeight: 1,
  borderRadius: 8,

  WebkitAppearance: "none",
  appearance: "none",

  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const btnSecondary: React.CSSProperties = {
  ...baseBtn,
  border: "1px solid #ddd",
  background: "#f5f5f5",
  cursor: "pointer",
};

const btnHeaderPrimary: React.CSSProperties = {
  ...baseBtn,
  background: "#111",
  color: "#fff",
  border: "none",
  fontWeight: 600,
  cursor: "pointer",
};

const btnBack: React.CSSProperties = {
  ...baseBtn,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
};

/* 🔥 헤더 전체 래퍼 */
const headerWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  marginBottom: 20,
  paddingTop: "calc(env(safe-area-inset-top) + 8px)",
};

/* 🔥 1줄: Sign In / Create Account — 좌우 꽉 채움, 같은 너비 */
const authRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  width: "100%",
};

/* 🔥 2줄: Back / Copy link */
const secondaryRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
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