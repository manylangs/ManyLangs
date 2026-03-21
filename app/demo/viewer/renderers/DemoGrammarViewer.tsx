"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useViewerTarget } from "@/app/viewer/context/ViewerTargetContext";

type StudyLang = "en" | "es" | "fr" | "pt";
const ALL_STUDY_LANGS: StudyLang[] = ["en", "es", "fr", "pt"];

type Props = {
  level: string;
  chapter: string;
};

type Status = "loading" | "ready" | "error";

type GrammarBlock = {
  type: string;
  sentences?: Record<string, string>;
  variant?: string;
};

type GrammarData = {
  title?: Record<string, string>;
  blocks?: GrammarBlock[];
};

/* 스타일 */
const buttonStyle = (active: boolean): React.CSSProperties => ({
  padding: "6px 10px",
  borderRadius: 6,
  fontSize: 13,
  background: active ? "#333" : "#f2f2f2",
  color: active ? "#fff" : "#333",
  border: "none",
  cursor: active ? "default" : "pointer",
  whiteSpace: "nowrap",
});

const containerStyle: React.CSSProperties = {
  maxWidth: 900,
  margin: "0 auto",
  padding: "0 clamp(12px, 4vw, 24px)",
};

export default function DemoGrammarViewer({ level, chapter }: Props) {
  const { targetLang } = useViewerTarget();
  const lang = targetLang;

  const [showTargetText, setShowTargetText] = useState(true);
  const [studyLang, setStudyLang] = useState<StudyLang>("en");
  const [data, setData] = useState<GrammarData | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  /* guide */

  const guideTexts: Record<StudyLang, string[]> = {
    en: [
      "1. You can change the study language using the buttons above.",
      "2. Press Toggle Target to hide the target language and practice translating.",
      "3. You are currently viewing A1 Chapter 1. You can choose levels A1, A2, B1, B2, C1, C2.",
      "4. As the level increases, the level of grammar increases",
    ],
    es: [
      "1. Puedes cambiar el idioma de estudio usando los botones de arriba.",
      "2. Presiona Toggle Target para ocultar el idioma objetivo y practicar la traducción.",
      "3. Actualmente estás viendo A1 Capítulo 1. Puedes elegir los niveles A1, A2, B1, B2, C1, C2.",
      "4. A medida que el nivel aumenta, el nivel de la gramática aumenta",
    ],
    fr: [
      "1. Vous pouvez changer la langue d'étude en utilisant les boutons ci-dessus.",
      "2. Appuyez sur Toggle Target pour cacher la langue cible et pratiquer la traduction.",
      "3. Vous regardez actuellement A1 Chapitre 1. Vous pouvez choisir les niveaux A1, A2, B1, B2, C1, C2.",
      "4. À mesure que le niveau augmente, le niveau de la grammaire augmente",
    ],
    pt: [
      "1. Você pode mudar o idioma de estudo usando os botões acima.",
      "2. Pressione Toggle Target para ocultar o idioma alvo e praticar a tradução.",
      "3. Você está atualmente visualizando A1 Capítulo 1. Você pode escolher os níveis A1, A2, B1, B2, C1, C2.",
      "4. À medida que o nível aumenta, o nível da gramática aumenta",
    ],
  };

  /* studyLang 자동 */
  useEffect(() => {
    if (!targetLang) return;
    const filtered = ALL_STUDY_LANGS.filter((l) => l !== targetLang);
    if (filtered.length > 0) setStudyLang(filtered[0]);
  }, [targetLang]);

  /* 데이터 로딩 */
  useEffect(() => {
    if (!lang) return;

    let cancelled = false;

    const load = async () => {
      try {
        setStatus("loading");

        const res = await fetch(
          `/api/content/manifest?lang=${lang}&series=grammar&level=${level}&chapter=${chapter}&mode=demo`
        );

        const manifest = await res.json();
        if (cancelled) return;

        const dataAsset = manifest.assets?.find(
          (a: any) => a.kind === "data"
        );

        if (!dataAsset) throw new Error("No data asset");

        const dataRes = await fetch(dataAsset.path);
        const dataJson = await dataRes.json();

        if (cancelled) return;

        setData(dataJson);
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
  }, [lang, level, chapter]);

  if (!targetLang) return null;

  if (status === "loading")
    return <div style={{ padding: 24 }}>Loading...</div>;

  if (status === "error")
    return <div style={{ padding: 24 }}>Failed</div>;

  const blocks = data?.blocks || [];

  /* 🔥 핵심: 구조 분리 */
  const explanations = blocks.filter(
    (b) => b.type === "grammar_explanation"
  );

  const examples = blocks.filter(
    (b) => b.type === "grammar_example"
  );

  const byVariant = (v: string) =>
    examples.filter((b) => b.variant === v);

  /* 제목 */
  const titleTarget =
    data?.title?.[targetLang] ??
    data?.title?.target ??
    "";

  const titleStudy =
    data?.title?.[studyLang] ?? "";

  /* 라인 렌더 */
  const renderLine = (b: GrammarBlock, i: number) => {
    const target =
      b.sentences?.[targetLang] ??
      b.sentences?.target ??
      "";

    const study = b.sentences?.[studyLang] ?? "";

    return (
      <div key={i} style={{ marginBottom: 12 }}>
        {showTargetText && <div>{target}</div>}
        <div style={{ color: "#555" }}>{study}</div>
      </div>
    );
  };

  return (
    <div style={containerStyle}>
      {/* ✅ HEADER (Conversation 동일) */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "#fff",
          borderBottom: "1px solid #eee",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            justifyContent: "space-between",
            padding: "12px 0",
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
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

            <button
              onClick={() => setShowTargetText(!showTargetText)}
              style={buttonStyle(false)}
            >
              Toggle
            </button>

            <div style={{ display: "flex", gap: 6 }}>
              {/* Copy link */}
              <button
                onClick={async () => {
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: "Try Demo",
                        url: window.location.href,
                      });
                    } catch { }
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    alert("Link copied!");
                  }
                }}
                style={buttonStyle(false)}
              >
                Copy link
              </button>

              {/* Get Started (강조) */}
              <Link href="/app">
                <button
                  type="button"
                  style={{
                    ...buttonStyle(false),
                    background: "#111",
                    color: "#fff",
                  }}
                >
                  Get Started
                </button>
              </Link>
              {/* 안내 문구 */}
              <span
                style={{
                  fontSize: 12,
                  color: "#666",
                  lineHeight: 1.2,
                }}
              >
                To continue to the next chapter, sign up by clicking Get Started.
              </span>
            </div>
          </div>

          <Link href="/demo" style={buttonStyle(false)}>
            ← Back
          </Link>
        </div>

        <div style={{ fontSize: 13, color: "#666", paddingBottom: 8 }}>
          {guideTexts[studyLang].map((t, i) => (
            <div key={i}>{t}</div>
          ))}
        </div>
      </div>

      {/* ✅ CONTENT */}
      <div style={{ padding: "20px 0" }}>
        {/* TITLE */}
        <div style={{ marginBottom: 24 }}>
          {showTargetText && (
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {titleTarget}
            </div>
          )}
          <div style={{ fontSize: 20, color: "#444" }}>
            {titleStudy}
          </div>
        </div>

        {/* EXPLANATION */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>
            Explanation
          </div>
          {explanations.map(renderLine)}
        </div>

        {/* EXAMPLES */}
        <div>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>
            Examples
          </div>

          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            Core Patterns
          </div>
          {byVariant("core_patterns").map(renderLine)}

          <div style={{ fontWeight: 600, margin: "20px 0 8px" }}>
            Variations
          </div>
          {byVariant("variations").map(renderLine)}

          <div style={{ fontWeight: 600, margin: "20px 0 8px" }}>
            Extended Usage
          </div>
          {byVariant("extended_usage").map(renderLine)}
        </div>
      </div>
    </div>
  );
}