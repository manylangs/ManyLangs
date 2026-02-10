"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import Logo from "@/app/components/Logo";

export default function HomePage() {
  const { userId, isLoaded } = useAuth();

  if (!isLoaded) return null;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <section style={{ maxWidth: 560, width: "100%", padding: 24 }}>
        <Logo />

        <p
          style={{
            fontSize: 16,
            lineHeight: 1.6,
            marginBottom: 24,
            whiteSpace: "nowrap",
          }}
        >
          Learn languages through structured textbooks.
          <br />
          Grammar · Conversation · Vocabulary · Pronunciation · Idioms
        </p>

        {/* 🔐 로그인 상태 */}
        {userId ? (
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/select-books">
              <button style={btnPrimary}>Go to Library</button>
            </Link>

            <Link href="/logout">
              <button style={btnSecondary}>Logout</button>
            </Link>

            <Link href="/delete-account">
              <button style={btnDangerOutline}>Delete account</button>
            </Link>
          </div>
        ) : (
          /* 🔓 비로그인 상태 */
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/login">
              <button style={btnPrimary}>Log in</button>
            </Link>

            <Link href="/signup">
              <button style={btnSecondary}>Sign up</button>
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

const baseBtn = {
  padding: "10px 16px",
  fontSize: 14,
  borderRadius: 6,
  cursor: "pointer",
} as const;

const btnPrimary = {
  ...baseBtn,
  borderWidth: 0,
  borderStyle: "solid",
  borderColor: "transparent",
  background: "#111",
  color: "#fff",
} as const;

const btnSecondary = {
  ...baseBtn,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#ccc",
  background: "#fff",
  color: "#111",
} as const;

const btnDangerOutline = {
  ...baseBtn,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#dc2626",
  background: "#fff",
  color: "#dc2626",
} as const;
