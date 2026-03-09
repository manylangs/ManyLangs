"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import IdiomAudioController from "@/components/audio/controllers/IdiomAudioController";
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

export default function IdiomViewer({ data, level, chapter, chapters }: any) {
  const router = useRouter();
  const [lang, setLang] = useState<StudyLang>("en");
  const { showTargetText } = useViewerTarget();

  const currentIndex = chapters.indexOf(chapter);
  const prev = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const next =
    currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  return (
    <>
      {/* 🔊 Audio (Header와 같은 레벨) */}
      <div
        style={{
          position: "sticky",
          top: 100,         // Header 높이에 맞춤
          zIndex: 900,
          background: "#fff",
          borderBottom: "1px solid #eee",
          padding: 0,
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <IdiomAudioController
            lang="kr"
            level={level}
            chapter={chapter}
          />
        </div>
      </div>

      {/* 본문 */}
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
                router.push(`/viewer/kr/idiom/${lv}/001`)
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
              prev && router.push(`/viewer/kr/idiom/${level}/${prev}`)
            }
          >
            ← Prev
          </button>

          <button
            style={buttonStyle(false)}
            disabled={!next}
            onClick={() =>
              next && router.push(`/viewer/kr/idiom/${level}/${next}`)
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
          {chapters.map((c: string) => (
            <button
              key={c}
              style={buttonStyle(c === chapter)}
              onClick={() =>
                router.push(`/viewer/kr/idiom/${level}/${c}`)
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

        {/* Idiom Sets */}
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

            {/* Expression */}
            {showTargetText && (
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                {block.expression.target}
              </div>
            )}

            {block.expression[lang] && (
              <div
                style={{
                  fontSize: 18,
                  color: "#555",
                  marginTop: showTargetText ? 0 : 2,
                }}
              >
                {block.expression[lang]}
              </div>
            )}

            {/* Frequency */}
            <div style={{ margin: "6px 0 16px", color: "#f5a623" }}>
              {block.frequency_stars}
            </div>

            {/* Explanation */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700 }}>Explanation</div>

              {showTargetText && <div>{block.explanation.target}</div>}

              {block.explanation[lang] && (
                <div style={{ color: "#555" }}>
                  {block.explanation[lang]}
                </div>
              )}
            </div>

            {/* Examples */}
            <div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                Examples
              </div>

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
                    <div style={{ color: "#555" }}>
                      {ex[lang]}
                    </div>
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

