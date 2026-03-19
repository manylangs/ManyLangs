//랜딩페이지
"use client";

import Link from "next/link";
import Logo from "@/app/components/Logo";
import React, { useState } from "react";

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

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
      {/* Header */}
      <header style={headerStyle}>
        <div style={headerInner}>
          <div style={logoWrap}>
            <Logo />
          </div>

          {/* Desktop Nav */}
          <nav style={navStyle} className="desktop-nav">
            <a href="#features" style={navItem}>
              Features
            </a>
            <a href="#usecases" style={navItem}>
              Use Cases
            </a>
            <a href="#how" style={navItem}>
              How it works
            </a>
            <a href="#pricing" style={navItem}>
              Pricing
            </a>
          </nav>

          {/* Right Area */}
          <div style={rightWrap}>
            <span style={rightArea} className="desktop-email">
              manylangs.help@gmail.com
            </span>

            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              style={hamburger}
              className="mobile-only"
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              ☰
            </button>
          </div>
        </div>

        {menuOpen && (
          <div style={mobileMenu}>
            <a href="#features" style={mobileMenuLink} onClick={closeMenu}>
              Features
            </a>
            <a href="#usecases" style={mobileMenuLink} onClick={closeMenu}>
              Use Cases
            </a>
            <a href="#how" style={mobileMenuLink} onClick={closeMenu}>
              How it works
            </a>
            <a href="#pricing" style={mobileMenuLink} onClick={closeMenu}>
              Pricing
            </a>
            <div style={mobileEmail}>manylangs.help@gmail.com</div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section style={heroSection}>
        <p style={heroSub}>Structured language learning for real users</p>

        <h1 style={heroTitle}>ManyLangs</h1>

        <p style={heroDesc}>
          Learn languages through structured textbooks.
          <br />
          Grammar, conversation, vocabulary, idioms, and real-life situations —
          all in one organized learning flow.
        </p>

        <div style={btnRow}>
          <a href="/demo" style={linkReset}>
            <button type="button" style={btnSecondary}>
              Try Demo
            </button>
          </a>

          <Link href="/app" style={linkReset}>
            <button type="button" style={btnPrimary}>
              Get Started
            </button>
          </Link>

          <button type="button" onClick={handleShare} style={btnSecondary}>
            Share
          </button>
        </div>

        <div style={keywordText}>
          Grammar • Conversation • Vocabulary • Idioms • Real-life situations
        </div>
      </section>

      {/* Features */}
      <section id="features" style={sectionWrap}>
        <h2 style={sectionTitle}>Features</h2>

        <div style={grid2}>
          <div style={card}>
            <h3 style={cardTitle}>Structured Learning</h3>
            <p style={text}>
              Learn languages through organized textbook-based content.
            </p>
          </div>

          <div style={card}>
            <h3 style={cardTitle}>Real Use Cases</h3>
            <p style={text}>Practice language through real scenarios.</p>
          </div>
        </div>
      </section>

      {/* How */}
      <section id="how" style={sectionWrap}>
        <h2 style={sectionTitle}>How it works</h2>

        <div style={column}>
          <div style={stepItem}>
            <strong>Step 1</strong> – Sign in
          </div>
          <div style={stepItem}>
            <strong>Step 2</strong> – Dashboard
          </div>
          <div style={stepItem}>
            <strong>Step 3</strong> – Learn
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="usecases" style={sectionWrap}>
        <h2 style={sectionTitle}>Use Cases</h2>

        <div style={grid4}>
          {["Study", "Conversation", "Travel", "Daily"].map((item) => (
            <div key={item} style={cardSmall}>
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={sectionCenter}>
        <h2 style={sectionTitle}>Pricing</h2>

        <div style={pricingCard}>
          <h3 style={pricingTitle}>$9 / month</h3>
          <a href="/app" style={linkReset}>
            <button type="button" style={btnPrimary}>
              Subscribe
            </button>
          </a>
        </div>
      </section>

      {/* CTA */}
      <section style={sectionCenterLarge}>
        <h2 style={ctaTitle}>Start learning today</h2>

        <a href="/app" style={linkReset}>
          <button type="button" style={btnPrimary}>
            Get Started
          </button>
        </a>
      </section>

      {/* Footer */}
      <footer style={footerStyle}>
        <div style={footerInner}>
          <p style={footerText}>manylangs.help@gmail.com</p>

          <div style={footerLinks}>
            <a href="/terms" style={footerLink}>
              Terms
            </a>
            <a href="/privacy" style={footerLink}>
              Privacy
            </a>
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }

          .desktop-email {
            display: none !important;
          }

          .mobile-only {
            display: inline-flex !important;
          }
        }

        @media (min-width: 769px) {
          .mobile-only {
            display: none !important;
          }
        }
      `}</style>
    </main>
  );
}

/* ================= Base ================= */

const mainStyle: React.CSSProperties = {
  background: "#fff",
  color: "#111",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  paddingTop: 72,
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
  zIndex: 1000,
  background: "#fff",
  borderBottom: "1px solid #eee",
  padding: "14px 20px",
};

const headerInner: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
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
  display: "none",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
  fontSize: 22,
  lineHeight: 1,
  background: "#fff",
  border: "1px solid #ddd",
  borderRadius: 8,
  cursor: "pointer",
};

const mobileMenu: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
  padding: "16px 20px 20px",
  borderTop: "1px solid #eee",
  background: "#fff",
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

const heroSection: React.CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
  padding: "clamp(60px, 10vw, 100px) 20px",
  textAlign: "center",
};

const heroSub: React.CSSProperties = {
  fontSize: 13,
  color: "#666",
  marginBottom: 10,
};

const heroTitle: React.CSSProperties = {
  fontSize: "clamp(28px, 6vw, 44px)",
  fontWeight: 700,
  lineHeight: 1.1,
  margin: "0 0 14px",
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
  maxWidth: 1000,
  margin: "0 auto",
  padding: "clamp(40px, 8vw, 70px) 20px",
};

const sectionCenter: React.CSSProperties = {
  maxWidth: 1000,
  margin: "0 auto",
  padding: "clamp(40px, 8vw, 70px) 20px",
  textAlign: "center",
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
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 10,
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
};

const pricingCard: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 12,
  padding: 24,
  maxWidth: 360,
  margin: "0 auto",
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

