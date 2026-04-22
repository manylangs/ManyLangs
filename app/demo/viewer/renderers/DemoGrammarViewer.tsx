"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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

  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);

  const guideTexts: Record<StudyLang, string[]> = {
    en: [
      "1. To continue to the next chapter, sign up by clicking Unlock Full Access.",
      "2. You can change the study language using the buttons above.",
      "3. Press Toggle Target to hide the target language and practice translating.",
      "4. You are currently viewing A1 Chapter 1. You can choose levels A1, A2, B1, B2, C1, C2.",
      "5. Tap or click a sentence to play only that part.",
    ],
    es: [
      "1. Para continuar al siguiente capítulo, regístrate haciendo clic en Unlock Full Access.",
      "2. Puedes cambiar el idioma de estudio usando los botones de arriba.",
      "3. Presiona Toggle Target para ocultar el idioma objetivo y practicar la traducción.",
      "4. Actualmente estás viendo A1 Capítulo 1. Puedes elegir los niveles A1, A2, B1, B2, C1, C2.",
      "5. Toca o haz clic en una frase para reproducir solo esa parte.",
    ],
    fr: [
      "1. Pour continuer au chapitre suivant, inscrivez-vous en cliquant sur Unlock Full Access.",
      "2. Vous pouvez changer la langue d'étude en utilisant les boutons ci-dessus.",
      "3. Appuyez sur Toggle Target pour cacher la langue cible et pratiquer la traduction.",
      "4. Vous regardez actuellement A1 Chapitre 1. Vous pouvez choisir les niveaux A1, A2, B1, B2, C1, C2.",
      "5. Appuyez ou cliquez sur une phrase pour lire uniquement cette partie.",
    ],
    pt: [
      "1. Para continuar para o próximo capítulo, registre-se clicando em Unlock Full Access.",
      "2. Você pode mudar o idioma de estudo usando os botões acima.",
      "3. Pressione Toggle Target para ocultar o idioma alvo e praticar a tradução.",
      "4. Você está atualmente visualizando A1 Capítulo 1. Você pode escolher os níveis A1, A2, B1, B2, C1, C2.",
      "5. Toque ou clique numa frase para reproduzir apenas essa parte.",
    ],
  };


  useEffect(() => {
    if (!targetLang) return;
    const filtered = ALL_STUDY_LANGS.filter((l) => l !== targetLang);
    if (filtered.length > 0) setStudyLang(filtered[0]);
  }, [targetLang]);

  const speak = (text: string, key: string) => {
    if (!text.trim()) return;
    if (typeof window === "undefined") return;

    if (playingKey === key) return; // ✅ 중복 클릭 방지

    const synth = window.speechSynthesis;
    synth.cancel();

    const u = new SpeechSynthesisUtterance(text);

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

  const renderLine = (b: GrammarBlock, i: number, sectionKey: string) => {
    const target =
      b.sentences?.[targetLang] ??
      b.sentences?.target ??
      "";

    const study = b.sentences?.[studyLang] ?? "";

    const lineKey = `${sectionKey}-${i}`;

    return (
      <div key={lineKey} style={{ marginBottom: 18 }}>
        {showTargetText && (
          <div
            onClick={() => target && speak(target, lineKey)}
            onTouchStart={() => target && speak(target, lineKey)}
            style={{
              ...sentenceStyle,
              fontWeight: 600,
              cursor: "pointer",
              background: playingKey === lineKey ? "#f3f4f6" : "transparent",
            }}
          >
            {target}
          </div>
        )}
        <div
          style={{
            ...sentenceStyle,
            color: "#666",
            cursor: "default",
          }}
        >
          {study}
        </div>
      </div>
    );
  };

  return (
    <div style={containerStyle}>
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
            {/* 🔥 Back 왼쪽 */}
            <Link href="/demo" style={{ fontSize: 13 }}>
              ← Back
            </Link>

            {/* 🔥 버튼 그룹 */}
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

          {/* 🔥 2줄 (모바일 핵심) */}
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
      <div style={{ padding: "30px 0" }}>
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

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Explanation</div>
          {explanations.map((b, i) => renderLine(b, i, "explanation"))}
        </div>

        <div>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Examples</div>

          <div style={{ fontWeight: 600, marginBottom: 8 }}>Core Patterns</div>
          {byVariant("core_patterns").map((b, i) =>
            renderLine(b, i, "core_patterns")
          )}

          <div style={{ fontWeight: 600, margin: "20px 0 8px" }}>Variations</div>
          {byVariant("variations").map((b, i) =>
            renderLine(b, i, "variations")
          )}

          <div style={{ fontWeight: 600, margin: "20px 0 8px" }}>Extended Usage</div>
          {byVariant("extended_usage").map((b, i) =>
            renderLine(b, i, "extended_usage")
          )}
        </div>
      </div>
    </div>
  );
}