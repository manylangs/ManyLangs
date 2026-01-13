"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import VocaAudioController from "@/components/audio/controllers/VocaAudioController";

const STUDY_LANGS = ["en", "es", "fr", "pt"] as const;
type StudyLang = (typeof STUDY_LANGS)[number];

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

  const currentIndex = chapters.indexOf(chapter);
  const prev = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const next =
    currentIndex < chapters.length - 1
      ? chapters[currentIndex + 1]
      : null;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* 🔒 오디오 컨트롤러 — 이디엄과 동일 위치 */}
      <VocaAudioController
        lang="kr"
        level={level}
        chapter={chapter}
      />

      <div style={{ padding: 24 }}>
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

        {/* 챕터 버튼 (많으면 자동 줄바꿈) */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 20,
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

        {/* 학습 언어 */}
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

        {/* 제목 */}
        <h1>{data.title?.target}</h1>

        {/* ===== 세트 렌더링 ===== */}
        {data.blocks.map((block: any, idx: number) => (
          <section
            key={idx}
            style={{
              marginBottom: 48,
              paddingBottom: 24,
              borderBottom: "1px solid #eee",
            }}
          >
            <div style={{ fontWeight: 700 }}>
              Set {idx + 1}
            </div>

            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {block.word.target}
            </div>

            {block.word[lang] && (
              <div style={{ color: "#555", marginBottom: 12 }}>
                {block.word[lang]}
              </div>
            )}

            {block.examples.map((ex: any, i: number) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div>{ex.target}</div>
                {ex[lang] && (
                  <div style={{ color: "#666" }}>
                    {ex[lang]}
                  </div>
                )}
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
