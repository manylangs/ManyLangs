"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import RealAudioController from "@/components/audio/controllers/RealAudioController";
import { useViewerTarget } from "../context/ViewerTargetContext";

/* ================= types ================= */

type StudyLang = "en" | "es" | "fr" | "pt";

type Sentence = Record<string, string>;

type RealData = {
  blocks?: {
    type: string;
    sentences?: {
      texts: Record<string, string>;
    }[];
  }[];
};
type Props = {
  targetLang: string
  level: string
  chapter: string
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

  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : "";

  const p = fetch(
    `${base}/api/content/signed-url?path=${encodeURIComponent(path)}`
  )
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

type LoadStatus = "idle" | "loading" | "ready" | "error";

export default function RealViewer({
  targetLang,
  level,
  chapter,
}: Props) {
  const [lang, setLang] = useState<StudyLang>("en");
  const { showTargetText } = useViewerTarget();

  const [audioUrl, setAudioUrl] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");

  const [status, setStatus] = useState<LoadStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [retryTick, setRetryTick] = useState(0);
  const [data, setData] = useState<RealData | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadOnce = async () => {
      setStatus("loading");
      setErrorMsg("");
      setAudioUrl("");
      setImageUrl("");

      const manifestRes = await fetch(
        `/api/content/manifest?series=real&lang=${targetLang}&level=${level}&chapter=${chapter}`,
        {
          signal: controller.signal,
          cache: "no-store",
        }
      );

      if (!manifestRes.ok) throw new Error("Manifest fetch failed");

      const manifest = await manifestRes.json();

      const audioAsset = manifest.assets?.find(
        (a: any) => a.kind === "audio"
      );
      const imageAsset = manifest.assets?.find(
        (a: any) => a.kind === "image"
      );

      if (audioAsset && !cancelled) {
        const signedAudio = await fetchSignedUrl(audioAsset.path);
        if (!cancelled) setAudioUrl(signedAudio);
      }

      if (imageAsset && !cancelled) {
        const signedImage = await fetchSignedUrl(imageAsset.path);
        if (!cancelled) setImageUrl(signedImage);
      }

      // 🔥 data.json 로딩
      if (manifest.dataPath && !cancelled) {
        const dataSigned = await fetchSignedUrl(manifest.dataPath);

        const dataRes = await fetch(dataSigned, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!dataRes.ok) throw new Error("Data fetch failed");

        const json = await dataRes.json();
        if (!cancelled) setData(json);
      }

      if (!cancelled) setStatus("ready");
    };

    loadOnce().catch((e: any) => {
      if (cancelled) return;
      setErrorMsg(e?.message ?? "콘텐츠 로딩 실패");
      setStatus("error");
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [targetLang, level, chapter, retryTick]);

  return (
    <>
      {/* 🔊 Audio */}
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
          {audioUrl ? <RealAudioController src={audioUrl} /> : null}
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
        {status === "loading" && <div>로딩 중…</div>}
        {status === "error" && (
          <div style={{ color: "red" }}>{errorMsg}</div>
        )}

        {/* 🌐 Language */}
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

        {/* Prev / Next */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <Link href={`/viewer/${targetLang}/real/${level}/${prev}`} style={buttonStyle(false)}>
            ← Prev
          </Link>
          <Link href={`/viewer/${targetLang}/real/${level}/${next}`} style={buttonStyle(false)}>
            Next →
          </Link>
        </div>

        {/* Chapters */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
          {chapters.map((c) => (
            <Link
              key={c}
              href={`/viewer/${targetLang}/real/${level}/${c}`}
              style={buttonStyle(c === chapter)}
            >
              {c}
            </Link>
          ))}
        </div>

        {/* Content */}
        <section style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 300px" }}>
            {imageUrl ? (
              <img src={imageUrl} alt="" style={{ width: "100%", borderRadius: 8 }} />
            ) : (
              <div style={{ width: "100%", height: 200, background: "#f3f3f3" }} />
            )}
          </div>

          {data?.blocks && (
            <div style={{ flex: "1 1 300px" }}>
              {data.blocks
                .filter((b) => b.type === "description")
                .flatMap((b) => b.sentences || [])
                .map((s, i) => (
                  <div key={i} style={{ marginBottom: 14 }}>
                    {showTargetText && <div>{s.texts[targetLang]}</div>}
                    <div style={{ color: "#444" }}>{s.texts[lang]}</div>
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
