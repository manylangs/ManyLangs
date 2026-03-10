"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useViewerTarget } from "../context/ViewerTargetContext";

/* ================= types ================= */

type StudyLang = "en" | "es" | "fr" | "pt";

type GrammarBlock = {
  type: string;
  sentences?: Record<string, string>;
  variant?: string;
};

type GrammarData = {
  title?: Record<string, string>;
  blocks?: GrammarBlock[];
};

type LoadStatus = "idle" | "loading" | "ready" | "error";

type Props = {
  lang: string;
  level: string;
  chapter: string;
};

const STUDY_LANGS: StudyLang[] = ["en", "es", "fr", "pt"];

const buttonStyle = (active: boolean) => ({
  padding: "4px 8px",
  borderRadius: 4,
  fontSize: 14,
  background: active ? "#333" : "#eee",
  color: active ? "#fff" : "#333",
  border: "none",
  cursor: active ? "default" : "pointer",
});

/* ================= component ================= */

export default function GrammarViewer({
  level,
  chapter,
}: Props) {

  const { targetLang, showTargetText } = useViewerTarget();

  const [studyLang, setStudyLang] = useState<StudyLang>("en");

  const [data, setData] = useState<GrammarData | null>(null);
  const [chapters, setChapters] = useState<string[]>([]);
  const [status, setStatus] = useState<LoadStatus>("idle");

  /* study language 자동 설정 */

  useEffect(() => {

    const filtered = STUDY_LANGS.filter((l) => l !== targetLang);

    if (filtered.length > 0) setStudyLang(filtered[0]);

  }, [targetLang]);

  /* manifest + data load */

  useEffect(() => {

    let cancelled = false;

    const load = async () => {

      try {

        setStatus("loading");

        const res = await fetch(
          `/api/content/manifest?lang=${targetLang}&series=grammar&level=${level}&chapter=${chapter}`
        );

        if (!res.ok) throw new Error("manifest failed");

        const manifest = await res.json();

        if (cancelled) return;

        setChapters(manifest.chapters || []);

        const dataAsset =
          manifest.assets?.find((a: any) => a.kind === "data");

        if (!dataAsset?.path) throw new Error("data missing");

        const dataRes = await fetch(dataAsset.path);

        const json = await dataRes.json();

        setData(json);

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

  const blocks = data?.blocks || [];

  const explanations = blocks.filter(
    (b) => b.type === "grammar_explanation"
  );

  const examples = blocks.filter(
    (b) => b.type === "grammar_example"
  );

  const byVariant = (v: string) =>
    examples.filter((b) => b.variant === v);

  const currentIndex = chapters.indexOf(chapter);

  const prev =
    currentIndex > 0 ? chapters[currentIndex - 1] : chapter;

  const next =
    currentIndex >= 0 && currentIndex < chapters.length - 1
      ? chapters[currentIndex + 1]
      : chapter;

  const renderLine = (b: GrammarBlock, i: number) => {

    const target =
      b.sentences?.[targetLang] ??
      b.sentences?.target ??
      "";

    const study =
      b.sentences?.[studyLang] ??
      "";

    if (!target && !study) return null;

    return (
      <div key={i} style={{ marginBottom: 12 }}>

        {showTargetText && (
          <div>{target}</div>
        )}

        {study && (
          <div style={{ color: "#555" }}>
            {study}
          </div>
        )}

      </div>
    );
  };

  const titleTarget =
    data?.title?.[targetLang] ??
    data?.title?.target ??
    "";

  const titleStudy =
    data?.title?.[studyLang] ??
    "";

  /* ================= render ================= */

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>

      {status === "loading" && (
        <div style={{ padding: 12 }}>Loading...</div>
      )}

      {status === "error" && (
        <div style={{ padding: 12, color: "#c00" }}>
          Failed to load chapter.
        </div>
      )}

      {status === "ready" && (
        <>

          {/* language switch */}

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {STUDY_LANGS
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

            <Link href={`/viewer/${targetLang}/grammar/${level}/${prev}`}>
              ← Prev
            </Link>

            <Link href={`/viewer/${targetLang}/grammar/${level}/${next}`}>
              Next →
            </Link>

          </div>

          {/* chapter buttons */}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginTop: 12,
            }}
          >

            {chapters.map((ch) => {

              const active = ch === chapter;

              return (
                <Link
                  key={ch}
                  href={`/viewer/${targetLang}/grammar/${level}/${ch}`}
                  style={{
                    padding: "4px 8px",
                    fontSize: 13,
                    borderRadius: 4,
                    background: active ? "#333" : "#eee",
                    color: active ? "#fff" : "#333",
                    textDecoration: "none",
                  }}
                >
                  {ch}
                </Link>
              );

            })}

          </div>

          {/* title */}

          <div style={{ marginTop: 32, marginBottom: 24 }}>

            {showTargetText && titleTarget && (
              <div style={{ fontSize: 24, fontWeight: 700 }}>
                {titleTarget}
              </div>
            )}

            {titleStudy && (
              <div style={{ fontSize: 22, color: "#444" }}>
                {titleStudy}
              </div>
            )}

          </div>

          {/* explanation */}

          <div>

            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
              Explanation
            </div>

            {explanations.map(renderLine)}

          </div>

          {/* examples */}

          <div style={{ marginTop: 32 }}>

            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              Examples
            </div>

            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              Core Patterns
            </div>

            {byVariant("core_patterns").map(renderLine)}

            <div style={{ fontWeight: 700, margin: "20px 0 8px" }}>
              Variations
            </div>

            {byVariant("variations").map(renderLine)}

            <div style={{ fontWeight: 700, margin: "20px 0 8px" }}>
              Extended Examples
            </div>

            {byVariant("extended_usage").map(renderLine)}

          </div>

        </>
      )}

    </div>
  );
}