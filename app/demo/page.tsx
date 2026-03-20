"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

const demoData = [
    {
        category: "Vocabulary",
        desc: "Learn essential words for this chapter",
        icon: "📘",
        items: [
            {
                title: "Korean A1 - Chapter 1",
                href: "/demo/viewer/kr/voca/a1/001?mode=demo",
            },
        ],
    },
    {
        category: "Grammar",
        desc: "Understand sentence structures and rules",
        icon: "🧠",
        items: [
            {
                title: "Korean A1 - Chapter 1",
                href: "/demo/viewer/kr/grammar/a1/001?mode=demo",
            },
        ],
    },
    {
        category: "Conversation",
        desc: "Practice real dialogues",
        icon: "💬",
        items: [
            {
                title: "Korean A1 - Chapter 1",
                href: "/demo/viewer/kr/conversation/a1/001?mode=demo",
            },
        ],
    },
    {
        category: "Idioms",
        desc: "Learn common expressions",
        icon: "🎭",
        items: [
            {
                title: "Korean A1 - Chapter 1",
                href: "/demo/viewer/kr/idiom/a1/001?mode=demo",
            },
        ],
    },
    {
        category: "Real Situations",
        desc: "Apply language in real-life contexts",
        icon: "🌍",
        items: [
            {
                title: "Korean A1 - Chapter 1",
                href: "/demo/viewer/kr/real/a1/001?mode=demo",
            },
        ],
    },
];

export default function DemoPage() {
    return (
        <main style={container}>
            <div style={wrapper}>
                {/* HEADER */}
                <div style={headerRow}>
                    <div style={headerLeft}>
                        <Link href="/" style={linkReset}>
                            <button type="button" style={btnBack}>
                                ← Back
                            </button>
                        </Link>

                        <h1 style={title}>Try Demo</h1>
                    </div>

                    <div style={headerActions}>
                        <button
                            onClick={async () => {
                                if (navigator.share) {
                                    try {
                                        await navigator.share({
                                            title: "Try Demo",
                                            url: window.location.href,
                                        });
                                    } catch { }
                                } else {
                                    await navigator.clipboard.writeText(window.location.href);
                                    alert("Link copied!");
                                }
                            }}
                            style={btnSecondary}
                        >
                            Copy link
                        </button>

                        <Link href="/app" style={linkReset}>
                            <button type="button" style={btnPrimary}>
                                Get Started
                            </button>
                        </Link>
                    </div>
                </div>

                {/* TEXT */}
                <div style={infoBox}>
                    <p style={infoText}>
                        Although these are Korean samples, there are various languages you can learn.
                    </p>
                    <p style={infoText}>
                        To check the available languages, click the{" "}
                        <strong>Get Started</strong> button.
                    </p>
                </div>

                {/* CONTENT */}
                {demoData.map((section) => (
                    <div key={section.category} style={sectionWrap}>
                        <div style={sectionHeader}>
                            <div style={iconStyle}>{section.icon}</div>

                            <div>
                                <h2 style={sectionTitle}>{section.category}</h2>
                                <p style={sectionDesc}>{section.desc}</p>
                            </div>
                        </div>

                        <div style={grid}>
                            {section.items.map((item) => (
                                <Link key={item.href} href={item.href} style={card}>
                                    <div>
                                        <h3 style={cardTitle}>{item.title}</h3>
                                        <p style={cardMeta}>Beginner • A1</p>
                                    </div>

                                    <p style={cardHint}>Start learning →</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}

/* ================== styles ================== */

const container: CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    background: "#fafafa",
};

const wrapper: CSSProperties = {
    width: "100%",
    maxWidth: 900,
    padding: "clamp(20px, 4vw, 40px) clamp(16px, 4vw, 24px)",
};

/* HEADER */
const headerRow: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
};

const headerLeft: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
};

const title: CSSProperties = {
    fontSize: "clamp(24px, 5vw, 32px)",
    fontWeight: 700,
    margin: 0,
};

const headerActions: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
};

/* INFO BOX */
const infoBox: CSSProperties = {
    marginBottom: 24,
};

const infoText: CSSProperties = {
    fontSize: "clamp(14px, 3.5vw, 16px)",
    color: "#555",
    marginTop: 0,
    marginBottom: 6,
    lineHeight: 1.6,
};

/* SECTION */
const sectionWrap: CSSProperties = {
    marginBottom: 28,
};

const sectionHeader: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
};

const iconStyle: CSSProperties = {
    fontSize: 22,
};

const sectionTitle: CSSProperties = {
    fontSize: "clamp(16px, 4vw, 20px)",
    fontWeight: 600,
    margin: 0,
};

const sectionDesc: CSSProperties = {
    fontSize: "clamp(13px, 3.5vw, 14px)",
    color: "#777",
    marginTop: 4,
    marginBottom: 0,
};

/* GRID */
const grid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
};

/* CARD */
const card: CSSProperties = {
    padding: 20,
    border: "1px solid #e5e5e5",
    borderRadius: 14,
    textDecoration: "none",
    color: "#111",
    background: "#fff",
    transition: "all 0.2s ease",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 110,
};

const cardTitle: CSSProperties = {
    fontSize: 16,
    fontWeight: 600,
    marginTop: 0,
    marginBottom: 6,
};

const cardMeta: CSSProperties = {
    fontSize: 12,
    color: "#999",
    margin: 0,
};

const cardHint: CSSProperties = {
    fontSize: 13,
    color: "#666",
    marginTop: 12,
    marginBottom: 0,
};

/* BUTTONS */
const btnPrimary: CSSProperties = {
    padding: "8px 14px",
    fontSize: 13,
    borderRadius: 8,
    border: "none",
    background: "#111",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
};

const btnSecondary: CSSProperties = {
    padding: "8px 14px",
    fontSize: 13,
    borderRadius: 8,
    border: "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
};

const btnBack: CSSProperties = {
    padding: "8px 12px",
    fontSize: 14,
    borderRadius: 10,
    border: "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 500,
};

/* LINK */
const linkReset: CSSProperties = {
    textDecoration: "none",
};