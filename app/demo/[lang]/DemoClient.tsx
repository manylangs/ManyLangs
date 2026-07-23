"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { copyLink } from "@/utils/share";
import { LANGUAGES } from "@/app/config/languages";
import Link from "next/link";

const demoData = [
    { category: "Vocabulary", desc: "Learn essential words", icon: "📘", bg: "#fffaf6", items: [{ title: "A1 - Chapter 1", series: "voca" }] },
    { category: "Grammar", desc: "Understand sentence structures", icon: "🧠", bg: "#f6f8ff", items: [{ title: "A1 - Chapter 1", series: "grammar" }] },
    { category: "Conversation", desc: "Practice dialogues", icon: "💬", bg: "#f6fff9", items: [{ title: "A1 - Chapter 1", series: "conversation" }] },
    { category: "Idioms", desc: "Learn expressions", icon: "🎭", bg: "#f9f6ff", items: [{ title: "A1 - Chapter 1", series: "idiom" }] },
    { category: "Real Situations", desc: "Real-life language", icon: "🌍", bg: "#f6fbff", items: [{ title: "A1 - Chapter 1", series: "real" }] },
];

const languageNames: Record<string, string> = {
    kr: "Korean",
    en: "English",
    es: "Spanish",
    fr: "French",
    pt: "Portuguese",
};

export default function DemoClient({ lang }: { lang: string }) {
    const router = useRouter();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        copyLink(undefined, () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleLangChange = (newLang: string) => {
        router.push(`/demo/${newLang}`);
    };

    return (
        <main style={container}>
            <div style={wrapper}>

                {/* HEADER */}
                <div style={headerWrap}>
                    {/* 🔥 1줄: Sign In / Create Account — 좌우 꽉 채움 */}
                    <div style={authRow}>
                        <Link href="/login" style={{ flex: 1, textDecoration: "none" }}>
                            <button type="button" style={{ ...btnBack, width: "100%" }}>
                                Sign In
                            </button>
                        </Link>

                        <Link href="/signup" style={{ flex: 1, textDecoration: "none" }}>
                            <button type="button" style={{ ...btnHeaderPrimary, width: "100%" }}>
                                Create Account
                            </button>
                        </Link>
                    </div>

                    {/* 🔥 2줄: Back / Copy link */}
                    <div style={secondaryRow}>
                        <button
                            type="button"
                            onClick={() => router.back()}
                            style={btnBack}
                        >
                            ← Back
                        </button>

                        <button
                            type="button"
                            onClick={handleCopy}
                            style={btnSecondary}
                        >
                            Copy link
                        </button>
                    </div>
                </div>

                {/* INFO */}
                <div style={infoBox}>
                    <p style={infoText}>You're viewing sample content.</p>

                    <select
                        value={lang}
                        onChange={(e) => handleLangChange(e.target.value)}
                        style={selectStyle}
                        suppressHydrationWarning
                    >
                        {LANGUAGES.map((l) => (
                            <option key={l.code} value={l.code}>
                                {l.label}
                            </option>
                        ))}
                    </select>
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
                                <div
                                    key={item.series}
                                    onClick={() => {
                                        window.location.href = `/demo/viewer/${lang}/${item.series}/a1/001?mode=demo`;
                                    }}
                                    style={{
                                        ...card,
                                        background: section.bg,
                                        cursor: "pointer",
                                    }}
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
                                        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 10px 24px rgba(0,0,0,0.08)";
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                                        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 6px rgba(0,0,0,0.04)";
                                    }}
                                >
                                    <div>
                                        <h3 style={cardTitle}>
                                            {languageNames[lang] ?? lang} {item.title}
                                        </h3>
                                        <p style={cardMeta}>Beginner • A1</p>
                                    </div>

                                    <p style={cardHint}>👉 Start learning</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
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
        </main>
    );
}

/* ================= styles ================= */

const container: CSSProperties = {
    minHeight: "100dvh",
    display: "flex",
    justifyContent: "center",
    background: "#fff",
};

const wrapper: CSSProperties = {
    width: "100%",
    maxWidth: 900,
    padding: "clamp(20px, 4vw, 40px)",
};

const baseBtn: CSSProperties = {
    padding: "6px 10px",
    fontSize: 13,
    lineHeight: 1.2,
    borderRadius: 8,
    WebkitAppearance: "none",
    appearance: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
};

const btnBack: CSSProperties = {
    ...baseBtn,
    border: "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
};

const btnSecondary: CSSProperties = {
    ...baseBtn,
    border: "1px solid #ddd",
    background: "#f5f5f5",
    cursor: "pointer",
};

const btnHeaderPrimary: CSSProperties = {
    ...baseBtn,
    background: "#111",
    color: "#fff",
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
};

const infoBox: CSSProperties = {
    marginBottom: 28,
};

const infoText: CSSProperties = {
    color: "#555",
    marginBottom: 8,
};

const selectStyle: CSSProperties = {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
};

const sectionWrap: CSSProperties = {
    marginBottom: 36,
};

const sectionHeader: CSSProperties = {
    display: "flex",
    gap: 12,
    marginBottom: 14,
};

const iconStyle: CSSProperties = {
    fontSize: 22,
};

const sectionTitle: CSSProperties = {
    fontWeight: 700,
    fontSize: 18,
};

const sectionDesc: CSSProperties = {
    color: "#777",
    fontSize: 13,
};

const grid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
};

const card: CSSProperties = {
    padding: 20,
    borderRadius: 16,
    border: "1px solid rgba(0,0,0,0.04)",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
};

const cardTitle: CSSProperties = {
    fontWeight: 700,
    fontSize: 16,
};

const cardMeta: CSSProperties = {
    fontSize: 12,
    color: "#999",
};

const cardHint: CSSProperties = {
    marginTop: 12,
    fontSize: 13,
    color: "#111",
    fontWeight: 600,
};

/* 🔥 헤더 전체 래퍼 */
const headerWrap: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginBottom: 20,
    paddingTop: "calc(env(safe-area-inset-top) + 8px)",
};

/* 🔥 1줄: Sign In / Create Account — 좌우 꽉 채움, 같은 너비 */
const authRow: CSSProperties = {
    display: "flex",
    gap: 8,
    width: "100%",
};

/* 🔥 2줄: Back / Copy link */
const secondaryRow: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
};