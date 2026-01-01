"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type StudyLang = "en" | "es" | "fr" | "pt";

type IdiomBlock = {
  type: "expression";
  expression: {
    target: string;
    en: string;
    es: string;
    fr: string;
    pt: string;
  };
  frequency?: {
    rank?: number;
    stars?: number;
  };
  examples?: Array<{
    target: string;
    en: string;
    es: string;
    fr: string;
    pt: string;
  }>;
};

type IdiomData = {
  meta: {
    series: string;
    level: string;
    id: string;
  };
  title: {
    target: string;
    en: string;
    es: string;
    fr: string;
    pt: string;
  };
  blocks: IdiomBlock[];
};

type Props = {
  level: string;
  chapter: string;
  chapters?: string[];
  data: IdiomData;
};

/* ✅ 버튼 디자인 – 사용자 제공 그대로 */
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

export default function IdiomViewer({
  level,
  chapter,
  chapters = [],
  data,
}: Props) {
  const [lang, setLang] = useState<StudyLang>("en");

  const currentIndex = useMemo(() => {
    if (!Array.isArray(chapters)) return -1;
    return chapters.indexOf(chapter);
  }, [chapters, chapter]);

  const prev =
    currentIndex > 0 ? chapters[currentIndex - 1] : chapter;
  const next =
    currentIndex >= 0 && currentIndex < chapters.length - 1
      ? chapters[currentIndex + 1]
      : chapter;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      {/* 언어 선택 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {(["en", "es", "fr", "pt"] as StudyLang[]).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            style={buttonStyle(lang === l)}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Prev / Next */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <Link
          href={`/viewer/kr/idiom/${level}/${prev}`}
          style={buttonStyle(false)}
        >
          ← Prev
        </Link>
        <Link
          href={`/viewer/kr/idiom/${level}/${next}`}
          style={buttonStyle(false)}
        >
          Next →
        </Link>
      </div>

      {/* 챕터 버튼 */}
      {chapters.length > 0 && (
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
                href={`/viewer/kr/idiom/${level}/${ch}`}
                style={buttonStyle(active)}
              >
                {ch}
              </Link>
            );
          })}
        </div>
      )}

      {/* 제목 */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 24, fontWeight: 700 }}>
          {data.title.target}
        </div>
        <div style={{ fontSize: 18, color: "#444", marginTop: 6 }}>
          {data.title[lang]}
        </div>
      </section>

      {/* Idiom 목록 */}
      <section>
        {data.blocks.map((b, idx) => (
          <div key={idx} style={{ marginBottom: 32 }}>
            {/* 표현 */}
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {b.expression.target}
            </div>
            <div style={{ fontSize: 16, color: "#444", marginTop: 4 }}>
              {b.expression[lang]}
            </div>

            {/* 빈도 */}
            {b.frequency && (
              <div style={{ fontSize: 13, color: "#777", marginTop: 4 }}>
                {b.frequency.stars
                  ? "★".repeat(b.frequency.stars)
                  : ""}
                {b.frequency.rank
                  ? ` (Rank ${b.frequency.rank})`
                  : ""}
              </div>
            )}

            {/* 예문 */}
            {b.examples && (
              <div style={{ marginTop: 10 }}>
                {b.examples.map((ex, j) => (
                  <div key={j} style={{ marginBottom: 6 }}>
                    <div>{ex.target}</div>
                    <div style={{ color: "#444" }}>
                      {ex[lang]}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
