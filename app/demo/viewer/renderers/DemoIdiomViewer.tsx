"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useViewerTarget } from "@/app/viewer/context/ViewerTargetContext";

/* ❗️임시: 나중에 IdiomAudioController로 교체 */
import IdiomAudioController from "@/components/audio/controllers/IdiomAudioController";

type StudyLang = "en" | "es" | "fr" | "pt";
const ALL_STUDY_LANGS: StudyLang[] = ["en", "es", "fr", "pt"];

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
  level: string;
  chapter: string;
};

type Status = "loading" | "ready" | "error";

/* ✅ 버튼 스타일 (컨버세이션 그대로 복사) */
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

/* ✅ 컨테이너 */
const containerStyle: React.CSSProperties = {
  maxWidth: 900,
  margin: "0 auto",
  padding: "0 clamp(12px, 4vw, 24px)",
};

export default function DemoIdiomViewer({ level, chapter }: Props) {
  const { targetLang } = useViewerTarget();
  const lang = targetLang || "kr";

  const [showTargetText, setShowTargetText] = useState(true);
  const [studyLang, setStudyLang] = useState<StudyLang>("en");
  const [groupedBlocks, setGroupedBlocks] = useState<Record<number, Block[]>>({});
  const [status, setStatus] = useState<Status>("loading");

  /* 🔥 중요: idiom은 target 고정 */
  const TARGET_KEY = "target";

  /* guide 그대로 복사 */

  const guideTexts: Record<StudyLang, string[]> = {
    en: [
      "1. You can change the study language using the buttons above.",
      "2. You can move to the next set using the <> buttons below the audio.",
      "3. Press Toggle Target to hide the target language and practice translating.",
      "4. You are currently viewing A1 Chapter 1. You can choose levels A1, A2, B1, B2, C1, C2.",
      "5. As the level increases, situations, sentence length, vocabulary, and expressions become more advanced.",
    ],
    es: [
      "1. Puedes cambiar el idioma de estudio usando los botones de arriba.",
      "2. Puedes moverte al siguiente set usando los botones <> debajo del audio.",
      "3. Presiona Toggle Target para ocultar el idioma objetivo y practicar la traducción.",
      "4. Actualmente estás viendo A1 Chapter 1. Puedes elegir niveles A1, A2, B1, B2, C1, C2.",
      "5. A medida que sube el nivel, aumentan las situaciones, la longitud de las frases, el vocabulario y las expresiones.",
    ],
    fr: [
      "1. Vous pouvez changer la langue d’étude avec les boutons ci-dessus.",
      "2. Vous pouvez passer au set suivant avec les boutons <> sous l’audio.",
      "3. Appuyez sur Toggle Target pour cacher la langue cible et pratiquer la traduction.",
      "4. Vous regardez actuellement A1 Chapter 1. Vous pouvez choisir les niveaux A1, A2, B1, B2, C1, C2.",
      "5. Plus le niveau augmente, plus les situations, les phrases et le vocabulaire deviennent complexes.",
    ],
    pt: [
      "1. Você pode mudar o idioma de estudo usando os botões acima.",
      "2. Você pode ir para o próximo set usando os botões <> abaixo do áudio.",
      "3. Pressione Toggle Target para ocultar o idioma alvo e praticar a tradução.",
      "4. Você está vendo A1 Chapter 1. Pode escolher níveis A1, A2, B1, B2, C1, C2.",
      "5. À medida que o nível aumenta, aumentam as situações, o tamanho das frases e o vocabulário.",
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

        /* 🔥 set별 + blocks 병합 */
        for (const asset of dataAssets) {
          const res = await fetch(asset.path);
          const json = await res.json();

          if (Array.isArray(json.blocks)) {
            allBlocks = [...allBlocks, ...json.blocks];
          }
        }

        /* 🔥 set 그룹화 (frequency_rank 기준) */
        const grouped: Record<number, Block[]> = {};

        for (const block of allBlocks) {
          const key = block.frequency_rank || 0;

          if (!grouped[key]) {
            grouped[key] = [];
          }

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

  if (status === "loading")
    return <div style={{ padding: 24 }}>Loading...</div>;
  if (status === "error")
    return <div style={{ padding: 24 }}>Failed</div>;

  return (
    <div style={containerStyle}>
      {/* ✅ STICKY HEADER (컨버세이션 100% 동일) */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "#fff",
          borderBottom: "1px solid #eee",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            justifyContent: "space-between",
            padding: "12px 0",
          }}
        >
          {/* LEFT */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
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

            <div style={{ display: "flex", gap: 6 }}>
              {/* Copy link */}
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

              {/* Get Started (강조) */}
              <Link href="/app">
                <button
                  type="button"
                  style={{
                    ...buttonStyle(false),
                    background: "#111",
                    color: "#fff",
                  }}
                >
                  Get Started
                </button>
              </Link>
              <span
                style={{
                  fontSize: 12,
                  color: "#666",
                  lineHeight: 1.2,
                }}
              >
                To continue to the next chapter, sign up by clicking Get Started.
              </span>
            </div>
          </div>

          {/* RIGHT */}
          <Link href="/demo" style={buttonStyle(false)}>
            ← Back
          </Link>
        </div>

        {/* GUIDE */}
        <div
          style={{
            fontSize: "clamp(12px, 3vw, 13px)",
            color: "#666",
            lineHeight: 1.5,
            paddingBottom: 8,
          }}
        >
          {guideTexts[studyLang].map((t, i) => (
            <div key={i}>{t}</div>
          ))}
        </div>

        {/* ❗️임시 audio (현재 문제 원인) */}
        <IdiomAudioController
          lang={lang}
          level={level}
          chapter={chapter}
        />
      </div>

      {/* CONTENT */}
      <div style={{ padding: "20px 0" }}>
        {Object.entries(groupedBlocks)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([set, setBlocks]) => (
            <div key={set} style={{ marginBottom: 50 }}>

              {/* 🔥 SET 타이틀 */}
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  marginBottom: 16,
                  borderBottom: "1px solid #ddd",
                  paddingBottom: 6,
                }}
              >
                SET {set}
              </div>

              {/* 🔥 블럭 렌더 */}
              {setBlocks.map((block, idx) => {
                const expression = block.expression?.[TARGET_KEY] ?? "";
                const expressionStudy = block.expression?.[studyLang] ?? "";

                const explanation = block.explanation?.[TARGET_KEY] ?? "";
                const explanationStudy = block.explanation?.[studyLang] ?? "";

                return (
                  <section key={idx} style={{ marginBottom: 40 }}>
                    {/* 표현 */}
                    {showTargetText && (
                      <div style={{ fontSize: 20, fontWeight: 700 }}>
                        {expression}
                      </div>
                    )}

                    <div style={{ color: "#555", marginBottom: 8 }}>
                      {expressionStudy}
                    </div>

                    {/* 별 */}
                    <div style={{ marginBottom: 8 }}>
                      {block.frequency_stars}
                    </div>

                    {/* 설명 */}
                    {showTargetText && <div>{explanation}</div>}
                    <div style={{ color: "#666", marginBottom: 12 }}>
                      {explanationStudy}
                    </div>

                    {/* 예문 */}
                    {block.examples?.map((ex, i) => {
                      const t = ex[TARGET_KEY] ?? "";
                      const s = ex[studyLang] ?? "";

                      return (
                        <div key={i} style={{ marginBottom: 10 }}>
                          {showTargetText && <div>{t}</div>}
                          <div style={{ color: "#555" }}>{s}</div>
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