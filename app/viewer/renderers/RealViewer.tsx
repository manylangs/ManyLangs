"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import RealAudioController from "@/components/audio/controllers/RealAudioController";
import { useViewerTarget } from "../context/ViewerTargetContext";

type StudyLang = "en" | "es" | "fr" | "pt";

type Sentence = {
  texts: {
    kr: string;
    en: string;
    es: string;
    fr: string;
    pt: string;
  };
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
  const { showTargetText } = useViewerTarget();

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
    <>
      {/* 🔊 Audio (Header와 같은 레벨) */}
      <div
        style={{
          position: "sticky",
          top: 100,       // Header 높이에 맞춤
          zIndex: 900,
          background: "#fff",
          borderBottom: "1px solid #eee",
          padding: 0,
        }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <RealAudioController
            src={`/audio/real/${level}/${chapter}.wav`}
          />
        </div>
      </div>

      {/* 본문 */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>

        {/* 🌐 학습 언어 선택 */}
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

        {/* 🔢 챕터 네비게이션 */}
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
              href={`/viewer/kr/real/${level}/${ch}`}
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
          <Link
            href={`/viewer/kr/real/${level}/${prev}`}
            style={buttonStyle()}
          >
            ← Prev
          </Link>

          <Link
            href={`/viewer/kr/real/${level}/${next}`}
            style={buttonStyle()}
          >
            Next →
          </Link>
        </div>

        {/* 🖼 + 📝 콘텐츠 */}
        <div
          style={{
            display: "flex",
            gap: 24,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          {/* 이미지 */}
          {imageBlock && (
            <div style={{ flex: "0 0 360px" }}>
              <img
                src={`/books/kr/real/${level}/${imageBlock.src}`}
                alt=""
                style={{ width: "100%", borderRadius: 8 }}
              />
            </div>
          )}

          {/* 설명 */}
          {descBlock && (
            <div style={{ flex: "1 1 320px" }}>
              {descBlock.sentences.map((s, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  {showTargetText && <div>{s.texts.kr}</div>}

                  <div
                    style={{
                      color: "#444",
                      marginTop: showTargetText ? 2 : 0,
                    }}
                  >
                    {s.texts[lang]}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
