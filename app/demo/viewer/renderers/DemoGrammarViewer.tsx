"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { speakText } from "@/utils/tts";
import { SUPPORTED_LANGS } from "@/app/config/languages";
import { UI_TARGET_LABELS, UiLangKey } from "@/app/viewer/uiLabels";


const ALL_STUDY_LANGS = SUPPORTED_LANGS;

type Props = {
  targetLang: string;
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

// ✅ 교체
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

export default function DemoGrammarViewer({
  targetLang,
  level,
  chapter,
}: Props) {
  const lang = targetLang;

  const [showTargetText, setShowTargetText] = useState(true);
  const [studyLang, setStudyLang] = useState<string>("en");
  const [data, setData] = useState<GrammarData | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const [playingKey, setPlayingKey] = useState<string | null>(null);

  const guideTexts: Record<string, string[]> = {
    en: [
      "1. To study the next chapter, please create an account and sign in.",
      "2. You can change the study language using the buttons above.",
      "3. Press Toggle Target to hide the target language and practice translating.",
      "4. You are currently viewing A1 Chapter 1. You can choose levels A1, A2, B1, B2, C1, and C2.",
      "5. Tap or click a sentence to play only that part.",
    ],
    es: [
      "1. Para estudiar el siguiente capítulo, crea una cuenta e inicia sesión.",
      "2. Puedes cambiar el idioma de estudio usando los botones de arriba.",
      "3. Presiona Toggle Target para ocultar el idioma objetivo y practicar la traducción.",
      "4. Actualmente estás viendo A1 Chapter 1. Puedes elegir niveles A1, A2, B1, B2, C1 y C2.",
      "5. Toca o haz clic en una frase para reproducir solo esa parte.",
    ],
    fr: [
      "1. Pour étudier le chapitre suivant, créez un compte et connectez-vous.",
      "2. Vous pouvez changer la langue d'étude en utilisant les boutons ci-dessus.",
      "3. Appuyez sur Toggle Target pour cacher la langue cible et pratiquer la traduction.",
      "4. Vous regardez actuellement A1 Chapter 1. Vous pouvez choisir les niveaux A1, A2, B1, B2, C1 et C2.",
      "5. Appuyez ou cliquez sur une phrase pour lire uniquement cette partie.",
    ],
    pt: [
      "1. Para estudar o próximo capítulo, crie uma conta e inicie sessão.",
      "2. Você pode mudar o idioma de estudo usando os botões acima.",
      "3. Pressione Toggle Target para ocultar o idioma alvo e praticar a tradução.",
      "4. Está a ver A1 Chapter 1. Pode escolher níveis A1, A2, B1, B2, C1 e C2.",
      "5. Toque ou clique numa frase para reproduzir apenas essa parte.",
    ],
    kr: [
      "1. 다음 챕터를 공부하려면 계정을 생성해서 로그인하세요.",
      "2. 위의 버튼으로 학습 언어를 변경할 수 있습니다.",
      "3. Toggle Target을 누르면 목표 언어를 숨기고 번역 연습을 할 수 있습니다.",
      "4. 현재 A1 Chapter 1을 보고 있습니다. A1, A2, B1, B2, C1, 그리고 C2 레벨을 선택할 수 있습니다.",
      "5. 문장을 탭하거나 클릭하면 해당 부분만 재생됩니다.",
    ],
    zh: [
      "1. 要学习下一章节，请创建账户并登录。",
      "2. 您可以使用上方按钮切换学习语言。",
      "3. 点击“切换目标语言（Toggle）”可隐藏目标语言，并进行翻译练习。",
      "4. 您当前正在学习 A1 第1章。您可以选择 A1、A2、B1、B2、C1 和 C2 等级。",
      "5. 点击任意句子即可仅播放该句音频。",
    ],
    jp: [
      "1. 次のチャプターを学習するには、アカウントを作成してログインしてください。",
      "2. 上のボタンから学習言語を変更できます。",
      "3. 「Toggle」を押すと、学習対象言語を非表示にして翻訳練習ができます。",
      "4. 現在は A1 のチャプター1を学習中です。A1、A2、B1、B2、C1、C2 のレベルを選択できます。",
      "5. 文をタップまたはクリックすると、その文だけを再生できます。",
    ],
    ru: [
      "1. Чтобы изучать следующую главу, создайте аккаунт и войдите в систему.",
      "2. Вы можете изменить язык обучения с помощью кнопок выше.",
      "3. Нажмите Toggle Target, чтобы скрыть целевой язык и практиковать перевод.",
      "4. Сейчас вы просматриваете A1 Chapter 1. Вы можете выбрать уровни A1, A2, B1, B2, C1 и C2.",
      "5. Нажмите или коснитесь предложения, чтобы воспроизвести только эту часть.",
    ],
  };


  useEffect(() => {
    if (!targetLang) return;
    const filtered = ALL_STUDY_LANGS.filter((l) => l !== targetLang);
    if (filtered.length > 0) setStudyLang(filtered[0]);
  }, [targetLang]);

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

        if (!dataAsset?.path) {
          setData(null);
          setStatus("ready");
          return;
        }

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

  const titleTarget = data?.title?.target ?? "";

  const titleStudy = data?.title?.[studyLang] ?? "";

  const renderLine = (b: GrammarBlock, i: number, sectionKey: string) => {
    const targetText = b.sentences?.target ?? "";
    const studyText = b.sentences?.[studyLang] ?? "";

    const lineKey = `${sectionKey}-${i}`;

    return (
      <div key={lineKey} style={{ marginBottom: 18 }}>
        {showTargetText && targetText && (
          <div
            onClick={() => void handleSpeak(targetText, lineKey)}
            style={{
              ...sentenceStyle,
              fontWeight: 600,
              cursor: "pointer",
              background: playingKey === lineKey ? "#f3f4f6" : "transparent",
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
  };
  return (
    <div style={containerStyle}>
      {/* ================= HEADER (전체 sticky) ================= */}
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "#fff",
          zIndex: 30,
          paddingTop: "calc(env(safe-area-inset-top) + 8px)",
        }}
      >
        {/* 🔥 1줄: Sign In / Create Account */}
        <div
          style={{
            display: "flex",
            gap: 8,
            width: "100%",
            marginBottom: 12,
            padding: "0 16px",
          }}
        >
          <Link href="/login" style={{ flex: 1, textDecoration: "none" }}>
            <button
              type="button"
              style={{
                ...buttonStyle(false),
                width: "100%",
                border: "1px solid #ddd",
                background: "#fff",
                color: "#111",
              }}
            >
              Sign In
            </button>
          </Link>

          <Link href="/signup" style={{ flex: 1, textDecoration: "none" }}>
            <button
              type="button"
              style={{
                ...buttonStyle(false),
                width: "100%",
                background: "#111",
                color: "#fff",
              }}
            >
              Create Account
            </button>
          </Link>
        </div>

        {/* 🔥 2줄: Back / Toggle / Copy */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "nowrap",
            overflowX: "auto",
            minWidth: 0,
            marginBottom: 12,
            padding: "0 16px",
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

          <button
            onClick={() => setShowTargetText(!showTargetText)}
            style={{ ...buttonStyle(false), flexShrink: 0 }}
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
            style={{ ...buttonStyle(false), flexShrink: 0 }}
          >
            Copy link
          </button>
        </div>

        {/* 🔥 3줄: 학습 언어 버튼들 */}
        <div
          style={{
            display: "flex",
            flexWrap: "nowrap",
            gap: 6,
            overflowX: "auto",
            minWidth: 0,
            padding: "0 16px",
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

        {/* 🔥 GUIDE — sticky 헤더 안으로 이동 (스크롤해도 고정) */}
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
            marginBottom: 10,
          }}
        >
          {guideTexts[studyLang].map((t, i) => (
            <div key={i}>{t}</div>
          ))}
        </div>
      </div>

      <div style={{ padding: "30px 0" }}>
        <div style={{ marginBottom: 30 }}>
          {showTargetText && titleTarget && (
            <div style={{ ...sentenceStyle, fontSize: 24, fontWeight: 700 }}>
              {titleTarget}
            </div>
          )}
          {titleStudy && (
            <div style={{ ...sentenceStyle, fontSize: 20, color: "#444" }}>
              {titleStudy}
            </div>
          )}
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