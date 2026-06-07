"use client";

import { useUser } from "@clerk/nextjs";

export default function ViewerWatermark() {
  const { user } = useUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? "ManyLangs";

  const lines = [
    email,
    "Unauthorized copying prohibited",
    `${email} · Unauthorized copying prohibited`,
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1,
        pointerEvents: "none",
        userSelect: "none",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 56,
      }}
    >
      {lines.map((line, i) => (
        <span
          key={i}
          style={{
            fontSize: 13,
            color: "#000",
            opacity: 0.18,
            whiteSpace: "nowrap",
            transform: "rotate(-30deg)",
            letterSpacing: 2,
            fontFamily: "monospace",
          }}
        >
          {line}
        </span>
      ))}
    </div>
  );
}