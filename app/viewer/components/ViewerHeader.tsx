"use client";

import { useRouter } from "next/navigation";
import { useViewerTarget } from "../context/ViewerTargetContext";
import { useEffect, useState } from "react";

export default function ViewerHeader() {
  const router = useRouter();
  const { showTargetText, toggleTargetText } = useViewerTarget();
  const [safeTop, setSafeTop] = useState(0);

  useEffect(() => {
    // 1순위: CSS env() 측정 (iOS/PWA)
    const el = document.createElement("div");
    el.style.cssText = "position:fixed;top:env(safe-area-inset-top,0px);left:0;width:1px;height:1px;visibility:hidden;pointer-events:none;";
    document.body.appendChild(el);
    const envTop = el.getBoundingClientRect().top;
    document.body.removeChild(el);

    if (envTop > 0) {
      setSafeTop(envTop);
      return;
    }

    // 2순위: window.screenY (Android WebView)
    if (window.screenY > 0) {
      setSafeTop(window.screenY);
      return;
    }

    // 3순위: screen - innerHeight 차이로 추정
    const diff = window.screen.height - window.innerHeight;
    if (diff > 0 && diff < 100) {
      setSafeTop(diff);
    }
  }, []);

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
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: "#fff",
        height: "56px",
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
          height: "56px",
        }}
      >
        <button onClick={() => router.push("/select-books")} style={headerButtonStyle}>
          Back to Library
        </button>

        <div style={{ fontSize: 13, color: "#666", textAlign: "center", flex: 1 }}>
          Contact: ✉ manylangs.help@gmail.com
        </div>

        <button
          onClick={toggleTargetText}
          style={{ ...headerButtonStyle, color: showTargetText ? "#0a84ff" : "#888" }}
        >
          Target text: {showTargetText ? "ON" : "OFF"}
        </button>
      </div>

      {/* 👇 여기 추가 */}
      <div style={{ position: "fixed", bottom: 10, left: 10, background: "red", color: "#fff", fontSize: 12, padding: 4, zIndex: 9999 }}>
        safeTop: {safeTop} | screenY: {typeof window !== "undefined" ? window.screenY : "?"}
      </div>

    </header>
  );
}