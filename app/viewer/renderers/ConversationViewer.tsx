"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Sentence = {
  target: string;
  en?: string;
  es?: string;
  fr?: string;
  pt?: string;
};

type Line = {
  speaker: "A" | "B";
  sentences: Sentence;
};

type Block = {
  set_id: string;
  lines: Line[];
};

type ConversationData = {
  title?: Sentence;
  blocks: Block[];
};

type Props = {
  data: ConversationData;
  level: string;
  chapter: string;
  chapters: string[];
};

const STUDY_LANGS = ["en", "es", "fr", "pt"] as const;
type StudyLang = (typeof STUDY_LANGS)[number];

/* ✅ 버튼 디자인 – 사용자 제공 버전 그대로 */
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

export default function ConversationViewer({
  data,
  level,
  chapter,
  chapters,
}: Props) {
  const [lang, setLang] = useState<StudyLang>("en");

  const currentIndex = useMemo(
    () => chapters.indexOf(chapter),
    [chapters, chapter]
  );

  const prev =
    currentIndex > 0 ? chapters[currentIndex - 1] : chapter;
  const next =
    currentIndex < chapters.length - 1
      ? chapters[currentIndex + 1]
      : chapter;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      {/* 학습 언어 선택 */}
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

      {/* Prev / Next */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <Link
          href={`/viewer/kr/conversation/${level}/${prev}`}
          style={buttonStyle(false)}
        >
          ← Prev
        </Link>
        <Link
          href={`/viewer/kr/conversation/${level}/${next}`}
          style={buttonStyle(false)}
        >
          Next →
        </Link>
      </div>

      {/* 챕터 목록 */}
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
              href={`/viewer/kr/conversation/${level}/${ch}`}
              style={buttonStyle(active)}
            >
              {ch}
            </Link>
          );
        })}
      </div>

      {/* 제목 */}
      <section style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 24, fontWeight: 700 }}>
          {data.title?.target}
        </div>
        {data.title?.[lang] && (
          <div
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: "#444",
              marginTop: 6,
            }}
          >
            {data.title[lang]}
          </div>
        )}
      </section>

      {/* 대화 본문 */}
      <section>
        {data.blocks.map((block) => (
          <div key={block.set_id} style={{ marginBottom: 28 }}>
            {block.lines.map((line, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700 }}>
                  {line.speaker}
                </div>
                <div>{line.sentences.target}</div>
                {line.sentences[lang] && (
                  <div style={{ color: "#444", marginTop: 2 }}>
                    {line.sentences[lang]}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}
