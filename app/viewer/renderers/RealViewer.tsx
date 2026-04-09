"use client"; 

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import RealAudioController from "@/components/audio/controllers/RealAudioController";
import { useViewerTarget } from "../context/ViewerTargetContext";

type StudyLang = "en" | "es" | "fr" | "pt";

type Sentence = {
  texts: Record<string, string>;
};

type Props = {
  lang: string;
  level: string;
  chapter: string;
};

const ALL_STUDY_LANGS: StudyLang[] = ["en", "es", "fr", "pt"];
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
  cursor: active ? "default" : "pointer",
});

export default function RealViewer({
  lang,
  level,
  chapter,
}: Props) {

  const { targetLang, showTargetText } = useViewerTarget();

  const [studyLang, setStudyLang] = useState<StudyLang>("en");

  const [audioUrl, setAudioUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sentences, setSentences] = useState<Sentence[]>([]);
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

  const speak = (text: string, key: string) => {
    if (!text.trim()) return;

    const synth = window.speechSynthesis;
    synth.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.lang = ttsLang;

    u.onstart = () => setPlayingKey(key);
    u.onend = () => {
      setPlayingKey(null);
      utterRef.current = null;
    };
    u.onerror = () => {
      setPlayingKey(null);
      utterRef.current = null;
    };

    utterRef.current = u;
    synth.speak(u);
  };

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

        setAudioUrl("");
        setImageUrl("");
        setSentences([]);

        const res = await fetch(
          `/api/content/manifest?lang=${targetLang}&series=real&level=${level}&chapter=${chapter}`
        );

        if (!res.ok) throw new Error("manifest fetch failed");

        const manifest = await res.json();

        if (cancelled) return;

        /* chapters (manifest only) */
        if (!Array.isArray(manifest.chapters))
          throw new Error("chapters missing in manifest");

        setChapters(manifest.chapters);

        /* assets */

        const audio =
          manifest.assets?.find((a: any) => a.kind === "audio");

        const image =
          manifest.assets?.find((a: any) => a.kind === "image");

        const data =
          manifest.assets?.find((a: any) => a.kind === "data");

        if (audio?.path) setAudioUrl(audio.path);
        if (image?.path) setImageUrl(image.path);

        if (!data?.path)
          throw new Error("data.json missing in manifest");

        const dataRes = await fetch(data.path);

        if (!dataRes.ok)
          throw new Error("data.json fetch failed");

        const dataJson = await dataRes.json();

        const descBlock =
          dataJson.blocks?.find((b: any) => b.type === "description") ||
          dataJson.blocks?.[0];

        const s =
          descBlock?.sentences ||
          dataJson.sentences;

        if (!Array.isArray(s))
          throw new Error("sentences missing");

        setSentences(s);

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

          {audioUrl && (
            <RealAudioController src={audioUrl} />
          )}

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
            <Link href={`/viewer/${targetLang}/real/${level}/${prev}`}>
              ← Prev
            </Link>

            <Link href={`/viewer/${targetLang}/real/${level}/${next}`}>
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
                href={`/viewer/${targetLang}/real/${level}/${ch}`}
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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 32,
              marginTop: 24,
              alignItems: "start",
            }}
          >

            <div>
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt=""
                  style={{
                    width: "100%",
                    borderRadius: 8,
                  }}
                />
              )}
            </div>

            <div>

              {sentences.map((s, i) => {

                const targetText =
                  s.texts?.[targetLang] ?? "";

                const studyText =
                  s.texts?.[studyLang] ?? "";

                return (
                  <div key={i} style={{ marginBottom: 18 }}>
                    {showTargetText && (
                      <div
                        onClick={() =>
                          speak(
                            targetText,
                            `real-${i}`
                          )
                        }
                        style={{
                          ...targetStyle,
                          marginBottom: 4,
                          fontWeight: 500,
                          background:
                            playingKey === `real-${i}`
                              ? "#f3f4f6"
                              : "transparent",
                        }}
                      >
                        {targetText}
                      </div>
                    )}

                    <div style={studyStyle}>
                      {studyText}
                    </div>
                  </div>
                );

              })}

            </div>

          </div>

        </>
      )}
    </div>
  );
}
