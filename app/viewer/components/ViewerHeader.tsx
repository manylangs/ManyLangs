"use client";

import { useRouter } from "next/navigation";
import { useViewerTarget } from "../context/ViewerTargetContext";

export default function ViewerHeader() {
  const router = useRouter();
  const { showTargetText, toggleTargetText } = useViewerTarget();

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,          // 🔴 반드시 1000
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
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Back to Library
        </button>

        {/* Right */}
        <button
          onClick={toggleTargetText}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            color: "#555",
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
