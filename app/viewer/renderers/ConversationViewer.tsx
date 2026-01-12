"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ConversationAudioController from "@/components/audio/controllers/ConversationAudioController";

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
      {/* 🔊 Audio Controller (동결 영역) */}
      {data.blocks.length > 0 && (
        <section
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: "#fff",
            padding: "12px 0",
            marginBottom: 24,
            borderBottom: "1px solid #eee",
          }}
        >
          <ConversationAudioController
            lang="kr"
            level={level}
            chapter={chapter}
          />
        </section>
      )}

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

      {/* 챕터 번호 */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 20,
        }}
      >
        {chapters.map((ch) => (
          <Link
            key={ch}
            href={`/viewer/kr/conversation/${level}/${ch}`}
            style={buttonStyle(ch === chapter)}
          >
            {ch}
          </Link>
        ))}
      </div>

      {/* 본문 */}
      <section>
        {data.blocks.map((block, i) => (
          <div key={i} style={{ marginBottom: 32 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              Dialogue {i + 1}
            </div>

            {block.lines.map((line, j) => (
              <div key={j} style={{ marginBottom: 10 }}>
                <strong>{line.speaker}</strong>
                <div>{line.sentences.target}</div>
                {line.sentences[lang] && (
                  <div style={{ color: "#444" }}>
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
