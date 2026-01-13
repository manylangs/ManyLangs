"use client";

import { useState } from "react";
import Link from "next/link";

type GrammarBlock = {
  type: string;
  sentences?: Record<string, string>;
  variant?: string;
};

type GrammarData = {
  title?: Record<string, string>;
  blocks: GrammarBlock[];
};

type Props = {
  grammarData: GrammarData;
  level: string;
  chapter: string;
  chapters: string[];
};

const STUDY_LANGS = ["en", "es", "fr", "pt"] as const;
type StudyLang = (typeof STUDY_LANGS)[number];

const buttonStyle = (active: boolean) => ({
  padding: "4px 8px",
  borderRadius: 4,
  fontSize: 14,
  background: active ? "#333" : "#eee",
  color: active ? "#fff" : "#333",
  border: "none",
  cursor: active ? "default" : "pointer",
  textDecoration: "none",
});

export default function GrammarViewer({
  grammarData,
  level,
  chapter,
  chapters,
}: Props) {
  const [lang, setLang] = useState<StudyLang>("en");

  const currentIndex = chapters.indexOf(chapter);

  const prev =
    currentIndex > 0 ? chapters[currentIndex - 1] : chapter;

  const next =
    currentIndex < chapters.length - 1
      ? chapters[currentIndex + 1]
      : chapter;

  const explanations = grammarData.blocks.filter(
    (b) => b.type === "grammar_explanation"
  );

  const examples = grammarData.blocks.filter(
    (b) => b.type === "grammar_example"
  );

  const byVariant = (v: string) =>
    examples.filter((b) => b.variant === v);

  const renderLine = (b: GrammarBlock, i: number) => {
    const target = b.sentences?.target;
    const study = b.sentences?.[lang];
    if (!target) return null;

    return (
      <div key={i} style={{ marginBottom: 12 }}>
        <div>{target}</div>
        {study && (
          <div style={{ color: "#444", marginTop: 2 }}>
            {study}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      {/* ===== Study Language ===== */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {STUDY_LANGS.map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            style={buttonStyle(lang === l)}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ===== Prev / Next ===== */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <Link
          href={`/viewer/kr/grammar/${level}/${prev}`}
          style={buttonStyle(false)}
        >
          ← Prev
        </Link>
        <Link
          href={`/viewer/kr/grammar/${level}/${next}`}
          style={buttonStyle(false)}
        >
          Next →
        </Link>
      </div>

      {/* ===== Chapter Navigation ===== */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 24,
        }}
      >
        {chapters.map((ch) => {
          const active = ch === chapter;
          return (
            <Link
              key={ch}
              href={`/viewer/kr/grammar/${level}/${ch}`}
              style={buttonStyle(active)}
            >
              {ch}
            </Link>
          );
        })}
      </div>

      {/* ===== Title ===== */}
      <section style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 24, fontWeight: 700 }}>
          {grammarData.title?.target}
        </div>
        {grammarData.title?.[lang] && (
          <div
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: "#444",
              marginTop: 6,
            }}
          >
            {grammarData.title[lang]}
          </div>
        )}
      </section>

      {/* ===== Explanation ===== */}
      <section style={{ marginBottom: 32 }}>
        <h3>Explanation</h3>
        {explanations.map(renderLine)}
      </section>

      {/* ===== Examples ===== */}
      <section>
        <h3>Examples</h3>

        <h4>Core Patterns</h4>
        {byVariant("core_patterns").map(renderLine)}

        <h4>Variations</h4>
        {byVariant("variations").map(renderLine)}

        <h4>Extended Examples</h4>
        {byVariant("extended_usage").map(renderLine)}
      </section>
    </div>
  );
}
