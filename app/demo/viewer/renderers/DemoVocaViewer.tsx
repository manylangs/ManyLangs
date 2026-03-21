"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useViewerTarget } from "@/app/viewer/context/ViewerTargetContext";

import VocaAudioController from "@/components/audio/controllers/VocaAudioController";

type StudyLang = "en" | "es" | "fr" | "pt";
const ALL_STUDY_LANGS: StudyLang[] = ["en", "es", "fr", "pt"];

type Example = {
  target: string;
  [key: string]: string;
};

type Block = {
  type: "vocab_item";
  word: Record<string, string>;
  examples: Example[];
};

type Props = {
  level: string;
  chapter: string;
};

type Status = "loading" | "ready" | "error";

/* 🔥 RealViewer 기준 스타일 */
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

/* 🔥 RealViewer sentence 느낌 */
const sentenceStyle: React.CSSProperties = {
  borderRadius: 6,
  padding: "4px 6px",
  lineHeight: 1.7,
};

export default function DemoVocaViewer({ level, chapter }: Props) {
  const { targetLang } = useViewerTarget();
  const lang = targetLang || "kr";

  const [showTargetText, setShowTargetText] = useState(true);
  const [studyLang, setStudyLang] = useState<StudyLang>("en");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [status, setStatus] = useState<Status>("loading");

  const TARGET_KEY = "target";

  const guideTexts: Record<StudyLang, string[]> = {
    en: [
      "1. To continue to the next chapter, sign up by clicking Get Started.",
      "2. You can change the study language using the buttons above.",
      "3. You can move to the next set using the <> buttons below the audio.",
      "4. Press Toggle Target to hide the target language and practice translating.",
      "5. You are currently viewing A1 Chapter 1. You can choose levels A1, A2, B1, B2, C1, C2.",
      "6. As the level increases, situations, sentence length, vocabulary, and expressions become more advanced.",
    ],
    es: [
      "1. Para continuar al siguiente capítulo, regístrate haciendo clic en Get Started.",
      "2. Puedes cambiar el idioma de estudio usando los botones de arriba.",
      "3. Puedes moverte al siguiente set usando los botones <> debajo del audio.",
      "4. Presiona Toggle Target para ocultar el idioma objetivo y practicar la traducción.",
      "5. Actualmente estás viendo A1 Chapter 1. Puedes elegir niveles A1, A2, B1, B2, C1, C2.",
      "6. A medida que sube el nivel, aumentan las situaciones, la longitud de las frases, el vocabulario y las expresiones.",
    ],
    fr: [
      "1. Pour continuer au chapitre suivant, inscrivez-vous en cliquant sur Get Started.",
      "2. Vous pouvez changer la langue d’étude avec les boutons ci-dessus.",
      "3. Vous pouvez passer au set suivant avec les boutons <> sous l’audio.",
      "4. Appuyez sur Toggle Target pour cacher la langue cible et pratiquer la traduction.",
      "5. Vous regardez actuellement A1 Chapter 1. Vous pouvez choisir les niveaux A1, A2, B1, B2, C1, C2.",
      "6. Plus le niveau augmente, plus les situations, les phrases et le vocabulaire deviennent complexes.",
    ],
    pt: [
      "1. Para continuar para o próximo capítulo, registre-se clicando em Get Started.",
      "2. Você pode mudar o idioma de estudo usando os botões acima.",
      "3. Você pode ir para o próximo set usando os botões <> abaixo do áudio.",
      "4. Pressione Toggle Target para ocultar o idioma alvo e praticar a tradução.",
      "5. Você está vendo A1 Chapter 1. Pode escolher níveis A1, A2, B1, B2, C1, C2.",
      "6. À medida que o nível aumenta, aumentam as situações, o tamanho das frases e o vocabulário.",
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
          `/api/content/manifest?lang=${lang}&series=voca&level=${level}&chapter=${chapter}&mode=demo`
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

        if (cancelled) return;

        setBlocks(allBlocks);
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

            <button onClick={() => setShowTargetText(!showTargetText)} style={buttonStyle(false)}>
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

        {/* 🔥 AUDIO */}
        <div style={{ borderBottom: "1px solid #eee", padding: "6px 0" }}>
          <VocaAudioController lang={lang} level={level} chapter={chapter} />
        </div>

        {/* 🔥 GUIDE (Real 스타일 박스) */}
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
        {blocks.map((block, idx) => {
          const setNumber = idx + 1;

          const word = block.word?.[TARGET_KEY] ?? "";
          const wordStudy = block.word?.[studyLang] ?? "";

          return (
            <div key={idx} style={{ marginBottom: 40 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>
                SET {setNumber}
              </div>

              {/* 단어 */}
              <div style={{ marginBottom: 12 }}>
                {showTargetText && (
                  <div style={{ ...sentenceStyle, fontWeight: 700 }}>{word}</div>
                )}
                <div style={{ ...sentenceStyle, color: "#666" }}>{wordStudy}</div>
              </div>

              {/* 예문 */}
              {block.examples?.map((ex, i) => {
                const t = ex[TARGET_KEY] ?? "";
                const s = ex[studyLang] ?? "";

                return (
                  <div key={i} style={{ marginBottom: 14 }}>
                    {showTargetText && (
                      <div style={{ ...sentenceStyle }}>{t}</div>
                    )}
                    <div style={{ ...sentenceStyle, color: "#666" }}>{s}</div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}