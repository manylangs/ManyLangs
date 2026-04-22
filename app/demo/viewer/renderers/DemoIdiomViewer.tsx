"use client";

import { speakText } from "@/utils/tts";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useViewerTarget } from "@/app/viewer/context/ViewerTargetContext";
import IdiomAudioController from "@/components/audio/controllers/IdiomAudioController";

type StudyLang = "en" | "es" | "fr" | "pt";
const ALL_STUDY_LANGS: StudyLang[] = ["en", "es", "fr", "pt"];

type Example = {
  function: string;
  target: string;
  [key: string]: string;
};

type Block = {
  frequency_rank: number;
  frequency_stars: string;
  expression: Record<string, string>;
  explanation: Record<string, string>;
  examples: Example[];
};

type Props = {
  level: string;
  chapter: string;
};

type Status = "loading" | "ready" | "error";

/* 🔥 Real 스타일 */
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

export default function DemoIdiomViewer({ level, chapter }: Props) {
  const { targetLang } = useViewerTarget();
  const lang = targetLang || "kr";

  const [showTargetText, setShowTargetText] = useState(true);
  const [studyLang, setStudyLang] = useState<StudyLang>("en");
  const [groupedBlocks, setGroupedBlocks] = useState<Record<number, Block[]>>({});
  const [status, setStatus] = useState<Status>("loading");
  const TARGET_KEY = "target";

  const guideTexts: Record<StudyLang, string[]> = {
    en: [
      "1. To continue to the next chapter, sign up by clicking Unlock Full Access.",
      "2. You can change the study language using the buttons above.",
      "3. You can move to the next set using the <> buttons below the audio.",
      "4. Tap or click a sentence to play only that part.",
      "5. Press Toggle Target to hide the target language and practice translating.",
      "6. You are currently viewing A1 Chapter 1. You can choose levels A1, A2, B1, B2, C1, C2.",
    ],
    es: [
      "1. Para continuar al siguiente capítulo, regístrate haciendo clic en Unlock Full Access.",
      "2. Puedes cambiar el idioma de estudio usando los botones de arriba.",
      "3. Puedes moverte al siguiente set usando los botones <> debajo del audio.",
      "4. Toca o haz clic en una frase para reproducir solo esa parte.",
      "5. Presiona Toggle Target para ocultar el idioma objetivo y practicar la traducción.",
      "6. Actualmente estás viendo A1 Chapter 1. Puedes elegir niveles A1, A2, B1, B2, C1, C2.",
    ],
    fr: [
      "1. Pour continuer au chapitre suivant, inscrivez-vous en cliquant sur Unlock Full Access.",
      "2. Vous pouvez changer la langue d’étude avec les boutons ci-dessus.",
      "3. Vous pouvez passer au set suivant avec les boutons <> sous l’audio.",
      "4. Appuyez ou cliquez sur une phrase pour lire uniquement cette partie.",
      "5. Appuyez sur Toggle Target pour cacher la langue cible et pratiquer la traduction.",
      "6. Vous regardez actuellement A1 Chapter 1. Vous pouvez choisir les niveaux A1, A2, B1, B2, C1, C2.",
    ],
    pt: [
      "1. Para continuar para o próximo capítulo, registre-se clicando em Unlock Full Access.",
      "2. Pode mudar o idioma de estudo usando os botões acima.",
      "3. Pode ir para o próximo set usando os botões <> abaixo do áudio.",
      "4. Toque ou clique numa frase para reproduzir apenas essa parte.",
      "5. Pressione Toggle Target para ocultar o idioma alvo e praticar a tradução.",
      "6. Está a ver A1 Chapter 1. Pode escolher níveis A1, A2, B1, B2, C1, C2.",
    ],
  };

  useEffect(() => {
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
          `/api/content/manifest?lang=${lang}&series=idiom&level=${level}&chapter=${chapter}&mode=demo`
        );

        const manifest = await res.json();

        if (cancelled) return;

        const dataAssets =
          manifest.assets?.filter((a: any) => a.kind === "data") || [];

        let allBlocks: Block[] = [];

        for (const asset of dataAssets) {
          const res = await fetch(asset.path);
          const json = await res.json();

          if (Array.isArray(json.blocks)) {
            allBlocks = [...allBlocks, ...json.blocks];
          }
        }

        const grouped: Record<number, Block[]> = {};

        for (const block of allBlocks) {
          const key = block.frequency_rank || 0;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(block);
        }

        if (cancelled) return;

        setGroupedBlocks(grouped);
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

  if (status === "loading") return <div style={{ padding: 24 }}>Loading...</div>;
  if (status === "error") return <div style={{ padding: 24 }}>Failed</div>;

  return (
    <div style={containerStyle}>
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "#fff",
          zIndex: 30,
          paddingTop: "calc(env(safe-area-inset-top) + 8px)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "10px 16px",
            borderBottom: "1px solid #eee",
            gap: 6,
          }}
        >
          {/* 🔥 1줄 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "nowrap",
              overflowX: "auto",
              minWidth: 0,
            }}
          >
            <Link
              href="/demo"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#111",
                textDecoration: "none",
                flexShrink: 0,
                marginRight: 6,
              }}
            >
              ← Back
            </Link>

            <div
              style={{
                display: "flex",
                flexWrap: "nowrap",
                gap: 6,
                justifyContent: "flex-end",
                minWidth: 0,
                flexShrink: 0,
              }}
            >
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
                onClick={async () => {
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        url: window.location.href,
                      });
                    } catch { }
                  } else {
                    await navigator.clipboard.writeText(window.location.href);
                    alert("Link copied!");
                  }
                }}
                style={buttonStyle(false)}
              >
                Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 🔥 AUDIO */}
      <div style={{ borderBottom: "1px solid #eee", padding: "6px 16px" }}>
        <IdiomAudioController lang={lang} level={level} chapter={chapter} />
      </div>

      {/* 🔥 GUIDE */}
      <div
        style={{
          fontSize: 13,
          color: "#666",
          background: "#fafafa",
          padding: "12px 14px",
          borderRadius: 10,
          border: "1px solid #eee",
          marginTop: 10,
          marginLeft: 16,
          marginRight: 16,
        }}
      >
        {guideTexts[studyLang].map((t, i) => (
          <div key={i}>{t}</div>
        ))}
      </div>

      {/* 🔥 CONTENT */}
      <div style={{ padding: "30px 0" }}>
        {Object.entries(groupedBlocks as Record<number, Block[]>)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([set, setBlocks]: [string, Block[]]) => (
            <div key={set} style={{ marginBottom: 40 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>
                SET {set}
              </div>

              {setBlocks.map((block, idx) => {
                const expression = block.expression?.[TARGET_KEY] ?? "";
                const expressionStudy = block.expression?.[studyLang] ?? "";

                const explanation = block.explanation?.[TARGET_KEY] ?? "";
                const explanationStudy = block.explanation?.[studyLang] ?? "";

                return (
                  <section key={idx} style={{ marginBottom: 30 }}>
                    {showTargetText && (
                      <div
                        onClick={() => speakText(expression, targetLang)}
                        style={{
                          ...sentenceStyle,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {expression}
                      </div>
                    )}

                    <div style={{ ...sentenceStyle, color: "#666" }}>
                      {expressionStudy}
                    </div>

                    <div style={{ marginBottom: 8 }}>{block.frequency_stars}</div>

                    {showTargetText && (
                      <div
                        onClick={() => speakText(explanation, targetLang)}
                        style={{
                          ...sentenceStyle,
                          cursor: "pointer",
                        }}
                      >
                        {explanation}
                      </div>
                    )}

                    <div style={{ ...sentenceStyle, color: "#666", marginBottom: 12 }}>
                      {explanationStudy}
                    </div>

                    {block.examples?.map((ex, i) => {
                      const t = ex[TARGET_KEY] ?? "";
                      const s = ex[studyLang] ?? "";

                      return (
                        <div key={i} style={{ marginBottom: 14 }}>
                          {showTargetText && (
                            <div
                              onClick={() => speakText(t, targetLang)}
                              style={{
                                ...sentenceStyle,
                                cursor: "pointer",
                              }}
                            >
                              {t}
                            </div>
                          )}
                          <div style={{ ...sentenceStyle, color: "#666" }}>
                            {s}
                          </div>
                        </div>
                      );
                    })}
                  </section>
                );
              })}
            </div>
          ))}
      </div>
    </div>
  );
}