"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import VocaAudioController from "@/components/audio/controllers/VocaAudioController";
import { useViewerTarget } from "../context/ViewerTargetContext";

type StudyLang = "en" | "es" | "fr" | "pt";

const ALL_STUDY_LANGS: StudyLang[] = ["en", "es", "fr", "pt"];

const LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"];

type LoadStatus = "idle" | "loading" | "ready" | "error";

const buttonStyle = (active: boolean) => ({
  padding: "4px 8px",
  borderRadius: 4,
  fontSize: 14,
  background: active ? "#333" : "#eee",
  color: active ? "#fff" : "#333",
  border: "none",
  cursor: "pointer",
});
type VocaBlock = {
  word: Record<string, string>;
  examples?: Record<string, string>[];
};
export default function VocabularyViewer({
  lang,
  level,
  chapter,
}: any) {

  const router = useRouter();

  const { targetLang, showTargetText } = useViewerTarget();
  const [studyLang, setStudyLang] = useState<StudyLang>("en");

  const [blocks, setBlocks] = useState<VocaBlock[]>([]);

  const [chapters, setChapters] = useState<string[]>([]);
  const [status, setStatus] = useState<LoadStatus>("idle");

  useEffect(() => {

    const filtered = ALL_STUDY_LANGS.filter(
      (l) => l !== targetLang
    );

    if (!filtered.includes(studyLang)) {
      setStudyLang(filtered[0]);
    }

    /* 🔥 viewer URL sync */

    router.replace(
      `/viewer/${targetLang}/voca/${level}/${chapter}`
    );

  }, [targetLang]);

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
          `/api/content/manifest?lang=${targetLang}&series=voca&level=${level}&chapter=${chapter}`
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

  }, [targetLang, level, chapter]);

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
            lang={targetLang}
            level={level}
            chapter={chapter}
          />

          {/* Level navigation */}

          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {LEVELS.map((lv) => (
              <Link
                key={lv}
                href={`/viewer/${targetLang}/voca/${lv}/001`}
                style={{
                  ...buttonStyle(lv === level),
                  textDecoration: "none",
                }}
              >
                {lv.toUpperCase()}
              </Link>
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
            <Link href={`/viewer/${targetLang}/voca/${level}/${prev}`}>
              ← Prev
            </Link>

            <Link href={`/viewer/${targetLang}/voca/${level}/${next}`}>
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
                href={`/viewer/${targetLang}/voca/${level}/${c}`}
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

          {/* Study Lang */}

          <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
            {ALL_STUDY_LANGS
              .filter((l) => l !== targetLang)
              .map((l) => (
                <button
                  key={l}
                  style={buttonStyle(studyLang === l)}
                  onClick={() => setStudyLang(l)}
                >
                  {l.toUpperCase()}
                </button>
              ))}
          </div>

          {/* Vocabulary */}

          {blocks.map((block, idx) => (

            <section key={idx} style={{ marginBottom: 56 }}>

              <div style={{ fontWeight: 700 }}>
                Set {idx + 1}
              </div>

              {showTargetText && (
                <div style={{ fontSize: 22, fontWeight: 700 }}>
                  {block.word?.[targetLang] ?? block.word?.target ?? ""}
                </div>
              )}

              {block.word?.[studyLang] && (
                <div style={{ color: "#555" }}>
                  {block.word[studyLang]}
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                {block.examples?.map((ex: any, i: number) => (

                  <div key={i}>

                    {showTargetText && (
                      <div>
                        {ex?.[targetLang] ?? ex?.target ?? ""}
                      </div>
                    )}

                    {ex?.[studyLang] && (
                      <div>
                        {ex[studyLang]}
                      </div>
                    )}

                  </div>
                ))}

              </div>

            </section>

          ))}

        </>
      )}
    </div>
  );
}