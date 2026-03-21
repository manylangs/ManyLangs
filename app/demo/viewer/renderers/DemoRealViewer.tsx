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
type StudyLang = "en" | "es" | "fr" | "pt";

/* ================= 스타일 ================= */

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

/* 🔥 클릭 제거된 문장 스타일 */
const sentenceStyle: React.CSSProperties = {
  borderRadius: 6,
  padding: "4px 6px",
  lineHeight: 1.7,
};

/* ================= 컴포넌트 ================= */

export default function DemoRealViewer({ level, chapter }: Props) {
  const { targetLang } = useViewerTarget();
  const lang = targetLang || "kr";

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [showTarget, setShowTarget] = useState(true);
  const [studyLang, setStudyLang] = useState<StudyLang>("en");

  const [audioSrc, setAudioSrc] = useState("");
  const [imageSrc, setImageSrc] = useState("");

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

  /* ================= 데이터 로드 ================= */

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

        const dataAsset = manifest.assets?.find((a: any) => a.kind === "data");
        const audioAsset = manifest.assets?.find((a: any) => a.kind === "audio");
        const imageAsset = manifest.assets?.find((a: any) => a.kind === "image");

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

  if (status === "loading") return <div style={{ padding: 24 }}>Loading...</div>;
  if (status === "error") return <div style={{ padding: 24 }}>Failed</div>;

  const descBlock = blocks.find((b) => b.type === "description") as any;

  return (
    <div style={containerStyle}>
      {/* HEADER */}
      <div style={{ position: "sticky", top: 0, background: "#fff", zIndex: 30 }}>

        {/* 🔹 상단 버튼 영역 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "10px 0", // 🔥 줄임 (기존 12 → 10)
            flexWrap: "wrap",
            borderBottom: "1px solid #eee", // 🔥 구분선 추가
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
            {(["en", "es", "fr", "pt"] as StudyLang[]).map((l) => (
              <button key={l} onClick={() => setStudyLang(l)} style={buttonStyle(studyLang === l)}>
                {l.toUpperCase()}
              </button>
            ))}

            <button onClick={() => setShowTarget(!showTarget)} style={buttonStyle(false)}>
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

        {/* 🔥 AUDIO (헤더에 완전히 붙음) */}
        {audioSrc && (
          <div
            style={{
              borderBottom: "1px solid #eee", // 🔥 구분선만 유지
              paddingTop: 6, // 살짝 breathing
              paddingBottom: 6,
            }}
          >
            <RealAudioController src={audioSrc} />
          </div>
        )}

        {/* GUIDE */}
        <div
          style={{
            fontSize: 13,
            color: "#666",
            background: "#fafafa",
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #eee",
            marginTop: 10, // 🔥 여기만 여백 유지
          }}
        >
          {guideTexts[studyLang].map((t, i) => (
            <div key={i}>{t}</div>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ padding: "30px 0" }}>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {/* IMAGE */}
          <div style={{ flex: "1 1 400px" }}>
            {imageSrc && (
              <img
                src={imageSrc}
                style={{
                  width: "100%",
                  borderRadius: 16,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                }}
              />
            )}
          </div>

          {/* TEXT */}
          <div style={{ flex: "1 1 400px" }}>
            {descBlock?.sentences?.map((s: any, i: number) => (
              <div key={i} style={{ marginBottom: 18 }}>
                {showTarget && (
                  <div style={{ ...sentenceStyle, fontWeight: 600 }}>
                    {s.texts[lang]}
                  </div>
                )}

                <div style={{ ...sentenceStyle, color: "#666" }}>
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