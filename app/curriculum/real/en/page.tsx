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