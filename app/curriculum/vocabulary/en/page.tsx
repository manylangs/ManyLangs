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
      en: "Everyday nouns",
      es: "Sustantivos cotidianos",
      fr: "Noms du quotidien",
      pt: "Substantivos do cotidiano",
      zh: "日常名词",
      jp: "日常名詞",
      kr: "일상 명사",
    },
  },
  {
    level: "A2",
    words: "120",
    desc: {
      en: "Everyday nouns & Extended everyday nouns",
      es: "Sustantivos cotidianos y sustantivos cotidianos ampliados",
      fr: "Noms du quotidien et noms du quotidien étendus",
      pt: "Substantivos do cotidiano e substantivos do cotidiano expandidos",
      zh: "日常名词与扩展日常名词",
      jp: "日常名詞と拡張日常名詞",
      kr: "일상 명사 및 확장된 일상 명사",
    },
  },
  {
    level: "B1",
    words: "120",
    desc: {
      en: "Extended everyday nouns & Society, education, and technology nouns",
      es: "Sustantivos cotidianos ampliados y sustantivos relacionados con la sociedad, la educación y la tecnología",
      fr: "Noms du quotidien étendus et noms liés à la société, à l'éducation et à la technologie",
      pt: "Substantivos do cotidiano expandidos e substantivos relacionados à sociedade, educação e tecnologia",
      zh: "扩展日常名词与社会、教育、科技名词",
      jp: "拡張日常名詞と社会・教育・技術関連名詞",
      kr: "확장된 일상 명사 및 사회, 교육, 기술 관련 명사",
    },
  },
  {
    level: "B2",
    words: "120",
    desc: {
      en: "Society, education, and technology nouns & Abstract, policy, and future-related nouns",
      es: "Sustantivos relacionados con la sociedad, la educación y la tecnología y sustantivos abstractos, políticos y relacionados con el futuro",
      fr: "Noms liés à la société, à l'éducation et à la technologie et noms abstraits, politiques et liés au futur",
      pt: "Substantivos relacionados à sociedade, educação e tecnologia e substantivos abstratos, políticos e relacionados ao futuro",
      zh: "社会、教育、科技名词与抽象、政策及未来相关名词",
      jp: "社会・教育・技術関連名詞と抽象・政策・未来関連名詞",
      kr: "사회, 교육, 기술 관련 명사 및 추상적, 정책적, 미래 관련 명사",
    },
  },
  {
    level: "C1",
    words: "120",
    desc: {
      en: "Abstract, policy, and future-related nouns",
      es: "Sustantivos abstractos, políticos y relacionados con el futuro",
      fr: "Noms abstraits, politiques et liés au futur",
      pt: "Substantivos abstratos, políticos e relacionados ao futuro",
      zh: "抽象、政策及未来相关名词",
      jp: "抽象・政策・未来関連名詞",
      kr: "추상적, 정책적, 미래 관련 명사",
    },
  },
  {
    level: "C2",
    words: "120",
    desc: {
      en: "Academic nouns & Advanced nouns",
      es: "Sustantivos académicos y sustantivos avanzados",
      fr: "Noms académiques et noms avancés",
      pt: "Substantivos acadêmicos e substantivos avançados",
      zh: "学术名词与高级名词",
      jp: "学術名詞・上級名詞",
      kr: "학술 명사 및 고급 명사",
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
        <div style={headerWrap}>
          {/* 1줄: Sign In / Create Account — 좌우 꽉 채움 */}
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

          {/* 2줄: Back / Copy link */}
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
          </div>
        </div>

        {/* TITLE */}
        <h1 style={title}>📚 Vocabulary Curriculum (English)</h1>
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
                {lv.desc.en}
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
                <br />                                    {/* ← 이 줄 추가 */}
                <span style={{ fontSize: 12, opacity: 0.6 }}>
                  {lv.desc.kr}
                </span>
                <br />   
                <span style={{ fontSize: 12, opacity: 0.6 }}>
                  {lv.desc.zh}
                </span>
                <br />   
                <span style={{ fontSize: 12, opacity: 0.6 }}>
                  {lv.desc.jp}
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

/* 2줄: Back / Copy link */
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