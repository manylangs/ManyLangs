"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import VocaAudioController from "@/components/audio/controllers/VocaAudioController";
import { useViewerTarget } from "../context/ViewerTargetContext";
import { speakText } from "@/utils/tts";
import { SUPPORTED_LANGS } from "@/app/config/languages";
import { UI_TARGET_LABELS, UiLangKey } from "../uiLabels";


const ALL_STUDY_LANGS = SUPPORTED_LANGS;

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

const buttonStyle = (active: boolean): React.CSSProperties => ({
  padding: "4px 8px",
  borderRadius: 4,
  fontSize: 14,
  background: active ? "#333" : "#eee",
  color: active ? "#fff" : "#333",
  border: "none",
  cursor: "pointer",
});
type VocaBlock = {
  word: Record<string, string>;
  explanation?: Record<string, string>;
  examples?: Record<string, string>[];
  frequency_stars?: string;
};
export default function VocabularyViewer({
  lang,
  level,
  chapter,
}: any) {


  const { targetLang, showTargetText } = useViewerTarget();
  const [studyLang, setStudyLang] = useState<string>("en");

  const [blocks, setBlocks] = useState<VocaBlock[]>([]);

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

    if (!filtered.includes(studyLang)) {
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
          `/api/content/manifest?lang=${targetLang}&series=voca&level=${level}&chapter=${chapter}`
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
          Failed to load vocabulary.
        </div>
      )}

      {status === "ready" && (
        <>
          <VocaAudioController
            lang={targetLang}
            level={level}
            chapter={chapter}
          />

          <div style={{ height: 30 }} />

          {/* Study Lang */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {ALL_STUDY_LANGS
              .filter((l) => l !== targetLang)
              .map((l) => (
                <button
                  key={l}
                  style={buttonStyle(studyLang === l)}
                  onClick={() => setStudyLang(l)}
                >
                  {UI_TARGET_LABELS[l as UiLangKey]?.native ?? l.toUpperCase()}
                </button>
              ))}
          </div>

          {/* Prev Next */}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <Link href={`/viewer/${targetLang}/voca/${level}/${prev}`}>
              ← Prev
            </Link>

            <Link href={`/viewer/${targetLang}/voca/${level}/${next}`}>
              Next →
            </Link>
          </div>

          {/* Chapters */}

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
                href={`/viewer/${targetLang}/voca/${level}/${c}`}
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

          {/* Vocabulary */}

          {blocks.map((block, idx) => (

            <section key={idx} style={{ marginBottom: 56 }}>
              {(() => {
                const key = `word-${idx}`;
                const targetText = block.word?.target ?? "";
                const studyText = block.word?.[studyLang] ?? "";

                return (
                  <>
                    <div style={{ fontWeight: 700 }}>
                      Set {idx + 1}
                    </div>

                    {showTargetText && targetText && (
                      <div
                        onClick={() => void handleSpeak(targetText, key)}
                        style={{
                          ...targetStyle,
                          fontSize: 22,
                          fontWeight: 700,
                          background:
                            playingKey === key ? "#f3f4f6" : "transparent",
                        }}
                      >
                        {targetText}
                      </div>
                    )}

                    {studyText && (
                      <div style={{ color: "#555" }}>
                        {studyText}
                      </div>
                    )}

                    {block.frequency_stars && (
                      <div style={{ margin: "6px 0 16px", color: "#f5a623" }}>
                        {block.frequency_stars}
                      </div>
                    )}

                    {block.explanation && (
                      <div style={{ marginTop: 16, marginBottom: 20 }}>
                        <div style={{ fontWeight: 700 }}>
                          Explanation
                        </div>

                        {showTargetText && block.explanation?.target && (
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
                                playingKey === `expl-${idx}`
                                  ? "#f3f4f6"
                                  : "transparent",
                            }}
                          >
                            {block.explanation.target}
                          </div>
                        )}

                        {block.explanation?.[studyLang] && (
                          <div style={{ color: "#555" }}>
                            {block.explanation[studyLang]}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontWeight: 700 }}>
                        Examples
                      </div>

                      {block.examples?.map((ex: any, i: number) => {
                        const exKey = `voca-${idx}-${i}`;
                        const exTarget = ex?.target ?? "";
                        const exStudy = ex?.[studyLang] ?? "";

                        return (
                          <div
                            key={i}
                            style={{
                              borderBottom: "1px solid #eee",
                              marginBottom: 12,
                              paddingBottom: 12,
                            }}
                          >
                            {showTargetText && exTarget && (
                              <div
                                onClick={() => void handleSpeak(exTarget, exKey)}
                                style={{
                                  ...targetStyle,
                                  background:
                                    playingKey === exKey
                                      ? "#f3f4f6"
                                      : "transparent",
                                }}
                              >
                                {exTarget}
                              </div>
                            )}

                            {exStudy && (
                              <div style={{ color: "#555" }}>
                                {exStudy}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </section>

          ))}

        </>
      )}
    </div>
  );
}