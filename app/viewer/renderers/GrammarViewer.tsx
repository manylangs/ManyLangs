"use client";

import { useEffect, useState, } from "react";
import Link from "next/link";
import { useViewerTarget } from "../context/ViewerTargetContext";
import { speakText } from "@/utils/tts";
import { SUPPORTED_LANGS } from "@/app/config/languages";
import { UI_TARGET_LABELS, UiLangKey } from "../uiLabels";

/* ================= types ================= */


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

const STUDY_LANGS = SUPPORTED_LANGS;

const targetStyle: React.CSSProperties = {
  cursor: "pointer",
  padding: "2px 0",
  borderRadius: 4,
};

const studyStyle: React.CSSProperties = {
  color: "#555",
  cursor: "default",
};

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
  lang,
  level,
  chapter,
}: Props) {

  const { targetLang, showTargetText } = useViewerTarget();

  const [studyLang, setStudyLang] = useState<string>("en");

  const [data, setData] = useState<GrammarData | null>(null);
  const [chapters, setChapters] = useState<string[]>([]);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [playingKey, setPlayingKey] = useState<string | null>(null);

  const handleSpeak = async (text: string, key: string) => {
    if (!lang) return;

    const trimmed = text.trim();
    if (!trimmed) return;

    setPlayingKey(key);
    const currentKey = key;

    try {
      await speakText(trimmed, lang);
    } finally {
      setPlayingKey((prev) => (prev === currentKey ? null : prev));
    }
  };

  /* study language 자동 설정 */

  useEffect(() => {

    const filtered = STUDY_LANGS.filter((l) => l !== lang);

    if (filtered.length > 0) setStudyLang(filtered[0]);

  }, [targetLang]);

  /* manifest + data load */

  useEffect(() => {

    let cancelled = false;

    const load = async () => {

      try {

        setStatus("loading");

        const res = await fetch(
          `/api/content/manifest?lang=${lang}&series=grammar&level=${level}&chapter=${chapter}`
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
  const renderLine = (b: GrammarBlock, i: number, sectionKey: string) => {
    const target = b.sentences?.target ?? "";
    const study = b.sentences?.[studyLang] ?? "";

    if (!target && !study) return null;

    const key = `${sectionKey}-${i}`;
    const isExample = sectionKey !== "explanation";

    return (
      <div
        key={i}
        style={{
          marginBottom: 12,
          paddingBottom: isExample ? 12 : 0,
          borderBottom: isExample ? "1px solid #eee" : "none",
        }}
      >
        {showTargetText && target && (
          <div
            onClick={() => void handleSpeak(target, key)}
            style={{
              ...targetStyle,
              fontSize: isExample ? 18 : 16,
              fontWeight: 600,
              background: playingKey === key ? "#f3f4f6" : "transparent",
            }}
          >
            {target}
          </div>
        )}

        {study && (
          <div style={studyStyle}>
            {study}
          </div>
        )}
      </div>
    );
  };

  const titleTarget =
    data?.title?.target ?? "";

  const titleStudy =
    data?.title?.[studyLang] ?? "";



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

          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {STUDY_LANGS
              .filter((l) => l !== lang)
              .map((l) => (
                <button
                  key={l}
                  onClick={() => setStudyLang(l)}
                  style={buttonStyle(studyLang === l)}
                >
                  {UI_TARGET_LABELS[l as UiLangKey]?.native ?? l.toUpperCase()}
                </button>
              ))}
          </div>

          {/* prev next */}

          <div style={{ display: "flex", justifyContent: "space-between" }}>

            <Link href={`/viewer/${lang}/grammar/${level}/${prev}`}>
              ← Prev
            </Link>

            <Link href={`/viewer/${lang}/grammar/${level}/${next}`}>
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
                  href={`/viewer/${lang}/grammar/${level}/${ch}`}
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

            {explanations.map((b, i) => renderLine(b, i, "explanation"))}
          </div>

          {/* examples */}

          <div style={{ marginTop: 32 }}>

            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              Examples
            </div>

            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              Core Patterns
            </div>

            {byVariant("core_patterns").map((b, i) => renderLine(b, i, "core_patterns"))}

            <div style={{ fontWeight: 700, margin: "20px 0 8px" }}>
              Variations
            </div>

            {byVariant("variations").map((b, i) => renderLine(b, i, "variations"))}

            <div style={{ fontWeight: 700, margin: "20px 0 8px" }}>
              Extended Examples
            </div>

            {byVariant("extended_usage").map((b, i) => renderLine(b, i, "extended_usage"))}

          </div>

        </>
      )}

    </div>
  );
}
