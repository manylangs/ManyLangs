"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConversationAudioController from "@/components/audio/controllers/ConversationAudioController";
import { useViewerTarget } from "../context/ViewerTargetContext";

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
  lang: string;
  data: any;
  level: string;
  chapter: string;
  chapters: string[];
};


export default function ConversationViewer({
  data,
  level,
  chapter,
  chapters,
}: Props) {

  const router = useRouter();
  const [lang, setLang] = useState<StudyLang>("en");

  const { showTargetText, targetLang } = useViewerTarget();

  const currentIndex = chapters.indexOf(chapter);

  const prev = currentIndex > 0 ? chapters[currentIndex - 1] : null;

  const next =
    currentIndex < chapters.length - 1
      ? chapters[currentIndex + 1]
      : null;

  return (
    <>
      {/* AUDIO */}
      <div
        style={{
          position: "sticky",
          top: 100,
          zIndex: 900,
          background: "#fff",
          borderBottom: "1px solid #eee",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <ConversationAudioController
            lang={targetLang}
            level={level}
            chapter={chapter}
          />
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>

        {/* PREV NEXT */}
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
              prev &&
              router.push(
                `/viewer/${targetLang}/conversation/${level}/${prev}`
              )
            }
          >
            ← Prev
          </button>

          <button
            style={buttonStyle(false)}
            disabled={!next}
            onClick={() =>
              next &&
              router.push(
                `/viewer/${targetLang}/conversation/${level}/${next}`
              )
            }
          >
            Next →
          </button>
        </div>

        {/* CHAPTER */}
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
                router.push(
                  `/viewer/${targetLang}/conversation/${level}/${c}`
                )
              }
            >
              {c}
            </button>
          ))}
        </div>

        {/* STUDY LANGUAGE */}
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

        {/* TITLE */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {data.title?.target}
          </div>

          {data.title?.[lang] && (
            <div
              style={{
                fontSize: 22,
                color: "#555",
                marginTop: 4,
              }}
            >
              {data.title[lang]}
            </div>
          )}
        </div>

        {/* DIALOGUE */}
        {data.blocks?.map((block: any, idx: number) => (
          <section key={idx} style={{ marginBottom: 48 }}>

            <div
              style={{
                fontWeight: 700,
                marginBottom: 12,
                fontSize: 18,
                color: "#444",
              }}
            >
              Set {idx + 1}
            </div>
            {block.lines.map((line: any, i: number) => {

              const targetText = line?.sentences?.target ?? "";
              const learnerText = line?.sentences?.translations?.[lang];
              return (
                <div key={i} style={{ marginBottom: 12 }}>

                  {showTargetText && (
                    <div>
                      <strong>{line.speaker}:</strong> {targetText}
                    </div>
                  )}

                  <div style={{ color: "#555" }}>
                    <strong>{line.speaker}:</strong> {learnerText}
                  </div>

                </div>
              );
            })}

          </section>
        ))}
      </div>
    </>
  );
}