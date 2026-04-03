//로그인 페이지
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
      <section
        style={{
          maxWidth: 560,
          width: "100%",
          padding: 24,
          textAlign: "center",
          margin: "0 auto",
        }}
      >
        {/* 🔥 텍스트 1 */}

        {/* 🔥 로고 (p 밖으로 분리) */}
        <div
          style={{
            margin: "8px 0",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Logo />
        </div>

        {/* 🔥 텍스트 2 */}
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >

          Grammar · Speaking · Vocabulary
          <br />
          Idioms · Real-world usage
        </p>

        {/* 🔥 버튼 */}
        {userId ? (
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <a href="/select-books">
              <button style={btnPrimary}>Go to Library</button>
            </a>

            <a href="/logout">
              <button style={btnSecondary}>Logout</button>
            </a>

            <a href="/delete-account">
              <button style={btnDangerOutline}>Delete account</button>
            </a>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
            }}
          >
            <a href="/login">
              <button style={btnPrimary}>Log in</button>
            </a>

            <a href="/signup">
              <button style={btnSecondary}>Sign up</button>
            </a>
          </div>
        )}

        {/* 🔥 하단 설명 */}
        <div
          style={{
            marginTop: 28,
            fontSize: 14,
            lineHeight: 1.6,
            color: "#666",
          }}
        >
          <a
            href="https://www.manylangs.studio"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              marginTop: 10,
              color: "#111",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Explore ManyLangs & Try a free lesson. →
            
          </a>

          <p
            style={{
              marginTop: 6,
              fontSize: 13,
              color: "#555",
            }}
          >
            If you are currently logged in,<br />
            please log out before visiting ManyLangs Home.
          </p>
        </div>
      </section>
    </main>
  );
}

/* 버튼 스타일 */

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
