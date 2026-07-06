"use client";

import { speakText } from "@/utils/tts";
import { useEffect, useState } from "react";
import Link from "next/link";
import IdiomAudioController from "@/components/audio/controllers/IdiomAudioController";
import { SUPPORTED_LANGS } from "@/app/config/languages";
import { UI_TARGET_LABELS, UiLangKey } from "@/app/viewer/uiLabels";


const ALL_STUDY_LANGS = SUPPORTED_LANGS;

type Example = {
  function: string;
  target: string;
  [key: string]: string;
};

type Block = {
  frequency_rank: number;
  frequency_stars: string;
  expression: Record<string, string>;
  explanation: Record<string, string>;
  examples: Example[];
};

type Props = {
  targetLang: string;
  level: string;
  chapter: string;
};

type Status = "loading" | "ready" | "error";

/* 🔥 Real 스타일 */
const containerStyle: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "0 clamp(12px, 4vw, 24px)",
};

const buttonStyle = (active: boolean): React.CSSProperties => ({
  padding: "4px 8px",
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

export default function DemoIdiomViewer({
  targetLang,
  level,
  chapter,
}: Props) {
  const lang = targetLang;

  const [showTargetText, setShowTargetText] = useState(true);
  const [studyLang, setStudyLang] = useState<string>("en");
  const [groupedBlocks, setGroupedBlocks] = useState<Record<number, Block[]>>({});
  const [status, setStatus] = useState<Status>("loading");
  const [playingKey, setPlayingKey] = useState<string | null>(null);

  const handleSpeak = async (text: string, key: string) => {

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

  const guideTexts: Record<string, string[]> = {
    en: [
      "1. To continue to the next chapter, sign up by clicking Unlock Full Access.",
      "2. You can change the study language using the buttons above.",
      "3. You can move to the next set using the <> buttons below the audio.",
      "4. Tap or click a sentence to play only that part.",
      "5. Press Toggle Target to hide the target language and practice translating.",
      "6. You are currently viewing A1 Chapter 1. You can choose levels A1, A2, B1, B2, C1, and C2.",
    ],
    es: [
      "1. Para continuar al siguiente capítulo, regístrate haciendo clic en Unlock Full Access.",
      "2. Puedes cambiar el idioma de estudio usando los botones de arriba.",
      "3. Puedes moverte al siguiente set usando los botones <> debajo del audio.",
      "4. Toca o haz clic en una frase para reproducir solo esa parte.",
      "5. Presiona Toggle Target para ocultar el idioma objetivo y practicar la traducción.",
      "6. Actualmente estás viendo A1 Chapter 1. Puedes elegir niveles A1, A2, B1, B2, C1 y C2.",
    ],
    fr: [
      "1. Pour continuer au chapitre suivant, inscrivez-vous en cliquant sur Unlock Full Access.",
      "2. Vous pouvez changer la langue d’étude avec les boutons ci-dessus.",
      "3. Vous pouvez passer au set suivant avec les boutons <> sous l’audio.",
      "4. Appuyez ou cliquez sur une phrase pour lire uniquement cette partie.",
      "5. Appuyez sur Toggle Target pour cacher la langue cible et pratiquer la traduction.",
      "6. Vous regardez actuellement A1 Chapter 1. Vous pouvez choisir les niveaux A1, A2, B1, B2, C1 et C2.",
    ],
    pt: [
      "1. Para continuar para o próximo capítulo, registre-se clicando em Unlock Full Access.",
      "2. Pode mudar o idioma de estudo usando os botões acima.",
      "3. Pode ir para o próximo set usando os botões <> abaixo do áudio.",
      "4. Toque ou clique numa frase para reproduzir apenas essa parte.",
      "5. Pressione Toggle Target para ocultar o idioma alvo e praticar a tradução.",
      "6. Está a ver A1 Chapter 1. Pode escolher níveis A1, A2, B1, B2, C1 e C2.",
    ],
    kr: [
      "1. 다음 챕터로 계속하려면 Unlock Full Access를 눌러 가입하세요.",
      "2. 위의 버튼으로 학습 언어를 변경할 수 있습니다.",
      "3. 오디오 아래의 <> 버튼으로 다음 세트로 이동할 수 있습니다.",
      "4. 문장을 탭하거나 클릭하면 해당 부분만 재생됩니다.",
      "5. Toggle Target을 누르면 목표 언어를 숨기고 번역 연습을 할 수 있습니다.",
      "6. 현재 A1 Chapter 1을 보고 있습니다. A1, A2, B1, B2, C1, 그리고 C2 레벨을 선택할 수 있습니다.",
    ],
    zh: [
      "1. 点击“解锁完整内容（Unlock Full Access）”并注册，即可继续学习下一章节。",
      "2. 您可以使用上方按钮切换学习语言。",
      "3. 您可以使用音频下方的 <> 按钮切换到下一组内容。",
      "4. 点击任意句子即可仅播放该句音频。",
      "5. 点击“切换目标语言（Toggle）”可隐藏目标语言，并进行翻译练习。",
      "6. 您当前正在学习 A1 第1章。您可以选择 A1、A2、B1、B2、C1 和 C2 等级。",
    ],
    jp: [
      "1. 「Unlock Full Access（すべてのコンテンツを解除）」をクリックして登録すると、次のチャプターへ進めます。",
      "2. 上のボタンから学習言語を変更できます。",
      "3. 音声の下にある <> ボタンで次のセットへ移動できます。",
      "4. 文をタップまたはクリックすると、その文だけを再生できます。",
      "5. 「Toggle」を押すと、学習対象言語を非表示にして翻訳練習ができます。",
      "6. 現在は A1 のチャプター1を学習中です。A1、A2、B1、B2、C1、C2 のレベルを選択できます。",
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
          `/api/content/manifest?lang=${lang}&series=idiom&level=${level}&chapter=${chapter}&mode=demo`
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

        const grouped: Record<number, Block[]> = {};

        for (const block of allBlocks) {
          const key = block.frequency_rank || 0;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(block);
        }

        if (cancelled) return;

        setGroupedBlocks(grouped);
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
          {/* 🔥 1줄: Back / Toggle / Copy */}
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
            {ALL_STUDY_LANGS
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
      </div>

      {/* 🔥 AUDIO */}
      <div style={{ borderBottom: "1px solid #eee", padding: "6px 16px" }}>
        <IdiomAudioController lang={lang} level={level} chapter={chapter} />
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

      {/* 🔥 CONTENT */}
      <div style={{ padding: "30px 0" }}>
        {Object.entries(groupedBlocks as Record<number, Block[]>)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([set, setBlocks]: [string, Block[]]) => (
            <div key={set} style={{ marginBottom: 40 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>
                SET {set}
              </div>

              {setBlocks.map((block, idx) => {
                const key = `${set}-${idx}`;

                const expression = block.expression?.target ?? "";
                const expressionStudy = block.expression?.[studyLang] ?? "";

                const explanation = block.explanation?.target ?? "";
                const explanationStudy = block.explanation?.[studyLang] ?? "";

                return (
                  <section key={idx} style={{ marginBottom: 30 }}>
                    {showTargetText && expression && (
                      <div
                        onClick={() => void handleSpeak(expression, key)}
                        style={{
                          ...sentenceStyle,
                          fontWeight: 700,
                          cursor: "pointer",
                          background: playingKey === key ? "#f3f4f6" : "transparent",
                        }}
                      >
                        {expression}
                      </div>
                    )}

                    {expressionStudy && (
                      <div style={{ ...sentenceStyle, color: "#666" }}>
                        {expressionStudy}
                      </div>
                    )}

                    <div style={{ marginBottom: 8 }}>{block.frequency_stars}</div>

                    {showTargetText && explanation && (
                      <div
                        onClick={() => void handleSpeak(explanation, key)}
                        style={{
                          ...sentenceStyle,
                          cursor: "pointer",
                          background: playingKey === key ? "#f3f4f6" : "transparent",
                        }}
                      >
                        {explanation}
                      </div>
                    )}

                    {explanationStudy && (
                      <div style={{ ...sentenceStyle, color: "#666", marginBottom: 12 }}>
                        {explanationStudy}
                      </div>
                    )}

                    {block.examples?.map((ex, i) => {
                      const t = ex.target ?? "";
                      const s = ex[studyLang] ?? "";

                      const exKey = `${key}-ex-${i}`;

                      return (
                        <div key={i} style={{ marginBottom: 14 }}>
                          {showTargetText && t && (
                            <div
                              onClick={() => void handleSpeak(t, exKey)}
                              style={{
                                ...sentenceStyle,
                                cursor: "pointer",
                                background: playingKey === exKey ? "#f3f4f6" : "transparent",
                              }}
                            >
                              {t}
                            </div>
                          )}

                          {s && (
                            <div style={{ ...sentenceStyle, color: "#666" }}>
                              {s}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </section>
                );
              })}
            </div>
          ))}
      </div>
    </div>
  );
}