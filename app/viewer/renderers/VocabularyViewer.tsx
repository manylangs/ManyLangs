"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import VocaAudioController from "@/components/audio/controllers/VocaAudioController";
import { useViewerTarget } from "../context/ViewerTargetContext";
import { speakText } from "@/utils/tts";

type StudyLang = "en" | "es" | "fr" | "pt";

const ALL_STUDY_LANGS: StudyLang[] = ["en", "es", "fr", "pt"];

const LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"];

const TTS_LANG_MAP: Record<string, string> = {
  kr: "ko-KR",
  ko: "ko-KR",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  pt: "pt-PT",
};

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
type VocaBlock = {
  word: Record<string, string>;
  examples?: Record<string, string>[];
};
export default function VocabularyViewer({
  lang,
  level,
  chapter,
}: any) {


  const { targetLang, setTargetLang, showTargetText } = useViewerTarget();
  const router = useRouter();
  const [studyLang, setStudyLang] = useState<StudyLang>("en");

  const [blocks, setBlocks] = useState<VocaBlock[]>([]);

  const [chapters, setChapters] = useState<string[]>([]);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [playingKey, setPlayingKey] = useState<string | null>(null);

  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const ttsLang = useMemo(
    () => TTS_LANG_MAP[targetLang] ?? "en-US",
    [targetLang]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    utterRef.current = null;
    setPlayingKey(null);
  }, [targetLang, chapter]);

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
          {/* 🌍 Language Selector */}
          <div style={{ marginBottom: 12 }}>
            <select
              value={targetLang}
              onChange={(e) => {
                const newLang = e.target.value;
                setTargetLang(newLang);
                router.push(`/viewer/${newLang}/voca/${level}/${chapter}`);
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #ddd",
                width: "100%",
              }}
            >
              <option value="kr">Korean</option>
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="pt">Portuguese</option>
            </select>
          </div>
          <VocaAudioController
            lang={targetLang}
            level={level}
            chapter={chapter}
          />

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

          {/* Study Lang */}

          <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
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

          {/* Vocabulary */}

          {blocks.map((block, idx) => (

            <section key={idx} style={{ marginBottom: 56 }}>

              <div style={{ fontWeight: 700 }}>
                Set {idx + 1}
              </div>

              {showTargetText && (
                <div
                  onClick={() =>
                    speakText(block.word?.target ?? "", targetLang)
                  }
                  style={{
                    ...targetStyle,
                    fontSize: 22,
                    fontWeight: 700,
                    background:
                      playingKey === `word-${idx}` ? "#f3f4f6" : "transparent",
                  }}
                >
                  {block.word?.target ?? ""}
                </div>
              )}
              {block.word?.[studyLang] && (
                <div style={{ color: "#555" }}>
                  {block.word[studyLang]}
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                {block.examples?.map((ex: any, i: number) => (

                  <div key={i}>
                    {showTargetText && (
                      <div
                        onClick={() =>
                          speakText(ex?.target ?? "", targetLang)
                        }
                        style={{
                          ...targetStyle,
                          background:
                            playingKey === `voca-${idx}-${i}`
                              ? "#f3f4f6"
                              : "transparent",
                        }}
                      >
                        {ex?.target ?? ""}
                      </div>
                    )}
                    {ex?.[studyLang] && (
                      <div>
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
