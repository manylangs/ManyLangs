"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import VocaAudioController from "@/components/audio/controllers/VocaAudioController";
import { useViewerTarget } from "../context/ViewerTargetContext";
import { speakText } from "@/utils/tts";
import { SUPPORTED_LANGS } from "@/app/config/languages";
import { UI_TARGET_LABELS, UiLangKey } from "../uiLabels";


const ALL_STUDY_LANGS = SUPPORTED_LANGS;

const targetStyle: React.CSSProperties = {
  cursor: "pointer",
  padding: "2px 0",
  borderRadius: 4,
};

const studyStyle: React.CSSProperties = {
  color: "#555",
  cursor: "default",
};
type LoadStatus = "idle" | "loading" | "ready" | "error";

const buttonStyle = (active: boolean): React.CSSProperties => ({
  padding: "4px 8px",
  borderRadius: 4,
  fontSize: 14,
  background: active ? "#333" : "#eee",
  color: active ? "#fff" : "#333",
  border: "none",
  cursor: "pointer",
});

/* 🔥 현재 runtime 스키마: word.<lang> = { core, meaning_zone } 객체.
   (예전 뷰어는 word.<lang>이 plain string이라고 가정했었음 — 스키마 변경으로 깨짐) */
type WordEntry = {
  core: string;
  meaning_zone?: string[];
};

type VocaBlock = {
  word: Record<string, WordEntry | string>;
  explanation?: Record<string, string>;
  examples?: Record<string, string>[];
  frequency_stars?: string;
};

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

export default function VocabularyViewer({
  lang,
  level,
  chapter,
}: any) {


  const { showTargetText } = useViewerTarget();
  const [studyLang, setStudyLang] = useState<string>("en");

  const [blocks, setBlocks] = useState<VocaBlock[]>([]);

  const [chapters, setChapters] = useState<string[]>([]);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [playingKey, setPlayingKey] = useState<string | null>(null);

  const handleSpeak = async (text: string, key: string) => {
    if (!lang) return;

    const trimmed = text.trim();
    if (!trimmed) return;

    setPlayingKey(key);
    const currentKey = key;

    try {
      await speakText(trimmed, lang);
    } finally {
      setPlayingKey((prev) => (prev === currentKey ? null : prev));
    }
  };

  /* 🔥 앱(모바일 웹뷰)에서 onClick만으로는 탭이 씹히는 경우가 있어
     클릭/터치 모두 동일하게 반응하도록 공용 핸들러로 통일.
     같은 탭에서 onClick과 onTouchEnd가 중복 실행되지 않도록 방지 처리. */
  const lastFiredRef = useRef(0);
  const makeSpeakTrigger = (text: string, key: string) => {
    const fire = (e?: { preventDefault?: () => void }) => {
      const now = Date.now();
      if (now - lastFiredRef.current < 400) return; // 중복 방지 (touch → click 합성 이벤트)
      lastFiredRef.current = now;
      e?.preventDefault?.();
      void handleSpeak(text, key);
    };
    return {
      onClick: () => fire(),
      onTouchEnd: (e: React.TouchEvent) => fire(e),
    };
  };
  useEffect(() => {

    const filtered = ALL_STUDY_LANGS.filter(
      (l) => l !== lang
    );

    if (!filtered.includes(studyLang)) {
      setStudyLang(filtered[0]);
    }

  }, [lang]);

  const currentIndex = chapters.indexOf(chapter);

  const prev =
    currentIndex > 0 ? chapters[currentIndex - 1] : chapter;

  const next =
    currentIndex >= 0 && currentIndex < chapters.length - 1
      ? chapters[currentIndex + 1]
      : chapter;

  useEffect(() => {

    let cancelled = false;

    const load = async () => {

      try {

        setStatus("loading");

        const res = await fetch(
          `/api/content/manifest?lang=${lang}&series=voca&level=${level}&chapter=${chapter}`
        );

        if (!res.ok) throw new Error("manifest fetch failed");

        const manifest = await res.json();

        if (cancelled) return;

        if (!Array.isArray(manifest.chapters))
          throw new Error("chapters missing");

        setChapters(manifest.chapters);

        const data =
          manifest.assets?.find((a: any) => a.kind === "data");

        if (!data?.path)
          throw new Error("data asset missing");

        const dataRes = await fetch(data.path);

        if (!dataRes.ok)
          throw new Error("data fetch failed");

        const dataJson = await dataRes.json();

        if (!Array.isArray(dataJson.blocks))
          throw new Error("blocks missing");

        setBlocks(dataJson.blocks);

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

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>

      {status === "loading" && (
        <div style={{ padding: 12 }}>Loading...</div>
      )}

      {status === "error" && (
        <div style={{ padding: 12, color: "red" }}>
          Failed to load vocabulary.
        </div>
      )}

      {status === "ready" && (
        <>
          <VocaAudioController
            lang={lang}
            level={level}
            chapter={chapter}
          />

          <div style={{ height: 30 }} />

          {/* Study Lang */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {ALL_STUDY_LANGS
              .filter((l) => l !== lang)
              .map((l) => (
                <button
                  key={l}
                  style={buttonStyle(studyLang === l)}
                  onClick={() => setStudyLang(l)}
                >
                  {UI_TARGET_LABELS[l as UiLangKey]?.native ?? l.toUpperCase()}
                </button>
              ))}
          </div>

          {/* Prev Next */}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <Link href={`/viewer/${lang}/voca/${level}/${prev}`}>
              ← Prev
            </Link>

            <Link href={`/viewer/${lang}/voca/${level}/${next}`}>
              Next →
            </Link>
          </div>

          {/* Chapters */}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 24,
            }}
          >
            {chapters.map((c) => (
              <Link
                key={c}
                href={`/viewer/${lang}/voca/${level}/${c}`}
                style={{
                  padding: "4px 8px",
                  fontSize: 13,
                  borderRadius: 4,
                  background: c === chapter ? "#333" : "#eee",
                  color: c === chapter ? "#fff" : "#333",
                  textDecoration: "none",
                }}
              >
                {c}
              </Link>
            ))}
          </div>

          {/* Vocabulary */}

          {blocks.map((block, idx) => (

            <section key={idx} style={{ marginBottom: 56 }}>
              {(() => {
                const key = `word-${idx}`;
                const targetEntry = block.word?.target;
                const studyEntry = block.word?.[studyLang];

                const targetText = getWordText(targetEntry);
                const studyText = getWordText(studyEntry);

                const targetExtras = getMeaningZoneExtras(targetEntry);
                const studyExtras = getMeaningZoneExtras(studyEntry);

                return (
                  <>
                    <div style={{ fontWeight: 700 }}>
                      Set {idx + 1}
                    </div>

                    {showTargetText && targetText && (
                      <div
                        {...makeSpeakTrigger(targetText, key)}
                        role="button"
                        tabIndex={0}
                        style={{
                          ...targetStyle,
                          fontSize: 22,
                          fontWeight: 700,
                          touchAction: "manipulation",
                          WebkitTapHighlightColor: "transparent",
                          background:
                            playingKey === key ? "#f3f4f6" : "transparent",
                        }}
                      >
                        {targetText}
                        {targetExtras.length > 0 && (
                          <span
                            style={{
                              fontWeight: 400,
                              fontSize: 12,
                              color: "#999",
                              marginLeft: 8,
                            }}
                          >
                            {getSimilarLabel("target")} {targetExtras.join(", ")}
                          </span>
                        )}
                      </div>
                    )}

                    {studyText && (
                      <div style={{ color: "#555" }}>
                        {studyText}
                        {studyExtras.length > 0 && (
                          <span
                            style={{
                              fontSize: 12,
                              color: "#aaa",
                              marginLeft: 8,
                            }}
                          >
                            {getSimilarLabel(studyLang)} {studyExtras.join(", ")}
                          </span>
                        )}
                      </div>
                    )}

                    {block.frequency_stars && (
                      <div style={{ margin: "6px 0 16px", color: "#f5a623" }}>
                        {block.frequency_stars}
                      </div>
                    )}

                    {block.explanation && (
                      <div style={{ marginTop: 16, marginBottom: 20 }}>
                        <div style={{ fontWeight: 700 }}>
                          Explanation
                        </div>

                        {showTargetText && block.explanation?.target && (
                          <div
                            {...makeSpeakTrigger(
                              block.explanation?.target ?? "",
                              `expl-${idx}`
                            )}
                            role="button"
                            tabIndex={0}
                            style={{
                              ...targetStyle,
                              touchAction: "manipulation",
                              WebkitTapHighlightColor: "transparent",
                              background:
                                playingKey === `expl-${idx}`
                                  ? "#f3f4f6"
                                  : "transparent",
                            }}
                          >
                            {block.explanation.target}
                          </div>
                        )}

                        {block.explanation?.[studyLang] && (
                          <div style={{ color: "#555" }}>
                            {block.explanation[studyLang]}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontWeight: 700 }}>
                        Examples
                      </div>

                      {block.examples?.map((ex: any, i: number) => {
                        const exKey = `voca-${idx}-${i}`;
                        const exTarget = ex?.target ?? "";
                        const exStudy = ex?.[studyLang] ?? "";

                        return (
                          <div
                            key={i}
                            style={{
                              borderBottom: "1px solid #eee",
                              marginBottom: 12,
                              paddingBottom: 12,
                            }}
                          >
                            {showTargetText && exTarget && (
                              <div
                                {...makeSpeakTrigger(exTarget, exKey)}
                                role="button"
                                tabIndex={0}
                                style={{
                                  ...targetStyle,
                                  touchAction: "manipulation",
                                  WebkitTapHighlightColor: "transparent",
                                  background:
                                    playingKey === exKey
                                      ? "#f3f4f6"
                                      : "transparent",
                                }}
                              >
                                {exTarget}
                              </div>
                            )}

                            {exStudy && (
                              <div style={{ color: "#555" }}>
                                {exStudy}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </section>

          ))}

        </>
      )}
    </div>
  );
}