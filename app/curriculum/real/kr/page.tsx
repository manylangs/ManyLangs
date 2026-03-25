"use client";

import Image from "next/image";
import Link from "next/link";
import { useViewerTarget } from "@/app/viewer/context/ViewerTargetContext";

const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function Page() {
  const { targetLang } = useViewerTarget();

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Real Curriculum (${targetLang.toUpperCase()})`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied!");
      }
    } catch { }
  };

  return (
    <main style={main}>
      <div style={container}>

        {/* 🔥 HEADER (컨버세이션 동일 구조) */}
        <div style={header}>
          <Link href="/curriculum" style={linkReset}>
            <button style={backBtn}>← Back</button>
          </Link>

          <div style={headerRight}>
            <button onClick={handleShare} style={copyBtn}>
              Copy link
            </button>

            <Link href="/app" style={linkReset}>
              <button style={btnHeaderPrimary}>
                Unlock Full Access
              </button>
            </Link>
          </div>
        </div>

        {/* TITLE */}
        <h1 style={title}>
          🖼️ Real Curriculum ({targetLang.toUpperCase()})
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

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16,
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
  background: "#f3f4f6",
  cursor: "pointer",
};

const btnHeaderPrimary: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
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