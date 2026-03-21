"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ConversationAudioController from "@/components/audio/controllers/ConversationAudioController";
import { useViewerTarget } from "@/app/viewer/context/ViewerTargetContext";

type StudyLang = "en" | "es" | "fr" | "pt";
const ALL_STUDY_LANGS: StudyLang[] = ["en", "es", "fr", "pt"];

type Line = {
  speaker: string;
  sentences: Record<string, string>;
};

type Block = {
  set_id: string;
  lines: Line[];
};

type Props = {
  level: string;
  chapter: string;
};

type Status = "loading" | "ready" | "error";

/* ================= 스타일 (🔥 Real 기준 그대로) ================= */

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
  whiteSpace: "nowrap", // 🔥 Real 동일
});

/* ================= GUIDE ================= */

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


/* ================= COMPONENT ================= */

export default function DemoConversationViewer({ level, chapter }: Props) {
  const { targetLang } = useViewerTarget();
  const lang = targetLang || "kr";

  const [showTargetText, setShowTargetText] = useState(true);
  const [showGuide, setShowGuide] = useState(true);
  const [studyLang, setStudyLang] = useState<StudyLang>("en");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [status, setStatus] = useState<Status>("loading");

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
          `/api/content/manifest?lang=${lang}&series=conversation&level=${level}&chapter=${chapter}&mode=demo`
        );

        const manifest = await res.json();

        const data = manifest.assets?.find((a: any) => a.kind === "data");
        const dataRes = await fetch(data.path);
        const dataJson = await dataRes.json();

        if (cancelled) return;

        setBlocks(Array.isArray(dataJson.blocks) ? dataJson.blocks : []);
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
      {/* ================= HEADER ================= */}
      <div style={{ position: "sticky", top: 0, background: "#fff", zIndex: 30 }}>
        
        {/* 🔥 버튼 영역 (Real 완전 동일 구조) */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "10px 0", // 🔥 Real 동일
            flexWrap: "wrap",
            borderBottom: "1px solid #eee",
          }}
        >
          {/* LEFT */}
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
              <button
                style={{
                  ...buttonStyle(false),
                  background: "#111",
                  color: "#fff",
                }}
              >
                Get Started
              </button>
            </Link>
          </div>

          {/* RIGHT */}
          <Link href="/demo">← Back</Link>
        </div>

        {/* 🔥 AUDIO (Real 위치 동일) */}
        <div
          style={{
            borderBottom: "1px solid #eee",
            paddingTop: 6,
            paddingBottom: 6,
          }}
        >
          <ConversationAudioController
            lang={lang}
            level={level}
            chapter={chapter}
          />
        </div>

        {/* GUIDE */}
        {showGuide && (
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
        )}
      </div>

      {/* ================= CONTENT ================= */}
      <div style={{ padding: "30px 0" }}>
        {blocks.map((block, idx) => (
          <div key={block.set_id || idx} style={{ marginBottom: 30 }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>
              Set {idx + 1}
            </div>

            {(block.lines || []).map((line, i) => {
              const targetText =
                line.sentences?.[targetLang] ??
                line.sentences?.target ??
                "";

              const studyText = line.sentences?.[studyLang] ?? "";

              return (
                <div key={i} style={{ marginBottom: 16, lineHeight: 1.6 }}>
                  {showTargetText && (
                    <div style={{ fontWeight: 600 }}>
                      <strong>{line.speaker}:</strong> {targetText}
                    </div>
                  )}

                  <div style={{ color: "#666" }}>
                    <strong>{line.speaker}:</strong> {studyText}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}