"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useViewerTarget } from "@/app/viewer/context/ViewerTargetContext";
import { speakText } from "@/utils/tts";
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

/* ===== [REPLACE_START: STYLE_REAL_TO_VOCA] ===== */

/* 🔥 VocaViewer 기준 스타일 */
const containerStyle: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
};

const buttonStyle = (active: boolean): React.CSSProperties => ({
  padding: "4px 6px",
  borderRadius: 6,
  fontSize: 12,
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

/* ===== [REPLACE_END: STYLE_REAL_TO_VOCA] ===== */

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

  const [currentIndex, setCurrentIndex] = useState(0);

  if (status === "loading") return <div style={{ padding: 24 }}>Loading...</div>;
  if (status === "error") return <div style={{ padding: 24 }}>Failed</div>;

  const descBlock = blocks.find((b) => b.type === "description");

  const sentences = Array.isArray(descBlock?.sentences)
    ? descBlock.sentences
    : [];

  const current =
    currentIndex >= 0 && currentIndex < sentences.length
      ? sentences[currentIndex]
      : null;

  return (
    <div style={containerStyle}>
      {/* ===== [REPLACE_START: HEADER_REAL_TO_VOCA] ===== */}
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

        {audioSrc && (
          <div style={{ borderBottom: "1px solid #eee", padding: "6px 16px" }}>
            <RealAudioController src={audioSrc} />
          </div>
        )}

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
      </div>
      {/* ===== [REPLACE_END: HEADER_REAL_TO_VOCA] ===== */}

      {/* ===== [REPLACE_START: CONTENT_OUTER_FINAL] ===== */}
      <div style={{ padding: "0 16px 30px" }}>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", paddingTop: 20 }}>

          {/* 이미지 */}
          <div style={{ flex: "1 1 400px" }}>
            {imageSrc && (
              <img
                src={imageSrc}
                style={{
                  width: "100%",
                  display: "block",
                  borderRadius: 16,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                }}
              />
            )}
          </div>

          {/* ===== 한줄재생 영역 ===== */}
          <div style={{ flex: "1 1 400px" }}>

            {current && (
              <div style={{ marginBottom: 24 }}>

                {showTarget && (
                  <div
                    onClick={() => speakText(current.texts[lang], targetLang)}
                    style={{
                      ...sentenceStyle,
                      fontWeight: 700,
                      cursor: "pointer",
                      textAlign: "center",
                      fontSize: 20,
                      background: "#f3f4f6",
                    }}
                  >
                    {current.texts[lang]}
                  </div>
                )}

                <div
                  style={{
                    ...sentenceStyle,
                    color: "#666",
                    textAlign: "center",
                    fontSize: 16,
                  }}
                >
                  {current.texts[studyLang]}
                </div>
              </div>
            )}

            {/* 컨트롤 */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 12,
              }}
            >
              <button
                onClick={() => setCurrentIndex((i) => Math.max(i - 1, 0))}
                style={buttonStyle(false)}
              >
                ◀
              </button>

              <button
                onClick={() =>
                  current && speakText(current.texts[lang], targetLang)
                }
                style={buttonStyle(false)}
              >
                ▶
              </button>

              <button
                onClick={() =>
                  setCurrentIndex((i) =>
                    Math.min(i + 1, sentences.length - 1)
                  )
                }
                style={buttonStyle(false)}
              >
                ▶▶
              </button>
            </div>

          </div>

        </div>
      </div>
      {/* ===== [REPLACE_END: CONTENT_OUTER_FINAL] ===== */}
    </div>
  );
}