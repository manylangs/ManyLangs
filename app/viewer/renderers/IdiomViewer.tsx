"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

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

export default function IdiomViewer({
  data,
  level,
  chapter,
  chapters,
}: any) {
  const [lang, setLang] = useState<StudyLang>("en");
  const router = useRouter();

  const currentIndex = useMemo(
    () => chapters.indexOf(chapter),
    [chapters, chapter]
  );

  const prev = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const next =
    currentIndex < chapters.length - 1
      ? chapters[currentIndex + 1]
      : null;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      {/* ===== 챕터 네비게이션 (Conversation 동일) ===== */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
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

      {/* ===== 챕터 번호 버튼 ===== */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 20,
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

      {/* ===== 학습 언어 선택 (Conversation 동일) ===== */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
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

      {/* ===== Idiom Blocks ===== */}
      {data.blocks.map((block: any, idx: number) => (
        <section key={idx} style={{ marginBottom: 48 }}>
          {/* 표현 */}
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {block.expression.target}
          </div>

          {block.expression[lang] && (
            <div style={{ fontSize: 18, color: "#555" }}>
              {block.expression[lang]}
            </div>
          )}

          {/* ★ 빈도 */}
          <div style={{ margin: "6px 0 16px", color: "#f5a623" }}>
            {block.frequency_stars}
          </div>

          {/* Explanation */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700 }}>Explanation</div>
            <div>{block.explanation.target}</div>
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
                <div>{ex.target}</div>
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
  );
}
