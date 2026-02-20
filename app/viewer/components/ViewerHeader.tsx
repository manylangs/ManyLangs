"use client";

import { useRouter } from "next/navigation";
import { useViewerTarget } from "../context/ViewerTargetContext";

export default function ViewerHeader() {
  const router = useRouter();
  const { showTargetText, toggleTargetText } = useViewerTarget();

  // 🔵 공통 버튼 스타일
  const headerButtonStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    padding: "10px 12px",
    minHeight: "44px",
    display: "flex",
    alignItems: "center",
    fontWeight: 500,
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        background: "#fff",
        borderBottom: "1px solid #eee",
        padding: "8px 16px",
      }}
    >
      {/* Top Row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {/* Left */}
        <button
          onClick={() => router.push("/select-books")}
          style={headerButtonStyle}
        >
          Back to Library
        </button>

        {/* Right */}
        <button
          onClick={toggleTargetText}
          style={{
            ...headerButtonStyle,
            color: showTargetText ? "#0a84ff" : "#888",
          }}
        >
          Target text: {showTargetText ? "ON" : "OFF"}
        </button>
      </div>

      {/* Bottom Info Line */}
      <div
        style={{
          fontSize: 12,
          color: "#888",
          textAlign: "center",
          wordBreak: "break-word",
          marginTop: 4,
        }}
      >
        For typos, phrasing corrections, or general inquiries:{" "}
        manylangs.help@gmail.com
      </div>
    </header>
  );
}