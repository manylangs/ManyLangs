"use client";

import { useUser } from "@clerk/nextjs";

const notice =
  "For personal use only · Unauthorized copying or redistribution is strictly prohibited";

export default function ViewerWatermark() {
  const { user } = useUser();
  const email = user?.emailAddresses[0]?.emailAddress;

  return (
    <>
      {/* 하단 고정 바 */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 16px",
          background: "#fafafa",
          borderTop: "1px solid #e5e5e5",
          fontSize: 11,
          color: "#999",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        <span>🔒 {notice}</span>
        {email && (
          <span style={{ color: "#555", fontWeight: 500 }}>{email}</span>
        )}
      </div>

      {/* 대각선 워터마크 */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          userSelect: "none",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            fontSize: 13,
            color: "#000",
            opacity: 0.04,
            whiteSpace: "nowrap",
            transform: "rotate(-30deg)",
            letterSpacing: 2,
            fontFamily: "monospace",
          }}
        >
          {email ?? "ManyLangs"} · Personal use only
        </span>
      </div>
    </>
  );
}
