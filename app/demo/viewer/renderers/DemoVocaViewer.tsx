"use client";

import { speakText } from "@/utils/tts";
import { useEffect, useState } from "react";
import Link from "next/link";
import VocaAudioController from "@/components/audio/controllers/VocaAudioController";
import { SUPPORTED_LANGS } from "@/app/config/languages";
import { UI_TARGET_LABELS, UiLangKey } from "@/app/viewer/uiLabels";


const ALL_STUDY_LANGS = SUPPORTED_LANGS;

type Example = {
  target: string;
  [key: string]: string;
};

/* 🔥 현재 runtime 스키마: word.<lang> = { core, meaning_zone } 객체.
   (예전 뷰어는 word.<lang>이 plain string이라고 가정했었음 — 스키마 변경으로 깨짐) */
type WordEntry = {
  core: string;
  meaning_zone?: string[];
};

type Block = {
  id?: string;
  type?: "vocab_item";
  word: Record<string, WordEntry>;
  examples: Example[];
};

type Props = {
  targetLang: string;
  level: string;
  chapter: string;
};

type Status = "loading" | "ready" | "error";

/** word.<lang> 값에서 표시용 단어 텍스트(core)를 안전하게 추출.
 *  - 정상 케이스: { core: "go", meaning_zone: [...] } → "go"
 *  - 혹시 남아있을 구버전 plain string 데이터도 방어적으로 지원(하위호환) */
function getWordText(entry: WordEntry | string | undefined | null): string {
  if (!entry) return "";
  if (typeof entry === "string") return entry;
  return entry.core ?? "";
}

/** meaning_zone 중 core를 제외한 "비슷한 표현들"만 뽑아낸다.
 *  meaning_zone[0]은 항상 core와 동일하므로(설계 규칙), core와 다른 나머지만 반환.
 *  구버전 plain string 데이터(meaning_zone 없음)는 빈 배열 반환. */
function getMeaningZoneExtras(entry: WordEntry | string | undefined | null): string[] {
  if (!entry || typeof entry === "string") return [];
  const zone = entry.meaning_zone ?? [];
  return zone.filter((z) => z && z !== entry.core);
}

/* 🔥 "meaning zone"이라는 전문용어 대신, 언어별로 자연스러운 안내 라벨을 붙인다.
   "이 단어가 문맥에 따라 다르게 표현될 수도 있다"는 걸 학습자가 직관적으로 이해하도록. */
const SIMILAR_EXPRESSION_LABELS: Record<string, string> = {
  target: "Also:",
  en: "Also:",
  es: "También:",
  fr: "Aussi :",
  pt: "Também:",
  kr: "비슷한 표현:",
  zh: "同义表达：",
  jp: "類似表現：",
};

function getSimilarLabel(lang: string): string {
  return SIMILAR_EXPRESSION_LABELS[lang] ?? SIMILAR_EXPRESSION_LABELS.en;
}


/* 🔥 RealViewer 기준 스타일 */
const containerStyle: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
};

const buttonStyle = (active: boolean): React.CSSProperties => ({
  padding: "4px 6px",     // 🔥 줄임
  borderRadius: 6,
  fontSize: 12,           // 🔥 줄임
  background: active ? "#333" : "#f2f2f2",
  color: active ? "#fff" : "#333",
  border: "none",
  cursor: active ? "default" : "pointer",
  whiteSpace: "nowrap",
});

/* 🔥 RealViewer sentence 느낌 */
const sentenceStyle: React.CSSProperties = {
  borderRadius: 6,
  padding: "4px 6px",
  lineHeight: 1.7,
};

export default function DemoVocaViewer({
  targetLang,
  level,
  chapter,
}: Props) {
  const [showTargetText, setShowTargetText] = useState(true);


  const [studyLang, setStudyLang] = useState<string>("en");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const TARGET_KEY = "target";
const guideTexts: Record<string, string[]> = {
    en: [
      "1. To study the next chapter, please create an account and sign in.",
      "2. You can change the study language using the buttons above.",
      "3. You can move to the next set using the <> buttons below the audio.",
      "4. Tap or click a sentence to play only that part.",
      "5. Press Toggle Target to hide the target language and practice translating.",
      "6. You are currently viewing A1 Chapter 1. You can choose levels A1, A2, B1, B2, C1, and C2.",
    ],
    es: [
      "1. Para estudiar el siguiente capítulo, crea una cuenta e inicia sesión.",
      "2. Puedes cambiar el idioma de estudio usando los botones de arriba.",
      "3. Puedes moverte al siguiente set usando los botones <> debajo del audio.",
      "4. Toca o haz clic en una frase para reproducir solo esa parte.",
      "5. Presiona Toggle Target para ocultar el idioma objetivo y practicar la traducción.",
      "6. Actualmente estás viendo A1 Chapter 1. Puedes elegir niveles A1, A2, B1, B2, C1 y C2.",
    ],
    fr: [
      "1. Pour étudier le chapitre suivant, créez un compte et connectez-vous.",
      "2. Vous pouvez changer la langue d’étude avec les boutons ci-dessus.",
      "3. Vous pouvez passer au set suivant avec les boutons <> sous l’audio.",
      "4. Appuyez ou cliquez sur une phrase pour lire uniquement cette partie.",
      "5. Appuyez sur Toggle Target pour cacher la langue cible et pratiquer la traduction.",
      "6. Vous regardez actuellement A1 Chapter 1. Vous pouvez choisir les niveaux A1, A2, B1, B2, C1 et C2.",
    ],
    pt: [
      "1. Para estudar o próximo capítulo, crie uma conta e inicie sessão.",
      "2. Pode mudar o idioma de estudo usando os botões acima.",
      "3. Pode ir para o próximo set usando os botões <> abaixo do áudio.",
      "4. Toque ou clique numa frase para reproduzir apenas essa parte.",
      "5. Pressione Toggle Target para ocultar o idioma alvo e praticar a tradução.",
      "6. Está a ver A1 Chapter 1. Pode escolher níveis A1, A2, B1, B2, C1 e C2.",
    ],
    kr: [
      "1. 다음 챕터를 공부하려면 계정을 생성해서 로그인하세요.",
      "2. 위의 버튼으로 학습 언어를 변경할 수 있습니다.",
      "3. 오디오 아래의 <> 버튼으로 다음 세트로 이동할 수 있습니다.",
      "4. 문장을 탭하거나 클릭하면 해당 부분만 재생됩니다.",
      "5. Toggle Target을 누르면 목표 언어를 숨기고 번역 연습을 할 수 있습니다.",
      "6. 현재 A1 Chapter 1을 보고 있습니다. A1, A2, B1, B2, C1, 그리고 C2 레벨을 선택할 수 있습니다.",
    ],
    zh: [
      "1. 要学习下一章节，请创建账户并登录。",
      "2. 您可以使用上方按钮切换学习语言。",
      "3. 您可以使用音频下方的 <> 按钮切换到下一组内容。",
      "4. 点击任意句子即可仅播放该句音频。",
      "5. 点击“切换目标语言（Toggle）”可隐藏目标语言，并进行翻译练习。",
      "6. 您当前正在学习 A1 第1章。您可以选择 A1、A2、B1、B2、C1 和 C2 等级。",
    ],
    jp: [
      "1. 次のチャプターを学習するには、アカウントを作成してログインしてください。",
      "2. 上のボタンから学習言語を変更できます。",
      "3. 音声の下にある <> ボタンで次のセットへ移動できます。",
      "4. 文をタップまたはクリックすると、その文だけを再生できます。",
      "5. 「Toggle」を押すと、学習対象言語を非表示にして翻訳練習ができます。",
      "6. 現在は A1 のチャプター1を学習中です。A1、A2、B1、B2、C1、C2 のレベルを選択できます。",
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
  useEffect(() => {
    const filtered = ALL_STUDY_LANGS.filter((l) => l !== targetLang);
    if (filtered.length > 0) setStudyLang(filtered[0]);
  }, [targetLang]);

  useEffect(() => {
    if (!targetLang) return;

    let cancelled = false;

    const load = async () => {
      try {
        setStatus("loading");

        const res = await fetch(
          `/api/content/manifest?lang=${targetLang}&series=voca&level=${level}&chapter=${chapter}&mode=demo`
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

        if (cancelled) return;

        setBlocks(allBlocks);
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

        {/* 🔥 AUDIO — sticky 헤더 안으로 이동 (스크롤해도 고정) */}
        {targetLang && (
          <div
            style={{
              borderBottom: "1px solid #eee",
              padding: "6px 16px",
              marginTop: 12,
              marginLeft: -16,
              marginRight: -16,
            }}
          >
            <VocaAudioController lang={targetLang} level={level} chapter={chapter} />
          </div>
        )}

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

      {/* 🔥 CONTENT */}
      <div style={{ padding: "0 16px 30px" }}>
        {blocks.map((block, idx) => {
          const setNumber = idx + 1;

          const targetEntry = block.word?.[TARGET_KEY];
          const studyEntry = block.word?.[studyLang];
          const word = getWordText(targetEntry);
          const wordStudy = getWordText(studyEntry);

          const wordExtras = getMeaningZoneExtras(targetEntry);
          const wordStudyExtras = getMeaningZoneExtras(studyEntry);

          return (
            <div key={block.id ?? idx} style={{ marginBottom: 40 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>
                SET {setNumber}
              </div>

              {/* 단어 */}
              <div style={{ marginBottom: 12 }}>
                {showTargetText && word && (
                  <div
                    onClick={() => void handleSpeak(word, `word-${idx}`)}
                    style={{
                      ...sentenceStyle,
                      fontWeight: 700,
                      cursor: "pointer",
                      background: playingKey === `word-${idx}` ? "#f3f4f6" : undefined,
                    }}
                  >
                    {word}
                    {wordExtras.length > 0 && (
                      <span
                        style={{
                          fontWeight: 400,
                          fontSize: 12,
                          color: "#999",
                          marginLeft: 8,
                        }}
                      >
                        {getSimilarLabel(TARGET_KEY)} {wordExtras.join(", ")}
                      </span>
                    )}
                  </div>
                )}
                {wordStudy && (
                  <div style={{ ...sentenceStyle, color: "#666" }}>
                    {wordStudy}
                    {wordStudyExtras.length > 0 && (
                      <span
                        style={{
                          fontSize: 12,
                          color: "#aaa",
                          marginLeft: 8,
                        }}
                      >
                        {getSimilarLabel(studyLang)} {wordStudyExtras.join(", ")}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 예문 */}
              {block.examples?.map((ex, i) => {
                const t = ex[TARGET_KEY] ?? "";
                const s = ex[studyLang] ?? "";

                return (
                  <div key={i} style={{ marginBottom: 14 }}>
                    {showTargetText && t && (
                      <div
                        onClick={() => void handleSpeak(t, `ex-${idx}-${i}`)}
                        style={{
                          ...sentenceStyle,
                          cursor: "pointer",
                          background:
                            playingKey === `ex-${idx}-${i}` ? "#f3f4f6" : undefined,
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
            </div>
          );
        })}
      </div>
    </div>
  );
}