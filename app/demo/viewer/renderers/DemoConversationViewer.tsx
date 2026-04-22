"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ConversationAudioController from "@/components/audio/controllers/ConversationAudioController";
import { useViewerTarget } from "@/app/viewer/context/ViewerTargetContext";
import { speakText } from "@/utils/tts";

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
/* 🔥 한줄 음성 추가 */

/* ================= 스타일 (🔥 Real 기준 그대로) ================= */

const containerStyle: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
};

// 🔥 START - buttonStyle 통일 (Voca 기준)
const buttonStyle = (active: boolean): React.CSSProperties => ({
  padding: "4px 6px",     // 🔥 줄임 (핵심)
  borderRadius: 6,
  fontSize: 12,           // 🔥 줄임 (핵심)
  background: active ? "#333" : "#f2f2f2",
  color: active ? "#fff" : "#333",
  border: "none",
  cursor: active ? "default" : "pointer",
  whiteSpace: "nowrap",
});
// 🔥 END

/* ================= GUIDE ================= */

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

  /* 🔥 여기 ↓↓↓ 정확히 이 위치 */

  useEffect(() => {
    if (!lang) return;

    let cancelled = false;

    const load = async () => {
      try {
        setStatus("loading");

        const res = await fetch(
          `/api/content/manifest?lang=${lang}&series=conversation&level=${level}&chapter=${chapter}&mode=demo`
        );

        if (!res.ok) {
          console.warn("❌ manifest fetch failed:", res.status);
          setBlocks([]);
          setStatus("ready");
          return;
        }

        let manifest;
        try {
          manifest = await res.json();
        } catch {
          console.error("❌ manifest JSON parse fail");
          setBlocks([]);
          setStatus("ready");
          return;
        }

        // data 찾기
        const data = manifest.assets?.find((a: any) => a.kind === "data");

        if (!data?.path) {
          console.warn("❌ No data asset");
          setBlocks([]);
          setStatus("ready");
          return;
        }

        // data fetch
        const dataRes = await fetch(data.path);

        if (!dataRes.ok) {
          console.warn("❌ data fetch fail:", data.path);
          setBlocks([]);
          setStatus("ready");
          return;
        }

        let dataJson;
        try {
          dataJson = await dataRes.json();
        } catch {
          console.error("❌ JSON parse fail:", data.path);
          setBlocks([]);
          setStatus("ready");
          return;
        }


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
                Copy link
              </button>
            </div>
          </div>

          {/* 🔥 2줄 Unlock */}
          <div
            style={{
              display: "flex",
              flexWrap: "nowrap",
              gap: 6,
              minWidth: 0,
              flexShrink: 0,
              justifyContent: "flex-end", // ✅ 추가
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
        <div style={{ borderBottom: "1px solid #eee", padding: "6px 16px" }}>
          <ConversationAudioController
            lang={lang}
            level={level}
            chapter={chapter}
          />
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

      </div>

      {/* ================= CONTENT ================= */}
      <div style={{ padding: "30px 0" }}>
        {blocks.map((block, idx) => (
          <div key={block.set_id || idx} style={{ marginBottom: 30 }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>
              Set {idx + 1}
            </div>

            {(block.lines || []).map((line, i) => {
              const key = `${block.set_id}-${i}`;
              const targetText =
                line.sentences?.[targetLang] ??
                line.sentences?.target ??
                "";

              const studyText = line.sentences?.[studyLang] ?? "";

              return (
                <div key={i} style={{ marginBottom: 16, lineHeight: 1.6 }}>


                  {showTargetText && (
                    <div
                      onClick={() => speakText(targetText, targetLang)}
                      style={{
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
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