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
      en: "Basic everyday English idioms",
      es: "Modismos ingleses cotidianos básicos",
      fr: "Idiomes anglais quotidiens de base",
      pt: "Expressões idiomáticas inglesas básicas do dia a dia",
      kr: "기초적인 일상 영어 관용구",
      zh: "基礎日常英語慣用語",
      jp: "基礎的な日常英語の慣用表現",
    },
  },
  {
    level: "A2",
    items: "35",
    desc: {
      en: "Common everyday English idioms",
      es: "Modismos ingleses cotidianos comunes",
      fr: "Idiomes anglais courants du quotidien",
      pt: "Expressões idiomáticas inglesas comuns do dia a dia",
      kr: "흔히 쓰이는 일상 영어 관용구",
      zh: "常用日常英語慣用語",
      jp: "よく使われる日常英語の慣用表現",
    },
  },
  {
    level: "B1",
    items: "35",
    desc: {
      en: "English idioms for social and workplace situations",
      es: "Modismos ingleses para situaciones sociales y laborales",
      fr: "Idiomes anglais pour les situations sociales et professionnelles",
      pt: "Expressões idiomáticas inglesas para situações sociais e profissionais",
      kr: "사교 및 직장 상황에서 쓰이는 영어 관용구",
      zh: "社交與職場情境英語慣用語",
      jp: "社交・職場で使われる英語の慣用表現",
    },
  },
  {
    level: "B2",
    items: "35",
    desc: {
      en: "Advanced English idioms for a wide range of situations",
      es: "Modismos ingleses avanzados para una amplia variedad de situaciones",
      fr: "Idiomes anglais avancés pour une grande variété de situations",
      pt: "Expressões idiomáticas inglesas avançadas para uma ampla variedade de situações",
      kr: "다양한 상황에서 사용되는 고급 영어 관용구",
      zh: "適用於各種情境的高級英語慣用語",
      jp: "さまざまな場面で使われる上級英語の慣用表現",
    },
  },
  {
    level: "C1",
    items: "35",
    desc: {
      en: "English proverbs and figurative expressions",
      es: "Refranes ingleses y expresiones figuradas",
      fr: "Proverbes anglais et expressions figurées",
      pt: "Provérbios ingleses e expressões figuradas",
      kr: "영어 속담 및 비유적 표현",
      zh: "英語諺語與比喻表達",
      jp: "英語のことわざ・比喩表現",
    },
  },
  {
    level: "C2",
    items: "35",
    desc: {
      en: "Native-level advanced English idiomatic expressions",
      es: "Expresiones idiomáticas inglesas avanzadas de nivel nativo",
      fr: "Expressions idiomatiques anglaises avancées de niveau natif",
      pt: "Expressões idiomáticas inglesas avançadas de nível nativo",
      kr: "원어민 수준의 고급 영어 관용 표현",
      zh: "母語人士水準的高級英語慣用表達",
      jp: "ネイティブレベルの高度な英語慣用表現",
    },
  },
];



/* ================= 페이지 ================= */

export default function Page() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copyLink(window.location.href, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <main style={main}>
      <div style={container}>

        {/* HEADER */}
        <div style={headerWrap}>
          {/* 1줄: Sign In / Create Account — 좌우 꽉 채움 */}
          <div style={authRow}>
            <Link href="/login" style={linkReset}>
              <button type="button" style={{ ...btnBack, width: "100%" }}>
                Sign In
              </button>
            </Link>

            <Link href="/signup" style={linkReset}>
              <button type="button" style={{ ...btnHeaderPrimary, width: "100%" }}>
                Create Account
              </button>
            </Link>
          </div>

          {/* 2줄: Back / Copy link / Unlock Full Access */}
          <div style={secondaryRow}>
            <button
              type="button"
              onClick={() => { window.location.href = "/curriculum"; }}
              style={btnBack}
            >
              ← Back
            </button>

            <button type="button" onClick={handleCopy} style={btnSecondary}>
              Copy link
            </button>

            <button
              type="button"
              onClick={() => { window.location.href = "/app"; }}
              style={{ ...btnHeaderPrimary, marginLeft: "auto" }}
            >
              Unlock Full Access
            </button>
          </div>
        </div>

        {/* TITLE */}
        <h1 style={title}>💬 Idiom Curriculum (English)</h1>
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

/* 헤더 전체 래퍼 */
const headerWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  marginBottom: 20,
  paddingTop: "calc(env(safe-area-inset-top) + 8px)",
};

/* 1줄: Sign In / Create Account — 좌우 꽉 채움, 같은 너비 */
const authRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  width: "100%",
};

/* 2줄: Back / Copy link / Unlock Full Access */
const secondaryRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
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