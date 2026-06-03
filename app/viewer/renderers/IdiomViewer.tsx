"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import IdiomAudioController from "@/components/audio/controllers/IdiomAudioController";
import { useViewerTarget } from "../context/ViewerTargetContext";
import { speakText } from "@/utils/tts";

type StudyLang = "en" | "es" | "fr" | "pt";

const ALL_STUDY_LANGS: StudyLang[] = ["en", "es", "fr", "pt"];

const LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"];

const targetStyle: React.CSSProperties = {
  cursor: "pointer",
  padding: "2px 0",
  borderRadius: 4,
};

const studyStyle: React.CSSProperties = {
  color: "#555",
  cursor: "default",
};

type LoadStatus = "idle" | "loading" | "ready" | "error";

const buttonStyle = (active: boolean) => ({
  padding: "4px 8px",
  borderRadius: 4,
  fontSize: 14,
  background: active ? "#333" : "#eee",
  color: active ? "#fff" : "#333",
  border: "none",
  cursor: "pointer",
});
type IdiomBlock = {
  expression: Record<string, string>;
  explanation: Record<string, string>;
  examples?: Record<string, string>[];
  frequency_stars?: string;
};

export default function IdiomViewer({
  lang,
  level,
  chapter,
}: any) {

  const { targetLang, showTargetText } = useViewerTarget();

  const [studyLang, setStudyLang] = useState<StudyLang>("en");
  const [blocks, setBlocks] = useState<IdiomBlock[]>([]);
  const [chapters, setChapters] = useState<string[]>([]);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [playingKey, setPlayingKey] = useState<string | null>(null);

  const handleSpeak = async (text: string, key: string) => {
    if (!targetLang) return;

    const trimmed = text.trim();
    if (!trimmed) return;

    setPlayingKey(key);
    const currentKey = key;

    try {
      await speakText(trimmed, targetLang);
    } finally {
      setPlayingKey((prev) => (prev === currentKey ? null : prev));
    }
  };

  useEffect(() => {

    const filtered = ALL_STUDY_LANGS.filter(
      (l) => l !== targetLang
    );

    if (filtered.length > 0) {
      setStudyLang(filtered[0]);
    }

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

        const res = await fetch(
          `/api/content/manifest?lang=${targetLang}&series=idiom&level=${level}&chapter=${chapter}`
        );

        if (!res.ok) throw new Error("manifest fetch failed");

        const manifest = await res.json();

        if (cancelled) return;

        if (!Array.isArray(manifest.chapters))
          throw new Error("chapters missing");

        setChapters(manifest.chapters);

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
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>

      {status === "loading" && (
        <div style={{ padding: 12 }}>Loading...</div>
      )}

      {status === "error" && (
        <div style={{ padding: 12, color: "red" }}>
          Failed to load idioms.
        </div>
      )}

      {status === "ready" && (
        <>
          <IdiomAudioController
            lang={targetLang}
            level={level}
            chapter={chapter}
          />

          {/* Study Lang */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {ALL_STUDY_LANGS
              .filter((l) => l !== targetLang)
              .map((l) => (
                <button
                  key={l}
                  style={buttonStyle(studyLang === l)}
                  onClick={() => setStudyLang(l)}
                >
                  {l.toUpperCase()}
                </button>
              ))}
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 16,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            {LEVELS.map((lv) => (
              <Link
                key={lv}
                href={`/viewer/${targetLang}/idiom/${lv}/001`}
                style={{
                  ...buttonStyle(lv === level),
                  textDecoration: "none",
                }}
              >
                {lv.toUpperCase()}
              </Link>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <Link href={`/viewer/${targetLang}/idiom/${level}/${prev}`}>
              ← Prev
            </Link>

            <Link href={`/viewer/${targetLang}/idiom/${level}/${next}`}>
              Next →
            </Link>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 24,
            }}
          >
            {chapters.map((c) => (
              <Link
                key={c}
                href={`/viewer/${targetLang}/idiom/${level}/${c}`}
                style={{
                  padding: "4px 8px",
                  fontSize: 13,
                  borderRadius: 4,
                  background: c === chapter ? "#333" : "#eee",
                  color: c === chapter ? "#fff" : "#333",
                  textDecoration: "none",
                }}
              >
                {c}
              </Link>
            ))}
          </div>

          {blocks.map((block, idx) => (
            <section key={idx} style={{ marginBottom: 56 }}>

              <div style={{ fontWeight: 700 }}>
                Set {idx + 1}
              </div>

              {showTargetText && (
                <div
                  onClick={() =>
                    void handleSpeak(
                      block.expression?.target ?? "",
                      `exp-${idx}`
                    )
                  }
                  style={{
                    ...targetStyle,
                    fontSize: 22,
                    fontWeight: 700,
                    background:
                      playingKey === `exp-${idx}` ? "#f3f4f6" : "transparent",
                  }}
                >
                  {block.expression?.target ?? ""}
                </div>
              )}

              {block.expression?.[studyLang] && (
                <div style={{ color: "#555" }}>
                  {block.expression[studyLang]}
                </div>
              )}

              <div style={{ margin: "6px 0 16px", color: "#f5a623" }}>
                {block.frequency_stars}
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700 }}>
                  Explanation
                </div>

                {showTargetText && (
                  <div
                    onClick={() =>
                      void handleSpeak(
                        block.explanation?.target ?? "",
                        `expl-${idx}`
                      )
                    }
                    style={{
                      ...targetStyle,
                      background:
                        playingKey === `expl-${idx}` ? "#f3f4f6" : "transparent",
                    }}
                  >
                    {block.explanation?.target ?? ""}
                  </div>
                )}

                {block.explanation?.[studyLang] && (
                  <div style={{ color: "#555" }}>
                    {block.explanation[studyLang]}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontWeight: 700 }}>
                  Examples
                </div>

                {block.examples?.map((ex: Record<string, string>, i: number) => (
                  <div
                    key={i}
                    style={{
                      borderBottom: "1px solid #eee",
                      marginBottom: 12,
                      paddingBottom: 12,
                    }}
                  >
                    {showTargetText && (
                      <div
                        onClick={() =>
                          void handleSpeak(
                            ex?.target ?? "",
                            `ex-${idx}-${i}`
                          )
                        }
                        style={{
                          ...targetStyle,
                          background:
                            playingKey === `ex-${idx}-${i}`
                              ? "#f3f4f6"
                              : "transparent",
                        }}
                      >
                        {ex?.target ?? ""}
                      </div>
                    )}

                    {ex?.[studyLang] && (
                      <div style={{ color: "#555" }}>
                        {ex[studyLang]}
                      </div>
                    )}
                  </div>
                ))}
              </div>

            </section>
          ))}

        </>
      )}
    </div>
  );
}
