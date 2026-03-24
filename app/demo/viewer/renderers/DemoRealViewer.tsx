"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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
      "5. Tap or click a sentence to play only that part.",
    ],
    es: [
      "1. Para continuar al siguiente capítulo, regístrate haciendo clic en Get Started.",
      "2. Puedes cambiar el idioma de estudio usando los botones de arriba.",
      "3. Presiona Toggle Target para ocultar el idioma objetivo y practicar la traducción.",
      "4. Actualmente estás viendo A1 Capítulo 1. Puedes elegir los niveles A1, A2, B1, B2, C1, C2.",
      "5. Toca o haz clic en una frase para reproducir solo esa parte.",
    ],
    fr: [
      "1. Pour continuer au chapitre suivant, inscrivez-vous en cliquant sur Get Started.",
      "2. Vous pouvez changer la langue d'étude en utilisant les boutons ci-dessus.",
      "3. Appuyez sur Toggle Target pour cacher la langue cible et pratiquer la traduction.",
      "4. Vous regardez actuellement A1 Chapitre 1. Vous pouvez choisir les niveaux A1, A2, B1, B2, C1, C2.",
      "5. Appuyez ou cliquez sur une phrase pour lire uniquement cette partie.",
    ],
    pt: [
      "1. Para continuar para o próximo capítulo, registre-se clicando em Get Started.",
      "2. Você pode mudar o idioma de estudo usando os botões acima.",
      "3. Pressione Toggle Target para ocultar o idioma alvo e praticar a tradução.",
      "4. Você está atualmente visualizando A1 Capítulo 1. Você pode escolher os níveis A1, A2, B1, B2, C1, C2.",
      "5. Toque ou clique numa frase para reproduzir apenas essa parte.",
    ],
  };

  const TTS_LANG_MAP: Record<string, string> = {
    kr: "ko-KR",
    en: "en-US",
    es: "es-ES",
    fr: "fr-FR",
    pt: "pt-PT",
  };

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    utterRef.current = null;
    setPlayingKey(null);
  }, [targetLang, chapter]);

  /* 🔥 여기 추가 끝 */


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
              {(["en", "es", "fr", "pt"] as StudyLang[])
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
        {audioSrc && (
          <div style={{ borderBottom: "1px solid #eee", padding: "6px 0" }}>
            <RealAudioController src={audioSrc} />
          </div>
        )}

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
                  <div
                    onClick={() => speak(s.texts[lang], `real-${i}`)}
                    style={{
                      ...sentenceStyle,
                      fontWeight: 600,
                      cursor: "pointer",
                      background:
                        playingKey === `real-${i}` ? "#f3f4f6" : "transparent",
                    }}
                  >
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