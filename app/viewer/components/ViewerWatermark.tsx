"use client";

import { useUser } from "@clerk/nextjs";

export default function ViewerWatermark() {
  const { user } = useUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? "ManyLangs";

  const base = [
    email,
    "Unauthorized copying prohibited",
    `${email} · Unauthorized copying prohibited`,
  ];
  const lines = [...base, ...base];

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
        gap: 48,
      }}
    >
      {lines.map((line, i) => (
        <span
          key={i}
          style={{
            fontSize: 16,
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