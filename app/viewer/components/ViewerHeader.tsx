"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ViewerHeader() {
  const router = useRouter();
  const [showOriginal, setShowOriginal] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("showTargetLang");
    if (saved === "false") {
      setShowOriginal(false);
    }
  }, []);

  function toggle() {
    const next = !showOriginal;
    setShowOriginal(next);
    localStorage.setItem("showTargetLang", String(next));
  }

  return (
    <div
      style={{
        position: "relative",
        padding: "6px 12px",
        borderBottom: "1px solid #eee",
        fontSize: 13,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#fff",
      }}
    >
      {/* 좌측: Back 버튼 */}
      <button
        onClick={() => router.push("/select-books")}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#333",
          fontWeight: 500,
        }}
      >
        Back to Library
      </button>

      {/* 중앙: 안내 문구 (정중앙 고정) */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          color: "#888",
          whiteSpace: "nowrap",
        }}
      >
        For typos, phrasing corrections, or general inquiries:{" "}
        manylangs.help@gmail.com
      </div>

      {/* 우측: 토글 */}
      <button
        onClick={toggle}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#555",
        }}
      >
        Original text visible: {showOriginal ? "ON" : "OFF"}
      </button>
    </div>
  );
}
