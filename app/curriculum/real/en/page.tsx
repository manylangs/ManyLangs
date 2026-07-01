"use client";

import Image from "next/image";
import Link from "next/link";
import { useViewerTarget } from "@/app/viewer/context/ViewerTargetContext";
import { useState } from "react";
import { copyLink } from "@/utils/share";

const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function Page() {
  const { targetLang } = useViewerTarget();
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

        {/* 🔥 HEADER (컨버세이션 동일 구조) */}
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

        {/* TITLE */}a
        <h1 style={title}>
          🖼️ Real Curriculum (English)
        </h1>

        <p style={descStrong}>
          With <b>one coupon</b>, you can study <b>one level (A1–C2)</b> for <b>30 days</b>.
          <br /><br />
          Each level includes 20 chapters where you practice describing images like the examples shown.
          <br /><br />
          As the level progresses from A1 to C2, you will practice speaking by describing increasingly complex real-life situations shown in images.
        </p>

        {/* GRID */}
        <div style={grid}>
          {levels.map((level) => (
            <div key={level} style={card}>
              <h2 style={levelTitle}>{level}</h2>

              {/* 20 images */}
              <div style={imgWrapSingle}>
                <Image
                  src={`/images/curriculum/${level.toLowerCase()}.png`}
                  alt={level}
                  fill
                  style={{ objectFit: "cover", borderRadius: "8px" }}
                />
              </div>
            </div>
          ))}
        </div>
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
  maxWidth: 1100,
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
  fontSize: 28,
  fontWeight: 800,
  marginBottom: 10,
};

const descStrong: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  marginBottom: 30,
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: "20px",
};

const card: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: "12px",
  padding: "16px",
  background: "#fff",
};

const levelTitle: React.CSSProperties = {
  marginBottom: "12px",
  fontWeight: 700,
};

const imageGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: "6px",
};

const imgWrap: React.CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "1/1",
};

const linkReset: React.CSSProperties = {
  textDecoration: "none",
};
const imgWrapSingle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "1 / 1",
};
