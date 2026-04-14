"use client";

import Link from "next/link";
import { useState } from "react";
import { copyLink } from "@/utils/share";

/* ================= IDIOM LEVEL DATA ================= */

const LEVELS = [
  {
    level: "A1",
    items: "35",
    desc: {
      kr: "기초 일상 표현 (간단한 숙어)",
      en: "Basic everyday expressions (simple idioms)",
      es: "Expresiones cotidianas básicas (modismos simples)",
      fr: "Expressions quotidiennes de base (idiomes simples)",
      pt: "Expressões cotidianas básicas (idiomas simples)",
    },
  },
  {
    level: "A2",
    items: "35",
    desc: {
      kr: "확장 일상 표현 (자주 쓰는 숙어)",
      en: "Expanded daily expressions (common idioms)",
      es: "Expresiones cotidianas ampliadas (modismos comunes)",
      fr: "Expressions quotidiennes étendues (idiomes courants)",
      pt: "Expressões cotidianas expandidas (idiomas comuns)",
    },
  },
  {
    level: "B1",
    items: "35",
    desc: {
      kr: "상황별 숙어 표현",
      en: "Situational idiomatic expressions",
      es: "Expresiones idiomáticas según la situación",
      fr: "Expressions idiomatiques selon la situation",
      pt: "Expressões idiomáticas por situação",
    },
  },
  {
    level: "B2",
    items: "35",
    desc: {
      kr: "자연스러운 구어 숙어",
      en: "Natural spoken idioms",
      es: "Modismos naturales del habla",
      fr: "Idiomes naturels de la langue parlée",
      pt: "Idiomas naturais da fala",
    },
  },
  {
    level: "C1",
    items: "30",
    desc: {
      kr: "고급 표현 및 관용구",
      en: "Advanced idioms and expressions",
      es: "Modismos y expresiones avanzadas",
      fr: "Idiomes et expressions avancés",
      pt: "Idiomas e expressões avançadas",
    },
  },
  {
    level: "C2",
    items: "20",
    desc: {
      kr: "원어민 수준 관용 표현",
      en: "Native-level idiomatic expressions",
      es: "Expresiones idiomáticas de nivel nativo",
      fr: "Expressions idiomatiques de niveau natif",
      pt: "Expressões idiomáticas de nível nativo",
    },
  },
];

/* ================= 페이지 ================= */

export default function Page() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copyLink(undefined, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <main style={main}>
      <div style={container}>

        {/* HEADER */}
        <div style={{ ...headerRow, position: "relative", zIndex: 10 }}>
          <button
            type="button"
            onClick={() => { window.location.href = "/curriculum"; }}
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

        {/* TITLE */}
        <h1 style={title}>💬 Idiom Curriculum (KR)</h1>
        <p style={descStrong}>
          Special Offer for the Idiom Series!
          <br /><br />With just one coupon, enjoy full access to all A1–C2 content for 30 days.
        </p>

        {/* LEVEL BOXES */}
        {LEVELS.map((lv) => (
          <div key={lv.level} style={card}>
            <div style={left}>
              <div style={levelBig}>{lv.level}</div>
            </div>

            <div style={right}>
              <div style={words}>{lv.items} idioms</div>

              <div style={desc}>
                {Object.entries(lv.desc).map(([lang, text], i) => (
                  <div
                    key={lang}
                    style={{
                      fontSize: i === 0 ? 14 : 12,
                      opacity: i === 0 ? 1 : 0.7,
                    }}
                  >
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

      </div>
    </main>
  );
}

/* ================= 스타일 ================= */

const main: React.CSSProperties = {
  background: "#f9fafb",
  minHeight: "100vh",
};

const container: React.CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
  padding: "20px 16px 60px",
};
const headerRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20,
  paddingTop: "calc(env(safe-area-inset-top) + 8px)",
};

const headerActions: React.CSSProperties = {
  display: "flex",
  gap: 10,
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

const btnBack: React.CSSProperties = {
  ...baseBtn,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
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

const title: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  marginBottom: 20,
};

const card: React.CSSProperties = {
  display: "flex",
  gap: 12,
  padding: 16,
  borderRadius: 12,
  background: "#fff",
  border: "1px solid #eee",
  marginBottom: 10,
};

const left: React.CSSProperties = {
  width: 60,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const levelBig: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
  color: "#4f46e5",
};

const right: React.CSSProperties = {
  flex: 1,
};

const words: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  marginBottom: 4,
};

const desc: React.CSSProperties = {
  fontSize: 14,
};

const linkReset: React.CSSProperties = {
  textDecoration: "none",
};

const descStrong: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: "#111",
  marginBottom: 24,
  lineHeight: 1.6,
};
