"use client";

import Link from "next/link";
import { useViewerTarget } from "@/app/viewer/context/ViewerTargetContext";
import { useState } from "react";
import { copyLink } from "@/utils/share";

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

export default function Page() {
  const { targetLang } = useViewerTarget();

  // 🔥 Demo 동일 copy 로직
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

        {/* ✅ HEADER (Demo 완전 동일) */}
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
        <h1 style={title}>🗣️ Conversation Curriculum (KR)</h1>

        <p style={descStrong}>
          With <b>one coupon</b>, you can study <b>one level (A1–C2)</b> for <b>30 days</b>.
        </p>

        {/* LIST */}
        <div style={listWrap}>
          {/* 기존 리스트 그대로 유지 */}
        </div>

      </div>

      {/* ✅ Toast (Demo 동일) */}
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

/* ✅ Demo header 그대로 */
const headerRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20,
  paddingTop: "calc(env(safe-area-inset-top) + 8px)", // 🔥 핵심
};

const headerActions: React.CSSProperties = {
  display: "flex",
  gap: 10,
};

/* ✅ 버튼 구조 통일 */
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

/* 기존 스타일 유지 */
const title: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  marginBottom: 6,
};

const descStrong: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: "#111",
  marginBottom: 24,
  lineHeight: 1.6,
};

const listWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};