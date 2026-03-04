"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import RealAudioController from "@/components/audio/controllers/RealAudioController";
import { useViewerTarget } from "../context/ViewerTargetContext";

type StudyLang = "en" | "es" | "fr" | "pt";

type Sentence = {
  texts: {
    kr: string;
    en: string;
    es: string;
    fr: string;
    pt: string;
  };
};

type Props = {
  lang: string;
  level: string;
  chapter: string;
};

const LANGS: StudyLang[] = ["en", "es", "fr", "pt"];

const buttonStyle = (active: boolean) => ({
  padding: "4px 8px",
  borderRadius: 4,
  fontSize: 14,
  background: active ? "#333" : "#eee",
  color: active ? "#fff" : "#333",
  border: "none",
  cursor: active ? "default" : "pointer",
});

type LoadStatus = "idle" | "loading" | "ready" | "error";

export default function RealViewer({
  lang,
  level,
  chapter,
}: Props) {
  const { showTargetText } = useViewerTarget();

  const [studyLang, setStudyLang] = useState<StudyLang>("en");
  const [audioUrl, setAudioUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [status, setStatus] = useState<LoadStatus>("idle");

  const FALLBACK_REAL_CHAPTERS = useMemo(
    () => Array.from({ length: 20 }, (_, i) => String(i + 1).padStart(3, "0")),
    []
  );

  const [chapters, setChapters] = useState<string[]>(FALLBACK_REAL_CHAPTERS);
  const currentIndex = chapters.indexOf(chapter);

  const prev =
    currentIndex > 0 ? chapters[currentIndex - 1] : chapters[0] ?? chapter;

  const next =
    currentIndex >= 0 && currentIndex < chapters.length - 1
      ? chapters[currentIndex + 1]
      : chapters[chapters.length - 1] ?? chapter;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setStatus("loading");
        setAudioUrl("");
        setImageUrl("");
        setSentences([]);

        const res = await fetch(
          `/api/content/manifest?lang=${lang}&series=real&level=${level}&chapter=${chapter}`
        );

        if (!res.ok) throw new Error("Manifest failed");

        const manifest = await res.json();

        if (cancelled) return;

        // ✅ 레벨별 실제 chapters 적용 (Real은 20개가 그대로 내려오게 됨)
        const incoming = Array.isArray(manifest.chapters) ? manifest.chapters : null;

        // ✅ chapters가 서버에서 안 오면 Real은 20개 유지 (동결 유지)
        setChapters(incoming && incoming.length > 0 ? incoming : FALLBACK_REAL_CHAPTERS);

        // 🔹 array → object 변환
        const audio = manifest.assets?.find((a: any) => a.kind === "audio")?.path;
        const image = manifest.assets?.find((a: any) => a.kind === "image")?.path;
        const data = manifest.assets?.find((a: any) => a.kind === "data")?.path;

        setAudioUrl(audio || "");
        setImageUrl(image || "");

        if (data) {
          const dataRes = await fetch(data);
          const dataJson = await dataRes.json();

          const descBlock = dataJson.blocks?.find(
            (b: any) => b.type === "description"
          );

          setSentences(descBlock?.sentences || []);
        }

        setStatus("ready");
      } catch (e) {
        if (!cancelled) setStatus("error");
        console.error(e);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [lang, level, chapter]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      {status === "loading" && (
        <div style={{ padding: 12, color: "#666" }}>Loading...</div>
      )}

      {status === "error" && (
        <div style={{ padding: 12, color: "#c00" }}>
          Failed to load this chapter.
        </div>
      )}

      {status === "ready" && (
        <>
          {audioUrl && <RealAudioController src={audioUrl} />}

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {LANGS.map((l) => (
              <button
                key={l}
                onClick={() => setStudyLang(l)}
                style={buttonStyle(studyLang === l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Link href={`/viewer/${lang}/real/${level}/${prev}`}>← Prev</Link>
            <Link href={`/viewer/${lang}/real/${level}/${next}`}>Next →</Link>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginTop: 12,
            }}
          >
            {chapters.map((ch) => (
              <Link
                key={ch}
                href={`/viewer/${lang}/real/${level}/${ch}`}
                style={{
                  padding: "4px 8px",
                  fontSize: 13,
                  borderRadius: 4,
                  background: ch === chapter ? "#333" : "#eee",
                  color: ch === chapter ? "#fff" : "#333",
                  textDecoration: "none",
                }}
              >
                {ch}
              </Link>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 32,
              marginTop: 24,
              alignItems: "start",
            }}
          >
            <div>
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt=""
                  style={{ width: "100%", borderRadius: 8 }}
                />
              )}
            </div>

            <div>
              {sentences.map((s, i) => {
                const targetText =
                  s.texts?.[lang as keyof typeof s.texts] ?? "";
                const studyText = s.texts?.[studyLang] ?? "";

                return (
                  <div key={i} style={{ marginBottom: 18 }}>
                    {showTargetText && (
                      <div style={{ marginBottom: 4, fontWeight: 500 }}>
                        {targetText}
                      </div>
                    )}
                    <div>{studyText}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
