//랜딩 페이지
"use client";

import Link from "next/link";
import LogoBig from "@/app/components/LogoBig";
import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [footerOpen, setFooterOpen] = useState<"terms" | "privacy" | null>(null);
  // 🔥 추가 (핵심)
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  // 🔥 PWA install 관련 state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // 🔥 Android install 이벤트
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // 🔥 Android 버튼 클릭
  const handleAndroidInstall = async () => {
    if (!deferredPrompt) {
      alert("Already installed or not supported");
      return;
    }

    deferredPrompt.prompt();
  };

  // 🔥 iOS 버튼 클릭
  const handleIOSInstall = () => {
    setShowIOSGuide(true);
  };

  // 🔥 추가 (첫 로그인 해결)
  useEffect(() => {
    if (!isLoaded) return;

    // 🔥 Clerk OAuth 콜백 중이면 절대 건드리지 마라
    if (window.location.search.includes("__clerk")) return;

    if (isSignedIn) {
      router.replace("/select-books");
    }
  }, [isLoaded, isSignedIn, router]);

  const handleShare = async () => {
    if (typeof window === "undefined") return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "ManyLangs",
          url: window.location.href,
        });
      } catch { }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied!");
      } catch {
        alert("Unable to copy link.");
      }
    }
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <main style={mainStyle}>
      {/* 이하 기존 코드 그대로 유지 */}
      {/* Header */}
      <header style={headerStyle}>
        <div style={headerInner}>

          {/* 왼쪽 */}
          <div style={logoWrap}>
            {/* <Logo /> */}
          </div>

          {/* 가운데 (데스크탑 메뉴) */}
          <nav style={navStyle} className="desktop-nav">
            <a href="#demo" style={navItem}>How you’ll learn</a>
            <a href="#features" style={navItem}>Features</a>
            <a href="#how" style={navItem}>How it works</a>
            <a href="#usecases" style={navItem}>Use Cases</a>
            <a href="#pricing" style={navItem}>Pricing</a>
          </nav>

          {/* 오른쪽 */}
          <div style={rightWrap}>

            {/* 데스크탑 버튼 */}
            <div
              style={{ display: "flex", gap: 6 }}
              className="header-buttons"
            >
              <Link href="/app" style={linkReset}>
                <button style={btnSecondary}>Get Started</button>
              </Link>

              <button onClick={handleAndroidInstall} style={btnInstallPrimary}>
                Android
              </button>

              <button onClick={handleIOSInstall} style={btnInstallSecondary}>
                iOS
              </button>

              <button onClick={handleShare} style={btnGhost}>
                Copy link
              </button>
            </div>

            {/* 모바일 햄버거 */}
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              style={hamburger}
              className="mobile-only"
            >
              ☰
            </button>

          </div>
        </div>

        {/* 🔥 모바일 메뉴 */}
        {menuOpen && (
          <div style={mobileMenu}>
            <a href="#demo" style={mobileMenuLink} onClick={closeMenu}>How you’ll learn</a>
            <a href="#features" style={mobileMenuLink} onClick={closeMenu}>Features</a>
            <a href="#how" style={mobileMenuLink} onClick={closeMenu}>How it works</a>
            <a href="#usecases" style={mobileMenuLink} onClick={closeMenu}>Use Cases</a>
            <a href="#pricing" style={mobileMenuLink} onClick={closeMenu}>Pricing</a>
          </div>
        )}
      </header>

      {/* Hero */}
      <section style={heroSection}>
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.5,
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          <span style={{ display: "block" }}>
            Learn through structured lessons — built for real use.
          </span>
        </p>

        {/* 버튼 영역 */}
        <div
          style={{
            ...btnRow,
            justifyContent: "center",
          }}
        >
          {/* 🔥 메인 CTA */}
          <a href="/demo" style={linkReset}>
            <button type="button" style={btnPrimary}>
              Try Free Lesson
            </button>
          </a>

          {/* 🔥 보조 CTA */}

        </div>

        {/* 🔥 신뢰 한 줄 */}
        <span
          style={{
            display: "block",
            fontSize: 13,
            opacity: 0.6,
            textAlign: "center",
            marginTop: 12,
          }}
        >
          No sign-up required for demo
        </span>

        {/* 기존 키워드 */}
        <span
          style={{
            display: "block",
            fontSize: 13,
            opacity: 0.6,
            textAlign: "center",
            marginTop: 6,
          }}
        >
          Grammar · Speaking · Vocabulary · Idioms · Real-world usage
        </span>
      </section>
      {/* Demo Section */}
      <section
        id="demo"
        style={{
          ...sectionWrap,
          paddingTop: 20,
          paddingBottom: 80,
        }}
      >
        <h2 style={sectionTitle}>How you’ll learn</h2>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 48,
            alignItems: "center",
          }}
        >
          {/* 1️⃣ 메인 교재 화면 */}
          <div
            style={{
              width: "100%",
              maxWidth: 720, // 🔥 기존 800 → 살짝 줄임 (덜 압도적)
            }}
          >
            <img
              src="/images/demo-main.png"
              alt="Lesson preview"
              style={{
                width: "100%",
                height: "auto",
                borderRadius: 16,
                border: "1px solid #eee",
                boxShadow: "0 12px 32px rgba(0,0,0,0.08)", // 🔥 더 또렷하게
              }}
            />
          </div>

          {/* 2️⃣ 라이브러리 (비중 ↑) */}
          <div
            style={{
              width: "100%",
              maxWidth: 640, // 🔥 500 → 640 (핵심 변경)
            }}
          >
            <img
              src="/images/demo-library.png"
              alt="Library"
              style={{
                width: "100%",
                height: "auto",
                borderRadius: 16,
                border: "1px solid #eee",
                boxShadow: "0 10px 28px rgba(0,0,0,0.07)",
              }}
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={sectionWrap}>
        <h2 style={sectionTitle}>Features</h2>

        <div style={grid2}>
          {/* 1 */}
          <div style={card}>
            <div style={cardTitle}>Structured Learning</div>
            <div style={text}>
              Learn languages through organized textbook-based content.
            </div>
          </div>

          {/* 2 */}
          <div style={card}>
            <div style={cardTitle}>Real Use Cases</div>
            <div style={text}>
              Practice language through real scenarios.
            </div>
          </div>
          {/* 3 */}
          <div style={card}>
            <div style={cardTitle}>Learn from 4 languages</div>
            <div style={text}>
              Study your target language using English, Spanish, French, or Portuguese.
            </div>
          </div>
        </div>
      </section>
      {/* How */}
      <section id="how" style={sectionWrap}>
  <h2 style={sectionTitle}>How it works</h2>

  <div style={{
    display: "flex",
    flexDirection: "column",
    gap: 12,
  }}>
    {[
      "Sign in",
      "Pick your language and level (A1–C2)",
      "Start learning",
    ].map((text, i) => (
      <div key={i} style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        borderRadius: 10,
        border: "1px solid #eee",
        background: "#fafafa",
      }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "#111",
          color: "#fff",
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 600,
        }}>
          {i + 1}
        </div>

        <div style={{ fontSize: 14 }}>{text}</div>
      </div>
    ))}
  </div>
</section>

      {/* Use Cases */}
      <section id="usecases" style={sectionWrap}>
        <h2 style={sectionTitle}>Use Cases</h2>

        <div style={grid4}>
          {[
            {
              title: "Study",
              desc: "Build strong fundamentals step by step",
            },
            {
              title: "Conversation",
              desc: "Speak naturally in real situations",
            },
            {
              title: "Daily Situations",
              desc: "Express yourself in everyday scenarios",
            },
            {
              title: "Real-life Expressions",
              desc: "Learn how people actually speak",
            },
          ].map((item) => (
            <div key={item.title} style={cardSmall}>
              <div style={{ fontWeight: 600 }}>{item.title}</div>
              <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={sectionCenter}>
        <h2 style={sectionTitle}>Pricing</h2>

        <div style={pricingCard}>
          <h3 style={pricingTitle}>Coupon Packs</h3>

          <div style={{ fontSize: 14, lineHeight: 1.6, color: "#444", marginBottom: 16 }}>
            Purchase once and receive coupons.
            Each coupon unlocks one selected course for 30 days.
          </div>

          {/* 가격 테이블 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {[
              { price: "$3", count: "2 coupons" },
              { price: "$5", count: "4 coupons" },
              { price: "$20", count: "20 coupons" },
              { price: "$50", count: "60 coupons" },
              { price: "$100", count: "150 coupons" },
            ].map((item) => (
              <div
                key={item.price}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                  borderBottom: "1px solid #f0f0f0",
                  paddingBottom: 6,
                }}
              >
                <span>{item.price}</span>
                <span style={{ fontWeight: 600 }}>{item.count}</span>
              </div>
            ))}
          </div>

          <a href="/app" style={linkReset}>
            <button type="button" style={btnPrimary}>
              Buy Coupons
            </button>
          </a>

          {/* 정책 설명 */}
          <div
            style={{
              fontSize: 12,
              color: "#777",
              marginTop: 16,
              lineHeight: 1.6,
            }}
          >
            • Coupons are issued once after payment.<br />
            • Each coupon unlocks a course for 30 days.<br />
            • Coupons do not expire.<br />
            • Coupons can be transferred to other users.<br />
            • ManyLangs is not responsible after transfer.
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={sectionCenterLarge}>
        <h2 style={ctaTitle}>Start learning today</h2>

        <a href="/app" style={linkReset}>
          <button type="button" style={btnPrimary}>
            Login to Start
          </button>
        </a>
      </section>
      {
        showIOSGuide && (
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: "#fff",
              borderTop: "1px solid #ccc",
              padding: 20,
              zIndex: 9999,
              textAlign: "center",
            }}
          >
            <h3>Use ManyLangs like an app</h3>

            <p style={{ fontSize: 14, marginTop: 10 }}>
              1. Tap ⬆️ (Share)
            </p>
            <p style={{ fontSize: 14 }}>
              2. Tap "Add to Home Screen"
            </p>
            <p style={{ fontSize: 14 }}>
              3. No install needed — works like a real app.
            </p>

            <button
              onClick={() => setShowIOSGuide(false)}
              style={{
                marginTop: 12,
                padding: "8px 12px",
                border: "1px solid #ccc",
                borderRadius: 6,
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        )
      }
      <div style={{
        maxWidth: 600,
        margin: "40px auto 0",
        fontSize: 13,
        color: "#666",
        textAlign: "center",
        lineHeight: 1.6,
      }}>
        ManyLangs is an independent language learning platform focused on practical, real-world usage through structured lessons.
      </div>
      {/* Footer */}
      <footer style={footerStyle}>
        <div style={footerInner}>
          <p style={footerText}>General inquiries : manylangs.help@gmail.com</p>

          <div style={footerLinks}>
            <button
              onClick={() => setFooterOpen("terms")}
              style={{
                ...footerLink,
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Terms
            </button>

            <button
              onClick={() => setFooterOpen("privacy")}
              style={{
                ...footerLink,
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Privacy
            </button>
          </div>
        </div>
      </footer>
      {footerOpen && (
        <div style={modalOverlay} onClick={() => setFooterOpen(null)}>
          <div style={modalContent} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <strong>
                {footerOpen === "terms" ? "Terms" : "Privacy Policy"}
              </strong>
              <button
                onClick={() => setFooterOpen(null)}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {footerOpen === "terms" && (
              <div>
                <p>• Coupons are issued once after payment.</p>
                <p>• Each coupon unlocks a course for 30 days.</p>
                <p>• Coupons do not expire.</p>
                <p>• Coupons can be transferred to other users.</p>
                <p>• ManyLangs is not responsible after transfer.</p>
              </div>
            )}

            {footerOpen === "privacy" && (
              <div>
                <p>• We collect minimal user data for service operation.</p>
                <p>• Your data is not sold or shared with third parties.</p>
                <p>• Login information is securely managed.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
:root {
  --header-h: 64px;
}

@media (max-width: 768px) {
  :root {
 --header-h: 72px; /* 🔥 88 → 72 (실제 맞춤) */
  }
}
/* 🔥 데스크탑 전용 버튼 */
  .desktop-only {
    display: inline-flex;
  }

  /* 🔥 모바일 */
  @media (max-width: 768px) {

    /* 데스크탑 메뉴 숨김 */
    .desktop-nav {
      display: none !important;
    }

    .desktop-email {
      display: none !important;
    }

    /* 🔥 추가 (핵심) */
    .desktop-only {
      display: none !important;
    }

    /* 햄버거 보이기 */
    .mobile-only {
      display: inline-flex !important;
    }
  }

  /* 🔥 데스크탑 */
  @media (min-width: 769px) {
    .mobile-only {
      display: none !important;
    }
  }
    @media (max-width: 768px) {
  .header-buttons button {
    padding: 6px 8px !important;
    font-size: 11px !important;
  }
}

`}</style>
    </main >
  );
}

/* ================= Base ================= */

const mainStyle: React.CSSProperties = {
  background: "#fff",
  color: "#111",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  paddingTop: 0,
  minHeight: "100vh",
};

const linkReset: React.CSSProperties = {
  textDecoration: "none",
};

/* ================= Header ================= */
const headerStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  zIndex: 9999,
  background: "#fff",
  borderBottom: "1px solid #eee",
  padding: "14px 20px",
  height: 64, // 🔥 추가 (핵심)
};
const headerInner: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  position: "relative",   // 🔥 추가 (이거 없으면 안 뜸)
};
const logoWrap: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  minWidth: 0,
};

const navStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 24,
  fontSize: 14,
  fontWeight: 600,
};

const navItem: React.CSSProperties = {
  textDecoration: "none",
  color: "#222",
  whiteSpace: "nowrap",
};

const rightWrap: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const rightArea: React.CSSProperties = {
  fontSize: 12,
  color: "#666",
  whiteSpace: "nowrap",
};

const hamburger: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,   // 🔥 40 → 28
  height: 40,  // 🔥 40 → 28
  fontSize: 16, // 🔥 22 → 16
  lineHeight: 1,
  background: "#fff",
  border: "1px solid #ddd",
  borderRadius: 6,
  cursor: "pointer",
};

const mobileMenu: React.CSSProperties = {
  position: "absolute",     // 🔥 핵심
  top: 64,                  // 헤더 높이 기준
  right: 20,
  width: 180,
  background: "#fff",
  border: "1px solid #eee",
  borderRadius: 12,
  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  zIndex: 2000,
};
const mobileMenuLink: React.CSSProperties = {
  textDecoration: "none",
  color: "#222",
  fontSize: 15,
  fontWeight: 600,
};

const mobileEmail: React.CSSProperties = {
  marginTop: 6,
  fontSize: 12,
  color: "#666",
};

/* ================= Hero ================= */
const titleRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 16,
  marginBottom: 20,
};

const heroLogoWrap: React.CSSProperties = {
  width: 64,
  height: 64,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const heroTitle: React.CSSProperties = {
  fontSize: "clamp(42px, 7vw, 68px)", // 🔥 더 크게
  fontWeight: 800,
  lineHeight: 1,
  margin: 0,
};

const heroSection: React.CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
  padding: "calc(var(--header-h) + 24px) 20px 80px",
  textAlign: "center",
};

const heroSub: React.CSSProperties = {
  fontSize: 13,
  color: "#666",
  marginBottom: 10,
};


const heroDesc: React.CSSProperties = {
  fontSize: "clamp(14px, 2.5vw, 16px)",
  lineHeight: 1.6,
  margin: "0 0 22px",
  color: "#222",
};

const btnRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  justifyContent: "center",
  alignItems: "center",
  flexWrap: "wrap",
};

const keywordText: React.CSSProperties = {
  marginTop: 18,
  fontSize: 13,
  color: "#666",
  lineHeight: 1.5,
};

/* ================= Sections ================= */

const sectionWrap: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  scrollMarginTop: "var(--header-h)", // 🔥 수정
  maxWidth: 1000,
  margin: "0 auto",
  padding: "clamp(20px, 4vw, 40px) 20px",
};

const sectionCenter: React.CSSProperties = {
  scrollMarginTop: "var(--header-h)",
  maxWidth: 1000,          // 🔥 추가
  margin: "0 auto",        // 🔥 추가
  padding: "clamp(20px, 4vw, 40px) 16px",
};

const sectionCenterLarge: React.CSSProperties = {
  maxWidth: 1000,
  margin: "0 auto",
  padding: "clamp(60px, 10vw, 90px) 20px",
  textAlign: "center",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "clamp(20px, 4vw, 26px)",
  fontWeight: 700,
  margin: "0 0 20px",
};

const ctaTitle: React.CSSProperties = {
  fontSize: "clamp(22px, 4vw, 28px)",
  margin: "0 0 16px",
  fontWeight: 700,
};

const text: React.CSSProperties = {
  fontSize: 14,
  color: "#555",
  lineHeight: 1.6,
  margin: 0,
};

/* ================= Layout ================= */

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 18,
};

const grid4: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 14,
};

const column: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const stepItem: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.6,
  color: "#222",
};

/* ================= Cards ================= */

const card: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 12,
  padding: 18,
};

const cardSmall: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 10,
  padding: 14,
  textAlign: "center",
  fontSize: 14,
  minWidth: 0, // 🔥 중요 (overflow 방지)
};

const pricingCard: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 12,
  padding: 24,
  maxWidth: 360,
  margin: "0 auto",
  width: "100%", // 🔥 추가
};

const pricingTitle: React.CSSProperties = {
  fontSize: 24,
  margin: "0 0 12px",
  fontWeight: 700,
};

const cardTitle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  margin: "0 0 6px",
};

/* ================= Buttons ================= */

const baseBtn: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: 14,
  borderRadius: 8,
  cursor: "pointer",
  transition: "all 0.2s ease",
  outline: "none",
};

const btnPrimary: React.CSSProperties = {
  ...baseBtn,
  background: "#111",
  color: "#fff",
  border: "none",
};

const btnSecondary: React.CSSProperties = {
  ...baseBtn,
  background: "#fff",
  color: "#111",
  border: "1px solid #ccc",
};

/* ================= Footer ================= */

const footerStyle: React.CSSProperties = {
  borderTop: "1px solid #eee",
  marginTop: 50,
};

const footerInner: React.CSSProperties = {
  maxWidth: 1000,
  margin: "0 auto",
  padding: "20px",
  textAlign: "center",
};

const footerText: React.CSSProperties = {
  fontSize: 12,
  color: "#666",
  margin: "0 0 10px",
};

const footerLinks: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: 14,
  flexWrap: "wrap",
};

const footerLink: React.CSSProperties = {
  fontSize: 12,
  color: "#444",
  textDecoration: "none",
};

const btnInstallPrimary: React.CSSProperties = {
  padding: "8px 14px",
  fontSize: 13,
  borderRadius: 999, // 🔥 pill 느낌
  background: "#111",
  color: "#fff",
  border: "none",
  fontWeight: 600,
  cursor: "pointer",
};

const btnInstallSecondary: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 13,
  borderRadius: 999,
  background: "#f5f5f5",
  color: "#333",
  border: "1px solid #e5e5e5",
  fontWeight: 500,
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  padding: "8px 10px",
  fontSize: 13,
  borderRadius: 999,
  background: "transparent",
  color: "#666",
  border: "none",
  cursor: "pointer",
};
/* ================= Modal Styles ================= */

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 999,
};

const modalContent: React.CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  padding: 20,
  maxWidth: 400,
  width: "90%",
  maxHeight: "80vh",
  overflowY: "auto",
  fontSize: 14,
  lineHeight: 1.6,
};

