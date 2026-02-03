"use client";

import { useRouter } from "next/navigation";
import { useViewerTarget } from "../context/ViewerTargetContext";

export default function ViewerHeader() {
  const router = useRouter();

  // ✅ Context에서 직접 상태 사용
  const { showTargetText, toggleTargetText } = useViewerTarget();

  return (
    <header
      style={{
        height: 48,
        borderBottom: "1px solid #eee",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        fontSize: 14,
        background: "#fff",

        /* 🔹 여기부터 핵심 */
        position: "sticky",
        top: 0,
        zIndex: 100,
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

      {/* Center */}
      <span
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 12,
          color: "#888",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        For typos, phrasing corrections, or general inquiries:{" "}
        manylangs.help@gmail.com
      </span>

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
    </header>
  );
}
