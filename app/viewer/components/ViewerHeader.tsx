"use client";

import { useEffect, useState } from "react";

export default function ViewerHeader() {
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
        padding: "6px 12px",
        borderBottom: "1px solid #eee",
        fontSize: 13,
        display: "flex",
        justifyContent: "flex-end",
        background: "#fff",
      }}
    >
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
