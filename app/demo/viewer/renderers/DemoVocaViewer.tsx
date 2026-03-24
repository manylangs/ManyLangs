"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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
const TTS_LANG_MAP: Record<string, string> = {
  kr: "ko-KR",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  pt: "pt-PT",
};

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
      "4. Tap or click a sentence to play only that part.",
      "5. Press Toggle Target to hide the target language and practice translating.",
      "6. You are currently viewing A1 Chapter 1. You can choose levels A1, A2, B1, B2, C1, C2.",
    ],
    es: [
      "1. Para continuar al siguiente capítulo, regístrate haciendo clic en Get Started.",
      "2. Puedes cambiar el idioma de estudio usando los botones de arriba.",
      "3. Puedes moverte al siguiente set usando los botones <> debajo del audio.",
      "4. Toca o haz clic en una frase para reproducir solo esa parte.",
      "5. Presiona Toggle Target para ocultar el idioma objetivo y practicar la traducción.",
      "6. Actualmente estás viendo A1 Chapter 1. Puedes elegir niveles A1, A2, B1, B2, C1, C2.",
    ],
    fr: [
      "1. Pour continuer au chapitre suivant, inscrivez-vous en cliquant sur Get Started.",
      "2. Vous pouvez changer la langue d’étude avec les boutons ci-dessus.",
      "3. Vous pouvez passer au set suivant avec les boutons <> sous l’audio.",
      "4. Appuyez ou cliquez sur une phrase pour lire uniquement cette partie.",
      "5. Appuyez sur Toggle Target pour cacher la langue cible et pratiquer la traduction.",
      "6. Vous regardez actuellement A1 Chapter 1. Vous pouvez choisir les niveaux A1, A2, B1, B2, C1, C2.",
    ],
    pt: [
      "1. Para continuar para o próximo capítulo, registre-se clicando em Get Started.",
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
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);

  const ttsLang = useMemo(
    () => TTS_LANG_MAP[targetLang] ?? "en-US",
    [targetLang]
  );

  const speak = (text: string, key: string) => {
    if (!text.trim()) return;
    if (typeof window === "undefined") return;

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

  /* 🔥 필수 */
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    utterRef.current = null;
    setPlayingKey(null);
  }, [targetLang, chapter]);

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
      {/* ================= HEADER ================= */}
      <div style={{ position: "sticky", top: 0, background: "#fff", zIndex: 30 }}>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "10px 0",
            borderBottom: "1px solid #eee",
            gap: 6,
          }}
        >

          {/* 🔥 1줄 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            <Link href="/demo" style={{ fontSize: 13 }}>
              ← Back
            </Link>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                justifyContent: "flex-end",
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
                        title: "Try Demo",
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
                Copy link
              </button>
            </div>
          </div>

          {/* 🔥 2줄 Unlock */}
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <Link href="/app" style={{ width: "100%" }}>
              <button
                style={{
                  ...buttonStyle(false),
                  background: "#111",
                  color: "#fff",
                  width: "100%",
                }}
              >
                Unlock Full Access
              </button>
            </Link>
          </div>
        </div>

        {/* 🔥 AUDIO */}
        <div style={{ borderBottom: "1px solid #eee", padding: "6px 0" }}>
          <VocaAudioController lang={lang} level={level} chapter={chapter} />
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
                  <div
                    onClick={() => speak(word, `word-${idx}`)}
                    style={{
                      ...sentenceStyle,
                      fontWeight: 700,
                      cursor: "pointer",
                      background:
                        playingKey === `word-${idx}` ? "#f3f4f6" : "transparent",
                    }}
                  >
                    {word}
                  </div>
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
                      <div
                        onClick={() => speak(t, `voca-${idx}-${i}`)}
                        style={{
                          ...sentenceStyle,
                          cursor: "pointer",
                          background:
                            playingKey === `voca-${idx}-${i}`
                              ? "#f3f4f6"
                              : "transparent",
                        }}
                      >
                        {t}
                      </div>
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