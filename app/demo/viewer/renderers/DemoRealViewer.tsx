"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useViewerTarget } from "@/app/viewer/context/ViewerTargetContext";
import { speakText } from "@/utils/tts";
import RealAudioController from "@/components/audio/controllers/RealAudioController";
import { SUPPORTED_LANGS } from "@/app/config/languages";
import { UI_TARGET_LABELS, UiLangKey } from "@/app/viewer/uiLabels";

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

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [showTarget, setShowTarget] = useState(true);
  const [studyLang, setStudyLang] = useState<string>("en");
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [audioSrc, setAudioSrc] = useState("");
  const [imageSrc, setImageSrc] = useState("");

  const guideTexts: Record<string, string[]> = {
    en: [
      "1. To continue to the next chapter, sign up by clicking Unlock Full Access.",
      "2. You can change the study language using the buttons above.",
      "3. Press Toggle Target to hide the target language and practice translating.",
      "4. You are currently viewing A1 Chapter 1. You can choose levels A1, A2, B1, B2, C1, and C2.",
      "5. Tap or click a sentence to play only that part.",
    ],
    es: [
      "1. Para continuar al siguiente capítulo, regístrate haciendo clic en Unlock Full Access.",
      "2. Puedes cambiar el idioma de estudio usando los botones de arriba.",
      "3. Presiona Toggle Target para ocultar el idioma objetivo y practicar la traducción.",
      "4. Actualmente estás viendo A1 Chapter 1. Puedes elegir niveles A1, A2, B1, B2, C1 y C2.",
      "5. Toca o haz clic en una frase para reproducir solo esa parte.",
    ],
    fr: [
      "1. Pour continuer au chapitre suivant, inscrivez-vous en cliquant sur Unlock Full Access.",
      "2. Vous pouvez changer la langue d'étude en utilisant les boutons ci-dessus.",
      "3. Appuyez sur Toggle Target pour cacher la langue cible et pratiquer la traduction.",
      "4. Vous regardez actuellement A1 Chapter 1. Vous pouvez choisir les niveaux A1, A2, B1, B2, C1 et C2.",
      "5. Appuyez ou cliquez sur une phrase pour lire uniquement cette partie.",
    ],
    pt: [
      "1. Para continuar para o próximo capítulo, registre-se clicando em Unlock Full Access.",
      "2. Você pode mudar o idioma de estudo usando os botões acima.",
      "3. Pressione Toggle Target para ocultar o idioma alvo e praticar a tradução.",
      "4. Está a ver A1 Chapter 1. Pode escolher níveis A1, A2, B1, B2, C1 e C2.",
      "5. Toque ou clique numa frase para reproduzir apenas essa parte.",
    ],
    kr: [
      "1. 다음 챕터로 계속하려면 Unlock Full Access를 눌러 가입하세요.",
      "2. 위의 버튼으로 학습 언어를 변경할 수 있습니다.",
      "3. Toggle Target을 누르면 목표 언어를 숨기고 번역 연습을 할 수 있습니다.",
      "4. 현재 A1 Chapter 1을 보고 있습니다. A1, A2, B1, B2, C1, 그리고 C2 레벨을 선택할 수 있습니다.",
      "5. 문장을 탭하거나 클릭하면 해당 부분만 재생됩니다.",
    ],
    zh: [
      "1. 点击“解锁完整内容（Unlock Full Access）”并注册，即可继续学习下一章节。",
      "2. 您可以使用上方按钮切换学习语言。",
      "3. 点击“切换目标语言（Toggle Target）”可隐藏目标语言，并进行翻译练习。",
      "4. 您当前正在学习 A1 第1章。您可以选择 A1、A2、B1、B2、C1 和 C2 等级。",
      "5. 点击任意句子即可仅播放该句音频。",
    ],
    jp: [
      "1. 「Unlock Full Access（すべてのコンテンツを解除）」をクリックして登録すると、次のチャプターへ進めます。",
      "2. 上のボタンから学習言語を変更できます。",
      "3. 「Toggle Target」を押すと、学習対象言語を非表示にして翻訳練習ができます。",
      "4. 現在は A1 のチャプター1を学習中です。A1、A2、B1、B2、C1、C2 のレベルを選択できます。",
      "5. 文をタップまたはクリックすると、その文だけを再生できます。",
    ],
  };
  const handleSpeak = async (text: string, key: string) => {
    if (!targetLang) return;

    const trimmed = text.trim();
    if (!trimmed) return;

    setPlayingKey(key);
    const currentKey = key;

    try {
      await speakText(trimmed, targetLang);
    } finally {
      setPlayingKey((prev) => (prev === currentKey ? null : prev));
    }
  };
  /* ================= 데이터 로드 ================= */

  useEffect(() => {
    if (!targetLang) return;

    let cancelled = false;

    const load = async () => {
      try {
        setStatus("loading");

        const res = await fetch(
          `/api/content/manifest?lang=${targetLang}&series=real&level=${level}&chapter=${chapter}&mode=demo`
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
  }, [targetLang, level, chapter]);


  if (status === "loading") return <div style={{ padding: 24 }}>Loading...</div>;
  if (status === "error") return <div style={{ padding: 24 }}>Failed</div>;

  const descBlock = blocks.find((b) => b.type === "description");

  const sentences: Sentence[] = Array.isArray(descBlock?.sentences)
    ? descBlock.sentences
    : [];

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
          {/* 🔥 1줄: Back / Toggle / Copy / Unlock */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
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

              <Link href="/app">
                <button
                  style={{
                    ...buttonStyle(false),
                    background: "#111",
                    color: "#fff",
                  }}
                >
                  Unlock Full Access
                </button>
              </Link>
            </div>
          </div>

          {/* 🔥 2줄: 학습 언어 버튼들 */}
          <div
            style={{
              display: "flex",
              flexWrap: "nowrap",
              gap: 6,
              overflowX: "auto",
              minWidth: 0,
            }}
          >
            {SUPPORTED_LANGS
              .filter((l) => l !== targetLang)
              .map((l) => (
                <button
                  key={l}
                  onClick={() => setStudyLang(l)}
                  style={buttonStyle(studyLang === l)}
                >
                  {UI_TARGET_LABELS[l as UiLangKey]?.native ?? l.toUpperCase()}
                </button>
              ))}
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

          <div style={{ flex: "1 1 400px" }}>
            {sentences.map((s: any, i: number) => {
              const key = `real-sentence-${i}`;
              const targetText = s.texts?.[targetLang] ?? "";
              const studyText = s.texts?.[studyLang] ?? "";

              return (
                <div key={i} style={{ marginBottom: 18 }}>
                  {showTarget && targetText && (
                    <div
                      onClick={() => void handleSpeak(targetText, key)}
                      style={{
                        ...sentenceStyle,
                        fontWeight: 600,
                        cursor: "pointer",
                        background: playingKey === key ? "#f3f4f6" : undefined,
                      }}
                    >
                      {targetText}
                    </div>
                  )}

                  {studyText && (
                    <div
                      style={{
                        ...sentenceStyle,
                        color: "#666",
                      }}
                    >
                      {studyText}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* ===== [REPLACE_END: CONTENT_OUTER_FINAL] ===== */}
    </div>
  );
}