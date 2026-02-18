"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import VocaAudioController from "@/components/audio/controllers/VocaAudioController";
import { useViewerTarget } from "../context/ViewerTargetContext";

const STUDY_LANGS = ["en", "es", "fr", "pt"] as const;
type StudyLang = (typeof STUDY_LANGS)[number];

const LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"];

const buttonStyle = (active: boolean) => ({
  padding: "4px 8px",
  borderRadius: 4,
  fontSize: 14,
  background: active ? "#333" : "#eee",
  color: active ? "#fff" : "#333",
  border: "none",
  cursor: "pointer",
});

type Props = {
  data: any;
  level: string;
  chapter: string;
  chapters: string[];
};

export default function VocabularyViewer({
  data,
  level,
  chapter,
  chapters,
}: Props) {
  const router = useRouter();
  const [lang, setLang] = useState<StudyLang>("en");
  const { showTargetText } = useViewerTarget();

  const currentIndex = chapters.indexOf(chapter);
  const prev = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const next =
    currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  return (
    <>
      {/* 🔒 Audio를 Header와 같은 레벨로 분리 */}
      <div
        style={{
          position: "sticky",
          top: 64,          // Header 높이에 맞춤 (필요시 60~72 조정)
          zIndex: 900,
          background: "#fff",
          padding: "16px 24px 12px",
          borderBottom: "1px solid #eee",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <VocaAudioController lang="kr" level={level} chapter={chapter} />
        </div>
      </div>

      {/* 본문 wrapper */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>

        {/* Level Navigation */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          {LEVELS.map((lv) => (
            <button
              key={lv}
              style={buttonStyle(lv === level)}
              onClick={() =>
                router.push(`/viewer/kr/voca/${lv}/001`)
              }
            >
              {lv.toUpperCase()}
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
          <button
            style={buttonStyle(false)}
            disabled={!prev}
            onClick={() =>
              prev && router.push(`/viewer/kr/voca/${level}/${prev}`)
            }
          >
            ← Prev
          </button>

          <button
            style={buttonStyle(false)}
            disabled={!next}
            onClick={() =>
              next && router.push(`/viewer/kr/voca/${level}/${next}`)
            }
          >
            Next →
          </button>
        </div>

        {/* Chapter Buttons */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          {chapters.map((c) => (
            <button
              key={c}
              style={buttonStyle(c === chapter)}
              onClick={() =>
                router.push(`/viewer/kr/voca/${level}/${c}`)
              }
            >
              {c}
            </button>
          ))}
        </div>

        {/* Study Language */}
        <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
          {STUDY_LANGS.map((l) => (
            <button
              key={l}
              style={buttonStyle(lang === l)}
              onClick={() => setLang(l)}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          {showTargetText && (
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {data.title?.target}
            </div>
          )}

          {data.title?.[lang] && (
            <div
              style={{
                fontSize: 22,
                fontWeight: 400,
                color: "#555",
                marginTop: showTargetText ? 4 : 0,
              }}
            >
              {data.title[lang]}
            </div>
          )}
        </div>

        {/* Vocabulary Sets */}
        {data.blocks.map((block: any, idx: number) => (
          <section key={idx} style={{ marginBottom: 56 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              Set {idx + 1}
            </div>

            {showTargetText && (
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                {block.word.target}
              </div>
            )}

            {block.word[lang] && (
              <div
                style={{
                  fontSize: 18,
                  color: "#555",
                  marginTop: showTargetText ? 0 : 2,
                }}
              >
                {block.word[lang]}
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              {block.examples.map((ex: any, i: number) => (
                <div
                  key={i}
                  style={{
                    borderBottom: "1px solid #eee",
                    marginBottom: 12,
                    paddingBottom: 12,
                  }}
                >
                  {showTargetText && <div>{ex.target}</div>}
                  {ex[lang] && (
                    <div style={{ color: "#555" }}>{ex[lang]}</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
