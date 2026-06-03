"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ConversationAudioController from "@/components/audio/controllers/ConversationAudioController";
import { useViewerTarget } from "../context/ViewerTargetContext";
import { speakText } from "@/utils/tts";

type StudyLang = "en" | "es" | "fr" | "pt";

type Line = {
  speaker: string;
  sentences: Record<string, string>;
};

type Block = {
  set_id: string;
  lines: Line[];
};

type Props = {
  lang: string;
  level: string;
  chapter: string;
};

type LoadStatus = "idle" | "loading" | "ready" | "error";

/* ================= 상수 ================= */

const ALL_STUDY_LANGS: StudyLang[] = ["en", "es", "fr", "pt"];

/* ================= 스타일 ================= */

const buttonStyle = (active: boolean): React.CSSProperties => ({
  padding: "4px 8px",
  borderRadius: 4,
  fontSize: 14,
  background: active ? "#333" : "#eee",
  color: active ? "#fff" : "#333",
  border: "none",
  cursor: active ? "default" : "pointer",
});

const targetStyle: React.CSSProperties = {
  cursor: "pointer",
  padding: "2px 0",
  borderRadius: 4,
};

const studyStyle: React.CSSProperties = {
  color: "#555",
};
/* ================= 컴포넌트 ================= */

export default function ConversationViewer({
  lang,
  level,
  chapter,
}: Props) {
  const { targetLang, showTargetText } = useViewerTarget();

  const [studyLang, setStudyLang] = useState<StudyLang>("en");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [chapters, setChapters] = useState<string[]>([]);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [playingKey, setPlayingKey] = useState<string | null>(null);

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

  /* ================= studyLang 자동 설정 ================= */

  useEffect(() => {
    const filtered = ALL_STUDY_LANGS.filter((l) => l !== targetLang);
    if (filtered.length > 0) setStudyLang(filtered[0]);
  }, [targetLang]);

  /* ================= 데이터 로딩 ================= */

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setStatus("loading");

        const res = await fetch(
          `/api/content/manifest?lang=${targetLang}&series=conversation&level=${level}&chapter=${chapter}`
        );

        // ✅ 1. manifest 실패 차단 (핵심)
        if (!res.ok) throw new Error("manifest fetch failed");

        const manifest = await res.json();

        if (cancelled) return;

        // ✅ 2. chapters 검증
        if (!Array.isArray(manifest.chapters))
          throw new Error("chapters missing");

        setChapters(manifest.chapters);

        // ✅ 3. data asset 검증
        const data = manifest.assets?.find((a: any) => a.kind === "data");

        if (!data?.path)
          throw new Error("data asset missing");

        // ✅ 4. data fetch 검증
        const dataRes = await fetch(data.path);

        if (!dataRes.ok)
          throw new Error("data fetch failed");

        const dataJson = await dataRes.json();

        // ✅ 5. blocks 검증
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
  }, [targetLang, level, chapter]);

  const idx = chapters.indexOf(chapter);
  const prev = idx > 0 ? chapters[idx - 1] : chapter;
  const next =
    idx >= 0 && idx < chapters.length - 1 ? chapters[idx + 1] : chapter;

  /* ================= UI ================= */

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      {status === "loading" && <div>Loading...</div>}
      {status === "error" && <div>Load Error</div>}

      {status === "ready" && (
        <>
          <ConversationAudioController
            lang={targetLang}
            level={level}
            chapter={chapter}
          />

          <div style={{ height: 30 }} />

          {/* 학습언어 선택 */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {ALL_STUDY_LANGS.filter((l) => l !== targetLang).map((l) => (
              <button
                key={l}
                onClick={() => setStudyLang(l)}
                style={buttonStyle(studyLang === l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {/* 이동 */}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Link href={`/viewer/${targetLang}/conversation/${level}/${prev}`}>
              ← Prev
            </Link>
            <Link href={`/viewer/${targetLang}/conversation/${level}/${next}`}>
              Next →
            </Link>
          </div>

          {/* 챕터 목록 */}
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {chapters.map((ch) => (
              <Link
                key={ch}
                href={`/viewer/${targetLang}/conversation/${level}/${ch}`}
                style={{
                  padding: "4px 8px",
                  background: ch === chapter ? "#333" : "#eee",
                  color: ch === chapter ? "#fff" : "#333",
                }}
              >
                {ch}
              </Link>
            ))}
          </div>

          {/* 본문 */}
          <div style={{ marginTop: 32 }}>
            {blocks.map((block, idx) => (
              <div key={block.set_id} style={{ marginBottom: 40 }}>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>
                  Set {idx + 1}
                </div>

                {block.lines.map((line, i) => {
                  const targetText =
                    line.sentences?.target ?? "";
                  const studyText =
                    line.sentences[studyLang] ?? "";

                  const key = `${block.set_id}-${i}`;

                  return (
                    <div key={i} style={{ marginBottom: 12 }}>
                      {/* 🔥 목표언어 (클릭 가능) */}
                      {showTargetText && targetText && (
                        <div
                          onClick={() => void handleSpeak(targetText, key)}
                          style={{
                            ...targetStyle,
                            background:
                              playingKey === key ? "#f3f4f6" : "transparent",
                          }}
                        >
                          <strong>{line.speaker}:</strong> {targetText}
                        </div>
                      )}

                      {/* ❌ 학습언어 (클릭 금지) */}
                      <div style={studyStyle}>
                        <strong>{line.speaker}:</strong> {studyText}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
