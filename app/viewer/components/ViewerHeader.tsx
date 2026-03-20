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
        padding: "8px 0",
      }}
    >
      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        {/* Left */}
        <button
          onClick={() => router.push("/select-books")}
          style={headerButtonStyle}
        >
          Back to Library
        </button>

        {/* Center */}
        <div
          style={{
            fontSize: 13,
            color: "#666",
            textAlign: "center",
            flex: 1,
          }}
        >
          For typos, phrasing corrections, or general inquiries : manylangs.help@gmail.com
        </div>

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
    </header>
  );
}