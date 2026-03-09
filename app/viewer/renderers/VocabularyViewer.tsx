"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import RealAudioController from "@/components/audio/controllers/RealAudioController";
import { useViewerTarget } from "../context/ViewerTargetContext";

type StudyLang = "en" | "es" | "fr" | "pt";

type Sentence = {
  texts: {
    kr: string;
    en: string;
    es: string;
    fr: string;
    pt: string;
  };
};

type Props = {
  lang: string;
  level: string;
  chapter: string;
};

const ALL_STUDY_LANGS: StudyLang[] = ["en", "es", "fr", "pt"];

const buttonStyle = (active: boolean) => ({
  padding: "4px 8px",
  borderRadius: 4,
  fontSize: 14,
  background: active ? "#333" : "#eee",
  color: active ? "#fff" : "#333",
  border: "none",
  cursor: active ? "default" : "pointer",
});

type LoadStatus = "idle" | "loading" | "ready" | "error";

export default function RealViewer({
  lang,
  level,
  chapter,
}: Props) {

  const { targetLang, showTargetText } = useViewerTarget();

  const [studyLang, setStudyLang] = useState<StudyLang>("en");

  useEffect(() => {
    const filtered = ALL_STUDY_LANGS.filter((l) => l !== targetLang);
    if (filtered.length > 0) {
      setStudyLang(filtered[0]);
    }
  }, [targetLang]);

  const [audioUrl, setAudioUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [status, setStatus] = useState<LoadStatus>("idle");

  /* 🔥 fallback 제거 */
  const [chapters, setChapters] = useState<string[]>([]);

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

        if (!res.ok) throw new Error("Manifest failed");

        const manifest = await res.json();

        if (cancelled) return;

        /* 🔥 fallback 제거 → manifest chapters만 사용 */
        const incoming = Array.isArray(manifest.chapters)
          ? manifest.chapters
          : [];

        setChapters(incoming);

        const audio =
          manifest.assets?.find((a: any) => a.kind === "audio")?.path;

        const image =
          manifest.assets?.find((a: any) => a.kind === "image")?.path;

        const data =
          manifest.assets?.find((a: any) => a.kind === "data")?.path;

        setAudioUrl(audio || "");
        setImageUrl(image || "");

        if (data) {

          const dataRes = await fetch(data);

          if (!dataRes.ok) throw new Error("data.json fetch failed");

          const dataJson = await dataRes.json();

          const descBlock =
            dataJson.blocks?.find((b: any) => b.type === "description") ||
            dataJson.blocks?.[0];

          setSentences(
            descBlock?.sentences ||
            dataJson.sentences ||
            []
          );
        }

        setStatus("ready");

      } catch (e) {

        if (!cancelled) setStatus("error");

        console.error(e);

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
        <div style={{ padding: 12, color: "#666" }}>Loading...</div>
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

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Link href={`/viewer/${targetLang}/real/${level}/${prev}`}>
              ← Prev
            </Link>

            <Link href={`/viewer/${targetLang}/real/${level}/${next}`}>
              Next →
            </Link>
          </div>

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
                  s.texts?.[targetLang as keyof typeof s.texts] ?? "";

                const studyText =
                  s.texts?.[studyLang] ?? "";

                return (
                  <div key={i} style={{ marginBottom: 18 }}>
                    {showTargetText && (
                      <div style={{ marginBottom: 4, fontWeight: 500 }}>
                        {targetText}
                      </div>
                    )}
                    <div>{studyText}</div>
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