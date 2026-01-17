export default function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
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
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        ManyLangs
      </span>
    </div>
  );
}
