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

/* 🔥 RealViewer 스타일 */
const containerStyle: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "0 clamp(12px, 4vw, 24px)",
};

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

const sentenceStyle: React.CSSProperties = {
  borderRadius: 6,
  padding: "4px 6px",
  lineHeight: 1.7,
};

export default function DemoGrammarViewer({ level, chapter }: Props) {
  const { targetLang } = useViewerTarget();
  const lang = targetLang;

  const [showTargetText, setShowTargetText] = useState(true);
  const [studyLang, setStudyLang] = useState<StudyLang>("en");
  const [data, setData] = useState<GrammarData | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const guideTexts: Record<StudyLang, string[]> = {
    en: [
      "1. To continue to the next chapter, sign up by clicking Get Started.",
      "2. You can change the study language using the buttons above.",
      "3. Press Toggle Target to hide the target language and practice translating.",
      "4. You are currently viewing A1 Chapter 1. You can choose levels A1, A2, B1, B2, C1, C2.",
      "5. As the level increases, the level of grammar increases",
    ],
    es: [
      "1. Para continuar al siguiente capítulo, regístrate haciendo clic en Get Started.",
      "2. Puedes cambiar el idioma de estudio usando los botones de arriba.",
      "3. Presiona Toggle Target para ocultar el idioma objetivo y practicar la traducción.",
      "4. Actualmente estás viendo A1 Capítulo 1. Puedes elegir los niveles A1, A2, B1, B2, C1, C2.",
      "5. A medida que el nivel aumenta, el nivel de la gramática aumenta",
    ],
    fr: [
      "1. Pour continuer au chapitre suivant, inscrivez-vous en cliquant sur Get Started.",
      "2. Vous pouvez changer la langue d'étude en utilisant les boutons ci-dessus.",
      "3. Appuyez sur Toggle Target pour cacher la langue cible et pratiquer la traduction.",
      "4. Vous regardez actuellement A1 Chapitre 1. Vous pouvez choisir les niveaux A1, A2, B1, B2, C1, C2.",
      "5. À mesure que le niveau augmente, le niveau de la grammaire augmente",
    ],
    pt: [
      "1. Para continuar para o próximo capítulo, registre-se clicando em Get Started.",
      "2. Você pode mudar o idioma de estudo usando os botões acima.",
      "3. Pressione Toggle Target para ocultar o idioma alvo e praticar a tradução.",
      "4. Você está atualmente visualizando A1 Capítulo 1. Você pode escolher os níveis A1, A2, B1, B2, C1, C2.",
      "5. À medida que o nível aumenta, o nível da gramática aumenta",
    ],
  };
  useEffect(() => {
    if (!targetLang) return;
    const filtered = ALL_STUDY_LANGS.filter((l) => l !== targetLang);
    if (filtered.length > 0) setStudyLang(filtered[0]);
  }, [targetLang]);

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

        const dataAsset = manifest.assets?.find((a: any) => a.kind === "data");

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
  if (status === "loading") return <div style={{ padding: 24 }}>Loading...</div>;
  if (status === "error") return <div style={{ padding: 24 }}>Failed</div>;

  const blocks = data?.blocks || [];

  const explanations = blocks.filter((b) => b.type === "grammar_explanation");
  const examples = blocks.filter((b) => b.type === "grammar_example");

  const byVariant = (v: string) => examples.filter((b) => b.variant === v);

  const titleTarget =
    data?.title?.[targetLang] ??
    data?.title?.target ??
    "";

  const titleStudy = data?.title?.[studyLang] ?? "";

  const renderLine = (b: GrammarBlock, i: number) => {
    const target =
      b.sentences?.[targetLang] ??
      b.sentences?.target ??
      "";

    const study = b.sentences?.[studyLang] ?? "";

    return (
      <div key={i} style={{ marginBottom: 18 }}>
        {showTargetText && (
          <div style={{ ...sentenceStyle, fontWeight: 600 }}>{target}</div>
        )}
        <div style={{ ...sentenceStyle, color: "#666" }}>{study}</div>
      </div>
    );
  };

  return (
    <div style={containerStyle}>
      {/* 🔥 HEADER */}
      <div style={{ position: "sticky", top: 0, background: "#fff", zIndex: 30 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "10px 0",
            flexWrap: "wrap",
            borderBottom: "1px solid #eee",
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

            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert("Link copied!");
              }}
              style={buttonStyle(false)}
            >
              Copy
            </button>

            <Link href="/app">
              <button style={{ ...buttonStyle(false), background: "#111", color: "#fff" }}>
                Get Started
              </button>
            </Link>
          </div>

          <Link href="/demo">← Back</Link>
        </div>

        {/* 🔥 GUIDE (Real 스타일) */}
        <div
          style={{
            fontSize: 13,
            color: "#666",
            background: "#fafafa",
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #eee",
            marginTop: 10,
          }}
        >
          {guideTexts[studyLang].map((t, i) => (
            <div key={i}>{t}</div>
          ))}
        </div>
      </div>

      {/* 🔥 CONTENT */}
      <div style={{ padding: "30px 0" }}>
        {/* TITLE */}
        <div style={{ marginBottom: 30 }}>
          {showTargetText && (
            <div style={{ ...sentenceStyle, fontSize: 24, fontWeight: 700 }}>
              {titleTarget}
            </div>
          )}
          <div style={{ ...sentenceStyle, fontSize: 20, color: "#444" }}>
            {titleStudy}
          </div>
        </div>

        {/* EXPLANATION */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Explanation</div>
          {explanations.map(renderLine)}
        </div>

        {/* EXAMPLES */}
        <div>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Examples</div>

          <div style={{ fontWeight: 600, marginBottom: 8 }}>Core Patterns</div>
          {byVariant("core_patterns").map(renderLine)}

          <div style={{ fontWeight: 600, margin: "20px 0 8px" }}>Variations</div>
          {byVariant("variations").map(renderLine)}

          <div style={{ fontWeight: 600, margin: "20px 0 8px" }}>Extended Usage</div>
          {byVariant("extended_usage").map(renderLine)}
        </div>
      </div>
    </div>
  );
}