"use client";

import { SignIn, useUser } from "@clerk/nextjs";
import Logo from "@/app/components/Logo";

export default function LoginPage() {
  const { isLoaded } = useUser();

  if (!isLoaded) return null;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 16,
      }}
    >
      <Logo />
      <a
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "8px 14px",
          border: "1px solid #ddd",
          borderRadius: 999,
          background: "#fff",
          color: "#333",
          textDecoration: "none",
          fontSize: 14,
          fontWeight: 500,
          transition: "all .2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#f5f5f5";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#fff";
        }}
      >
        ← Back to Home
      </a>
      <SignIn /> {/* 👈 이거 있어야 테스트 가능 */}
    </main>
  );
}