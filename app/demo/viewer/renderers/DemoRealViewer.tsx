"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useViewerTarget } from "@/app/viewer/context/ViewerTargetContext";
import RealAudioController from "@/components/audio/controllers/RealAudioController";

type Sentence = {
  texts: Record<string, string>;
};

type Block =
  | { type: "image"; src: string }
  | { type: "description"; sentences: Sentence[] };

type Props = {
  level: string;
  chapter: string;
};

type Status = "loading" | "ready" | "error";

// ✅ 추가 (핵심)
type StudyLang = "en" | "es" | "fr" | "pt";

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

export default function DemoRealViewer({ level, chapter }: Props) {
  const { targetLang } = useViewerTarget();
  const lang = targetLang || "kr";

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [showTarget, setShowTarget] = useState(true);

  // ✅ 타입 명시
  const [studyLang, setStudyLang] = useState<StudyLang>("en");

  const [audioSrc, setAudioSrc] = useState("");

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
  const [imageSrc, setImageSrc] = useState("");

  useEffect(() => {
    if (!lang) return;

    let cancelled = false;

    const load = async () => {
      try {
        setStatus("loading");

        const res = await fetch(
          `/api/content/manifest?lang=${lang}&series=real&level=${level}&chapter=${chapter}&mode=demo`
        );

        const manifest = await res.json();

        if (cancelled) return;

        const dataAsset = manifest.assets?.find((a: any) => a.kind === "data");
        const audioAsset = manifest.assets?.find((a: any) => a.kind === "audio");
        const imageAsset = manifest.assets?.find((a: any) => a.kind === "image");

        if (!dataAsset) throw new Error("No data asset");

        const dataRes = await fetch(dataAsset.path);
        const json = await dataRes.json();

        if (cancelled) return;

        setBlocks(json.blocks || []);
        setAudioSrc(audioAsset?.path || "");
        setImageSrc(imageAsset?.path || "");

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

  if (status === "loading") {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  if (status === "error") {
    return <div style={{ padding: 24 }}>Failed</div>;
  }

  const descBlock = blocks.find((b) => b.type === "description") as any;

  return (
    <div style={containerStyle}>
      {/* 🔥 HEADER */}
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
            justifyContent: "space-between",
            padding: "12px 0",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
            {(["en", "es", "fr", "pt"] as StudyLang[])
              .filter((l) => l !== lang)
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
              onClick={() => setShowTarget(!showTarget)}
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
                  navigator.clipboard.writeText(window.location.href);
                  alert("Link copied!");
                }
              }}
              style={buttonStyle(false)}
            >
              Copy link
            </button>
          </div>

          <Link href="/demo" style={buttonStyle(false)}>
            ← Back
          </Link>
        </div>

        {/* 🔊 AUDIO */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 29,
            background: "#fff",
          }}
        >
          {audioSrc && <RealAudioController src={audioSrc} />}
        </div>

        {/* ✅ GUIDE (추가해도 안전) */}
        <div style={{ fontSize: 13, color: "#666", padding: "8px 0" }}>
          {guideTexts[studyLang].map((t, i) => (
            <div key={i}>{t}</div>
          ))}
        </div>
      </div>

      {/* 🔥 CONTENT */}
      <div style={{ padding: "30px 0" }}>
        <div
          style={{
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          {/* LEFT */}
          <div style={{ flex: "1 1 400px" }}>
            {imageSrc && (
              <img
                src={imageSrc}
                style={{
                  width: "100%",
                  borderRadius: 12,
                  objectFit: "cover",
                }}
              />
            )}
          </div>

          {/* RIGHT */}
          <div style={{ flex: "1 1 400px" }}>
            {descBlock?.sentences?.map((s: any, i: number) => (
              <div key={i} style={{ marginBottom: 16 }}>
                {showTarget && (
                  <div style={{ fontSize: 16, fontWeight: 600 }}>
                    {s.texts[lang]}
                  </div>
                )}
                <div style={{ color: "#666" }}>
                  {s.texts[studyLang]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}