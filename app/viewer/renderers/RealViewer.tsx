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

type Block =
  | { type: "image"; src: string }
  | { type: "description"; sentences: Sentence[] };

type RealData = {
  meta: {
    series: "real";
    level: string;
    id: string;
  };
  blocks: Block[];
};

type Props = {
  level: string;
  chapter: string;
  data: RealData;
};

const LANGS: StudyLang[] = ["en", "es", "fr", "pt"];

/* ✅ Conversation과 동일한 버튼 스타일 */
const buttonStyle = (active: boolean) => ({
  padding: "4px 8px",
  borderRadius: 4,
  fontSize: 14,
  background: active ? "#333" : "#eee",
  color: active ? "#fff" : "#333",
  border: "none",
  cursor: active ? "default" : "pointer",
  textDecoration: "none",
});

/* ===============================
   🔐 Signed URL 캐시
================================= */

const urlCache = new Map<string, { url: string; expiresAt: number }>();
const inflight = new Map<string, Promise<string>>();
const REFRESH_MARGIN = 1000 * 60 * 2;

async function fetchSignedUrl(path: string): Promise<string> {
  const now = Date.now();

  const cached = urlCache.get(path);
  if (cached && cached.expiresAt - now > REFRESH_MARGIN) {
    return cached.url;
  }

  if (inflight.has(path)) {
    return inflight.get(path)!;
  }

  const p = fetch(`/api/content/signed-url?path=${encodeURIComponent(path)}`)
    .then((res) => {
      if (!res.ok) throw new Error("Failed signed-url");
      return res.json();
    })
    .then((data) => {
      const expiresAt = data.expiresAt ?? Date.now() + 1000 * 60 * 5;

      urlCache.set(path, {
        url: data.url,
        expiresAt,
      });

      inflight.delete(path);
      return data.url;
    })
    .catch((err) => {
      inflight.delete(path);
      throw err;
    });

  inflight.set(path, p);
  return p;
}

/* =============================== */

export default function RealViewer({ level, chapter, data }: Props) {
  const [lang, setLang] = useState<StudyLang>("en");
  const { showTargetText } = useViewerTarget();

  const [audioUrl, setAudioUrl] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");

  const chapters = useMemo(
    () => Array.from({ length: 20 }, (_, i) => String(i + 1).padStart(3, "0")),
    []
  );

  const currentIndex = chapters.indexOf(chapter);
  const prev = currentIndex > 0 ? chapters[currentIndex - 1] : chapter;
  const next =
    currentIndex < chapters.length - 1
      ? chapters[currentIndex + 1]
      : chapter;

  const descBlock = data.blocks.find(
    (b) => b.type === "description"
  ) as { type: "description"; sentences: Sentence[] } | undefined;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setAudioUrl("");
        setImageUrl("");

        const manifestPath = `content/real/kr/${level}/${chapter}/manifest.json`;
        const manifestSignedUrl = await fetchSignedUrl(manifestPath);

        const manifestRes = await fetch(manifestSignedUrl);
        if (!manifestRes.ok) throw new Error("Manifest fetch failed");

        const manifest = await manifestRes.json();

        const audioAsset = manifest.assets.find(
          (a: any) => a.kind === "audio"
        );

        const imageAsset = manifest.assets.find(
          (a: any) => a.kind === "image"
        );

        if (audioAsset && !cancelled) {
          const audioPath = `content/real/kr/${level}/${chapter}/${audioAsset.path}`;
          const signedAudio = await fetchSignedUrl(audioPath);
          if (!cancelled) setAudioUrl(signedAudio);
        }

        if (imageAsset && !cancelled) {
          const imagePath = `content/real/kr/${level}/${chapter}/${imageAsset.path}`;
          const signedImage = await fetchSignedUrl(imagePath);
          if (!cancelled) setImageUrl(signedImage);
        }
      } catch (e) {
        console.error("Signed URL load failed:", e);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [level, chapter]);

  return (
    <>
      {/* 🔊 Sticky Audio */}
      <div
        style={{
          position: "sticky",
          top: 100,
          zIndex: 900,
          background: "#fff",
          borderBottom: "1px solid #eee",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {audioUrl && <RealAudioController src={audioUrl} />}
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>

        {/* 🌐 학습 언어 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {LANGS.map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={buttonStyle(lang === l)}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* ⬅ Prev / Next */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <Link
            href={`/viewer/kr/real/${level}/${prev}`}
            style={buttonStyle(false)}
          >
            ← Prev
          </Link>

          <Link
            href={`/viewer/kr/real/${level}/${next}`}
            style={buttonStyle(false)}
          >
            Next →
          </Link>
        </div>

        {/* 📚 챕터 버튼 */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 20,
          }}
        >
          {chapters.map((c) => (
            <Link
              key={c}
              href={`/viewer/kr/real/${level}/${c}`}
              style={buttonStyle(c === chapter)}
            >
              {c}
            </Link>
          ))}
        </div>

        {/* 🖼 + 📝 콘텐츠 */}
        <section style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {imageUrl && (
            <div style={{ flex: "0 0 300px" }}>
              <img
                src={imageUrl}
                alt=""
                style={{ width: "100%", borderRadius: 8 }}
              />
            </div>
          )}

          {descBlock && (
            <div style={{ flex: "1 1 300px" }}>
              {descBlock.sentences.map((s, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  {showTargetText && <div>{s.texts.kr}</div>}
                  <div style={{ color: "#444" }}>
                    {s.texts[lang]}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}