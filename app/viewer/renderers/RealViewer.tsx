"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import RealAudioController from "@/components/audio/controllers/RealAudioController";

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
  border: "none",
  cursor: "pointer",
  textDecoration: "none",
});

export default function RealViewer({ level, chapter, data }: Props) {
  const [lang, setLang] = useState<StudyLang>("en");

  const chapters = useMemo(
    () => Array.from({ length: 20 }, (_, i) => String(i + 1).padStart(3, "0")),
    []
  );

  const index = chapters.indexOf(chapter);
  const prev = index > 0 ? chapters[index - 1] : chapter;
  const next = index < chapters.length - 1 ? chapters[index + 1] : chapter;

  const imageBlock = data.blocks.find(
    (b) => b.type === "image"
  ) as { type: "image"; src: string } | undefined;

  const descBlock = data.blocks.find(
    (b) => b.type === "description"
  ) as { type: "description"; sentences: Sentence[] } | undefined;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      {/* 🔊 오디오 (상단 고정) */}
      <RealAudioController src={`/audio/real/${level}/${chapter}.wav`} />

      {/* 🌐 언어 선택 */}
      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
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

      {/* 🔢 챕터 네비게이션 (001–020) */}
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 16,
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

      {/* ⬅ Prev / Next */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Link href={`/viewer/real/${level}/${prev}`} style={buttonStyle()}>
          ← Prev
        </Link>
        <Link href={`/viewer/real/${level}/${next}`} style={buttonStyle()}>
          Next →
        </Link>
      </div>

      {/* 🖼 + 📝 Scene Row */}
      <div
        style={{
          display: "flex",
          gap: 24,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        {/* 이미지 (왼쪽) */}
        {imageBlock && (
          <div style={{ flex: "0 0 360px" }}>
            <img
              src={`/books/real/${level}/${imageBlock.src}`}
              alt=""
              style={{ width: "100%", borderRadius: 8 }}
            />
          </div>
        )}

        {/* 설명 (오른쪽) */}
        {descBlock && (
          <div style={{ flex: "1 1 320px" }}>
            {descBlock.sentences.map((s, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div>{s.target}</div>
                <div style={{ color: "#444", marginTop: 2 }}>
                  {s[lang]}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
