"use client";

import Link from "next/link";
import { useState } from "react";
import { copyLink } from "@/utils/share";
/* ================= VOCAB LEVEL DATA ================= */

const LEVELS = [
  {
    level: "A1",
    words: "120",
    desc: {
      kr: "기초 핵심 어휘",
      en: "Core Vocabulary",
      es: "Vocabulario básico",
      fr: "Vocabulaire de base",
      pt: "Vocabulário básico",
    },
  },
  {
    level: "A2",
    words: "120",
    desc: {
      kr: "기초 확장 어휘",
      en: "Expanded Core Vocabulary",
      es: "Vocabulario básico ampliado",
      fr: "Vocabulaire de base élargi",
      pt: "Vocabulário básico ampliado",
    },
  },
  {
    level: "B1",
    words: "120",
    desc: {
      kr: "중급 핵심 어휘",
      en: "Intermediate Core Vocabulary",
      es: "Vocabulario intermedio esencial",
      fr: "Vocabulaire intermédiaire essentiel",
      pt: "Vocabulário intermediário essencial",
    },
  },
  {
    level: "B2",
    words: "120",
    desc: {
      kr: "추상·시스템 어휘",
      en: "Abstract and Systems Vocabulary",
      es: "Vocabulario abstracto y de sistemas",
      fr: "Vocabulaire abstrait et des systèmes",
      pt: "Vocabulário abstrato e de sistemas",
    },
  },
  {
    level: "C1",
    words: "120",
    desc: {
      kr: "고급 학술·추상 어휘",
      en: "Advanced Academic and Abstract Vocabulary",
      es: "Vocabulario académico y abstracto avanzado",
      fr: "Vocabulaire académique et abstrait avancé",
      pt: "Vocabulário acadêmico e abstrato avançado",
    },
  },
  {
    level: "C2",
    words: "120",
    desc: {
      kr: "전문 분야 학술 어휘",
      en: "Specialized Academic Vocabulary",
      es: "Vocabulario académico especializado",
      fr: "Vocabulaire académique spécialisé",
      pt: "Vocabulário acadêmico especializado",
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
        <h1 style={title}>📚 Vocabulary Curriculum (Korean)</h1>
        <p style={descStrong}>
          Special Offer for the Vocabulary Series!
          <br /><br />With just one coupon, enjoy full access to all A1–C2 content for 30 days.
        </p>

        {/* LEVEL BOXES */}
        {LEVELS.map((lv) => (
          <div key={lv.level} style={card}>
            <div style={left}>
              <div style={levelBig}>{lv.level}</div>
            </div>

            <div style={right}>
              <div style={words}>{lv.words} words</div>
              <div style={desc}>
                {lv.desc.kr}
                <br />
                <span style={{ fontSize: 12, opacity: 0.7 }}>
                  {lv.desc.en}
                </span>
                <br />
                <span style={{ fontSize: 12, opacity: 0.6 }}>
                  {lv.desc.es}
                </span>
                <br />
                <span style={{ fontSize: 12, opacity: 0.6 }}>
                  {lv.desc.fr}
                </span>
                <br />
                <span style={{ fontSize: 12, opacity: 0.6 }}>
                  {lv.desc.pt}
                </span>
              </div>
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
