export default function LogoBig() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <svg
        width="52"
        height="52"
        viewBox="0 0 32 32"
        fill="none"
      >
        <rect width="32" height="32" rx="6" fill="#111" />
        <path
          d="M8 22V10L16 18L24 10V22"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <span
        style={{
          fontSize: "clamp(32px, 7vw, 64px)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
        }}
      >
        ManyLangs
      </span>
    </div>
  );
}