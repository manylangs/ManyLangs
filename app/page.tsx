//랜딩 페이지
"use client";

import Link from "next/link";
import Logo from "@/app/components/Logo";
import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { copyLink } from "@/utils/share";

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [footerOpen, setFooterOpen] = useState<"terms" | "privacy" | "refund" | null>(null);

  const { isSignedIn, isLoaded, user } = useUser();
  const router = useRouter();

  const isAdmin =
    user?.primaryEmailAddress?.emailAddress ===
    process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setIsPWA(isStandalone);
  }, []);

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

  // ===== [START handleShare] =====
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    copyLink(undefined, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  // ===== [END handleShare] =====

  const closeMenu = () => setMenuOpen(false);
  // 🔥 ===== [START] scrollToSection =====
  const scrollToSection = (id: string) => {
    closeMenu();

    setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;

      const header =
        document.querySelector("header")
          ?.getBoundingClientRect()
          .height ?? 72;

      const y =
        el.getBoundingClientRect().top +
        window.scrollY -
        header -
        12;

      window.scrollTo({
        top: y,
        behavior: "smooth",
      });
    }, 80);
  };
  // useEffect(() => {
  //   const handlePopState = () => {
  //     // 무조건 다시 현재 페이지로 이동
  //     window.location.replace(window.location.href)
  //   }

  //   window.addEventListener("popstate", handlePopState)

  //   return () => {
  //     window.removeEventListener("popstate", handlePopState)
  //   }
  // }, [])
  return (
    <main style={mainStyle}>
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
          <div style={{
            ...rightWrap,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>

            {/* 버튼 그룹 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexShrink: 0,
                // width 제거 ❌
              }}
            >

              {/* 🔥 메인 CTA (확장) */}
              <a href="/app" style={{ ...linkReset, flex: 1 }}>
                <button
                  type="button"
                  style={{
                    ...btnHeaderPrimary,
                    width: "100%",
                  }}
                >
                  Unlock Full Access
                </button>
              </a>

              {!isPWA &&
                !(
                  typeof window !== "undefined" &&
                  (
                    (window as any).webkit?.messageHandlers ||
                    (window as any).AndroidBridge ||
                    navigator.userAgent.includes("ManyLangsApp/Android")
                  )
                ) && (
                  <>
                    <button
                      style={{
                        ...btnHeaderSecondary,
                        padding: "0 8px",
                        fontSize: 11,
                      }}
                      onClick={handleAndroidInstall}
                    >
                      Android
                    </button>

                    <button
                      style={{
                        ...btnHeaderSecondary,
                        padding: "0 8px",
                        fontSize: 11,
                      }}
                      onClick={handleIOSInstall}
                    >
                      IOS
                    </button>
                  </>
                )}

              {/* 🔥 공유 */}
              <button
                onClick={handleShare}
                style={{
                  ...btnHeaderSecondary,
                  minWidth: 88,
                }}
              >
                Copy link
              </button>
            </div>

            {/* 🔥 햄버거 여기 추가 */}
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              style={hamburger}
              className="mobile-only"
            >
              ☰
            </button>

          </div>


          {menuOpen && (
            <div style={mobileMenu}>
              <button style={mobileMenuLink} onClick={() => scrollToSection("demo")}>
                How you’ll learn
              </button>
              <button style={mobileMenuLink} onClick={() => scrollToSection("features")}>
                Features
              </button>
              <button style={mobileMenuLink} onClick={() => scrollToSection("how")}>
                How it works
              </button>
              <button style={mobileMenuLink} onClick={() => scrollToSection("usecases")}>
                Use Cases
              </button>
              <button style={mobileMenuLink} onClick={() => scrollToSection("pricing")}>
                Pricing
              </button>
            </div>
          )}

        </div>
      </header>
      <section style={heroSection}>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.5,
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          <span style={{ display: "block" }}>
            Learn to use real language — not just memorize it.
          </span>

          {/* 🔥 추가 (핵심: 결과 문장) */}
          <span style={{ display: "block", marginTop: 6 }}>
            Build real-world speaking skills step by step.
          </span>
        </p>

        <div
          style={{
            ...btnRow,
            justifyContent: "center",
            gap: 14, // 🔥 간격 업 (기존보다 넓게)
          }}
        >
          {/* 🔥 메인 CTA */}
          <a href="/demo" style={linkReset}>
            <button type="button" style={btnPrimary}>
              Try Free Lesson
            </button>
          </a>

          {/* 🔥 ===== [START] Curriculum CTA ===== */}
          <a href="/curriculum" style={linkReset}>
            <button
              type="button"
              style={{
                ...btnSecondary,
                border: "1px solid #bbb", // 🔥 더 또렷하게
                background: "#fff",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#f9f9f9";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "#fff";
              }}
            >
              View Full Curriculum
            </button>
          </a>
          {/* 🔥 ===== [END] Curriculum CTA ===== */}
        </div>

        {/* 🔥 신뢰 한 줄 */}
        <span
          style={{
            display: "block",
            fontSize: 13,
            opacity: 0.6,
            textAlign: "center",
            marginTop: 14, // 🔥 살짝 여유 추가
          }}
        >
          No sign-up required for demo
        </span>
      </section>
      {/* 🔥 Brand Logo Banner */}
      <section
        style={{
          width: "100%",
          padding: "8px 20px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8, // 🔥 간격 줄임
          }}
        >
          <Logo />

          {/* 기존 키워드 */}
          <span
            style={{
              display: "block",
              fontSize: 11,   // 🔥 12 → 11
              opacity: 0.5,   // 🔥 0.6 → 0.5
              textAlign: "center",
              marginTop: 4,
            }}
          >
            Grammar · Speaking · Vocabulary · Idioms · Real-world usage
          </span>
        </div>
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

        {/* 🔥 핵심 카피 */}
        <p
          style={{
            fontSize: 14,
            color: "#666",
            textAlign: "center",
            maxWidth: 520,
            margin: "0 auto 24px",
            lineHeight: 1.6,
          }}
        >
          See how you actually learn — step by step.
        </p>

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
              maxWidth: 720,
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
                boxShadow: "0 12px 32px rgba(0,0,0,0.08)",
              }}
            />
          </div>

          {/* 2️⃣ 라이브러리 */}
          <div
            style={{
              width: "100%",
              maxWidth: 640,
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

      <section id="features" style={sectionWrap}>
        <h2 style={sectionTitle}>Features</h2>

        <p
          style={{
            fontSize: 14,
            color: "#666",
            textAlign: "center",
            maxWidth: 520,
            margin: "0 auto 24px",
            lineHeight: 1.6,
          }}
        >
          Use language the way people actually speak in real life.
        </p>

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
            <div style={cardTitle}>Learn in 4 languages</div>
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

        {/* 🔥 추가 (SaaS 핵심 문장) */}
        <p
          style={{
            fontSize: 14,
            color: "#666",
            textAlign: "center",
            maxWidth: 520,
            margin: "0 auto 24px",
            lineHeight: 1.6,
          }}
        >
          Unlimited learning access with flexible coupon-based pricing.
        </p>

        <div style={pricingCard}>
          <h3 style={pricingTitle}>Coupon Packs</h3>

          <div
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: "#444",
              marginBottom: 16,
            }}
          >
            Purchase once and receive coupons.
            Each coupon unlocks one selected course for 30 days.
          </div>

          {/* 가격 테이블 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 16,
            }}
          >
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

          <a
            href="/app"
            style={{
              ...linkReset,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <button type="button" style={btnPrimary}>
              Purchase coupons after login
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
          <button type="button" style={btnHeaderPrimary}>
            Unlock Full Access
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
      <div
        style={{
          maxWidth: 600,
          margin: "40px auto 0",
          fontSize: 13,
          color: "#666",
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        ManyLangs is a language learning platform providing structured lessons for real-world communication.
        <br />
        Designed for learners worldwide.
      </div>
      {/* Footer */}
      <footer
        style={{
          ...footerStyle,
          paddingBottom: "env(safe-area-inset-bottom)", // 🔥 핵심
        }}
      >
        <div style={footerInner}>
          <p style={footerText}>General inquiries : help@manylangs.studio</p>

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
            <button
              onClick={() => setFooterOpen("refund")}
              style={{
                ...footerLink,
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Refund
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
                {footerOpen === "terms"
                  ? "Terms"
                  : footerOpen === "privacy"
                    ? "Privacy Policy"
                    : "Refund Policy"}
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

            {footerOpen === "refund" && (
              <div>
                <p>• Refund not available if any coupon from the same purchase has been used.</p>
                <p>• Coupons do not expire.</p>
                <p>• If multiple unused coupons exist across purchases, they may be refunded together.</p>
                <p>• Refunds are only provided in case of technical errors or duplicate charges.</p>
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
    @media (max-width: 768px) {
  .header-buttons button {
    padding: 6px 8px !important;
    font-size: 11px !important;
  }
}

`}</style>
      {copied && (
        <div
          style={{
            position: "fixed",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#111",
            color: "#fff",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 13,
            zIndex: 9999,
          }}
        >
          Link copied
        </div>
      )}
    </main >
  );
}

/* ================= Base ================= */

const mainStyle: React.CSSProperties = {
  background: "#fff",
  color: "#111",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  paddingTop: 0,
  minHeight: "100dvh", // 🔥 핵심 변경
  width: "100%",
  overflowX: "hidden",
};
// ===== [END mainStyle] =====

const linkReset: React.CSSProperties = {
  textDecoration: "none",
};

/* ================= Header ================= */
const headerStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  boxSizing: "border-box",
  zIndex: 9999,
  background: "#fff",
  borderBottom: "1px solid #eee",

  padding: "14px 16px",
  paddingTop: "calc(14px + env(safe-area-inset-top))", // 🔥 핵심

  height: "calc(64px + env(safe-area-inset-top))", // 🔥 핵심
};
// ===== [END headerStyle] =====
// ===== [END headerStyle] =====
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

const mobileMenuLink: React.CSSProperties = {
  width: "100%",
  background: "none",
  border: "none",
  textAlign: "left",
  color: "#222",
  fontSize: 15,
  fontWeight: 600,
  padding: "10px 12px",
  cursor: "pointer",
};
const mobileEmail: React.CSSProperties = {
  marginTop: 6,
  fontSize: 12,
  color: "#666",
};

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
  width: "100%",
  maxWidth: 720,
  margin: "0 auto",
  padding: "calc(var(--header-h) + env(safe-area-inset-top) + 24px) 16px 24px", // 🔥 핵심
  boxSizing: "border-box",
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

// 🔥 ===== [START] sectionWrap =====
const sectionWrap: React.CSSProperties = {
  width: "100%",
  maxWidth: 1000,
  margin: "0 auto",
  padding: "clamp(20px, 4vw, 40px) 16px",
  boxSizing: "border-box",
  scrollMarginTop: "var(--header-h)", // 🔥 추가
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
  width: "100%",
  maxWidth: 360,
  margin: "0 auto",
  padding: 20,
  boxSizing: "border-box", // 🔥 추가
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

const btnHeaderCTA: React.CSSProperties = {
  padding: "6px 10px",
  fontSize: 12,
  borderRadius: 6,
  background: "#111",
  color: "#fff",
  border: "none",
  fontWeight: 600,
};

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
  zIndex: 9999,
};

const modalContent: React.CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  padding: 20,
  width: "90%",
  maxWidth: 400,
};

const btnHeaderPrimary: React.CSSProperties = {
  height: 36,
  padding: "0 14px",
  fontSize: 13,
  borderRadius: 8,
  background: "#111",
  color: "#fff",
  border: "none",
  fontWeight: 600,
  whiteSpace: "nowrap",
  minWidth: 150,

  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const btnHeaderSecondary: React.CSSProperties = {
  height: 36,
  padding: "0 12px",
  borderRadius: 8,
  background: "#f5f5f5",
  border: "1px solid #e5e5e5",
  fontSize: 12,
  fontWeight: 500,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  whiteSpace: "nowrap",
};

const hamburger: React.CSSProperties = {
  width: 36,
  height: 36,
  fontSize: 16,
  background: "#fff",
  border: "1px solid #ddd",
  borderRadius: 8,

  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",

  cursor: "pointer",
  flexShrink: 0,
};

const mobileMenu: React.CSSProperties = {
  position: "absolute",
  top: 64,
  right: 16,
  width: 200,
  background: "#fff",
  border: "1px solid #eee",
  borderRadius: 12,
  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  padding: 8,
  display: "flex",
  flexDirection: "column",
  gap: 4,
  zIndex: 2000,
};