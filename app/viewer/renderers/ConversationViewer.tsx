"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ConversationAudioController from "@/components/audio/controllers/ConversationAudioController";
import { useViewerTarget } from "../context/ViewerTargetContext";

type StudyLang = "en" | "es" | "fr" | "pt";

type Line = {
  speaker: string;
  sentences: Record<string, string>;
};

type Block = {
  set_id: string;
  lines: Line[];
};

type Props = {
  lang: string;
  level: string;
  chapter: string;
};

const ALL_STUDY_LANGS: StudyLang[] = ["en", "es", "fr", "pt"];

type LoadStatus = "idle" | "loading" | "ready" | "error";

const buttonStyle = (active: boolean) => ({
  padding: "4px 8px",
  borderRadius: 4,
  fontSize: 14,
  background: active ? "#333" : "#eee",
  color: active ? "#fff" : "#333",
  border: "none",
  cursor: active ? "default" : "pointer",
});

export default function ConversationViewer({
  lang,
  level,
  chapter,
}: Props) {

  const { targetLang, showTargetText } = useViewerTarget();

  const [studyLang, setStudyLang] = useState<StudyLang>("en");

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [chapters, setChapters] = useState<string[]>([]);
  const [status, setStatus] = useState<LoadStatus>("idle");

  /* study language 자동 설정 */
  useEffect(() => {
    const filtered = ALL_STUDY_LANGS.filter((l) => l !== targetLang);
    if (filtered.length > 0) setStudyLang(filtered[0]);
  }, [targetLang]);

  const currentIndex = chapters.indexOf(chapter);

  const prev =
    currentIndex > 0 ? chapters[currentIndex - 1] : chapter;

  const next =
    currentIndex >= 0 && currentIndex < chapters.length - 1
      ? chapters[currentIndex + 1]
      : chapter;

  useEffect(() => {

    let cancelled = false;

    const load = async () => {

      try {

        setStatus("loading");

        setBlocks([]);

        const res = await fetch(
          `/api/content/manifest?lang=${targetLang}&series=conversation&level=${level}&chapter=${chapter}`
        );

        if (!res.ok) throw new Error("manifest fetch failed");

        const manifest = await res.json();

        if (cancelled) return;

        /* chapters */
        if (!Array.isArray(manifest.chapters))
          throw new Error("chapters missing");

        setChapters(manifest.chapters);

        /* data asset */

        const data =
          manifest.assets?.find((a: any) => a.kind === "data");

        if (!data?.path)
          throw new Error("data asset missing");

        const dataRes = await fetch(data.path);

        if (!dataRes.ok)
          throw new Error("data fetch failed");

        const dataJson = await dataRes.json();

        if (!Array.isArray(dataJson.blocks))
          throw new Error("blocks missing");

        setBlocks(dataJson.blocks);

        setStatus("ready");

      } catch (e) {

        console.error(e);

        if (!cancelled) setStatus("error");

      }

    };

    load();

    return () => {
      cancelled = true;
    };

  }, [targetLang, level, chapter]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>

      {status === "loading" && (
        <div style={{ padding: 12, color: "#666" }}>
          Loading...
        </div>
      )}

      {status === "error" && (
        <div style={{ padding: 12, color: "#c00" }}>
          Failed to load this chapter.
        </div>
      )}

      {status === "ready" && (
        <>

          <ConversationAudioController
            lang={targetLang}
            level={level}
            chapter={chapter}
          />
          {/* language switch */}

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {ALL_STUDY_LANGS
              .filter((l) => l !== targetLang)
              .map((l) => (
                <button
                  key={l}
                  onClick={() => setStudyLang(l)}
                  style={buttonStyle(studyLang === l)}
                >
                  {l.toUpperCase()}
                </button>
              ))}
          </div>

          {/* prev next */}

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Link href={`/viewer/${targetLang}/conversation/${level}/${prev}`}>
              ← Prev
            </Link>

            <Link href={`/viewer/${targetLang}/conversation/${level}/${next}`}>
              Next →
            </Link>
          </div>

          {/* chapter list */}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginTop: 12,
            }}
          >
            {chapters.map((ch) => (
              <Link
                key={ch}
                href={`/viewer/${targetLang}/conversation/${level}/${ch}`}
                style={{
                  padding: "4px 8px",
                  fontSize: 13,
                  borderRadius: 4,
                  background: ch === chapter ? "#333" : "#eee",
                  color: ch === chapter ? "#fff" : "#333",
                  textDecoration: "none",
                }}
              >
                {ch}
              </Link>
            ))}
          </div>

          {/* content */}

          <div style={{ marginTop: 32 }}>

            {blocks.map((block, idx) => (

              <section key={block.set_id} style={{ marginBottom: 48 }}>

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

                {block.lines.map((line, i) => {

                  const targetText =
                    line.sentences?.[targetLang] ?? line.sentences?.target ?? "";

                  const studyText =
                    line.sentences?.[studyLang] ?? "";

                  return (
                    <div key={i} style={{ marginBottom: 14 }}>

                      {showTargetText && (
                        <div>
                          <strong>{line.speaker}:</strong> {targetText}
                        </div>
                      )}

                      <div style={{ color: "#555" }}>
                        <strong>{line.speaker}:</strong> {studyText}
                      </div>

                    </div>
                  );

                })}

              </section>

            ))}

          </div>

        </>
      )}
    </div>
  );
}