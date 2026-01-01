"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type StudyLang = "en" | "es" | "fr" | "pt";

type Sentence = {
  target: string;
  en: string;
  es: string;
  fr: string;
  pt: string;
};

type Block =
  | { type: "image"; src: string }
  | { type: "description"; sentences: Sentence[] };

type RealData = {
  meta: {
    series: "real";
    level: string;
    id: string;
  };
  blocks: Block[];
};

type Props = {
  level: string;
  chapter: string;
  data: RealData;
};

const LANGS: StudyLang[] = ["en", "es", "fr", "pt"];

const buttonStyle = (active = false) => ({
  padding: "4px 8px",
  borderRadius: 4,
  fontSize: 14,
  background: active ? "#333" : "#eee",
  color: active ? "#fff" : "#333",
  textDecoration: "none",
  border: "none",
  cursor: active ? "default" : "pointer",
});

export default function RealViewer({ level, chapter, data }: Props) {
  const [lang, setLang] = useState<StudyLang>("en");

  const chapters = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) =>
        String(i + 1).padStart(3, "0")
      ),
    []
  );

  const index = chapters.indexOf(chapter);
  const prev = index > 0 ? chapters[index - 1] : chapter;
  const next =
    index < chapters.length - 1 ? chapters[index + 1] : chapter;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      {/* 언어 선택 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {LANGS.map((l) => (
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
          href={`/viewer/real/${level}/${prev}`}
          style={buttonStyle()}
        >
          ← Prev
        </Link>
        <Link
          href={`/viewer/real/${level}/${next}`}
          style={buttonStyle()}
        >
          Next →
        </Link>
      </div>

      {/* 챕터 버튼 */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 24,
        }}
      >
        {chapters.map((ch) => (
          <Link
            key={ch}
            href={`/viewer/real/${level}/${ch}`}
            style={buttonStyle(ch === chapter)}
          >
            {ch}
          </Link>
        ))}
      </div>

      {/* 콘텐츠 */}
      {data.blocks.map((block, i) => {
        if (block.type === "image") {
          return (
            <div key={i} style={{ marginBottom: 24 }}>
              <img
                src={`/books/real/${level}/${block.src}`}
                alt=""
                style={{ width: "100%", borderRadius: 8 }}
              />
            </div>
          );
        }

        if (block.type === "description") {
          return (
            <div key={i} style={{ marginBottom: 24 }}>
              {block.sentences.map((s, j) => (
                <div key={j} style={{ marginBottom: 12 }}>
                  <div>{s.target}</div>
                  <div style={{ color: "#444", marginTop: 2 }}>
                    {s[lang]}
                  </div>
                </div>
              ))}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
