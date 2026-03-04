"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import RealAudioController from "@/components/audio/controllers/RealAudioController";
import { useViewerTarget } from "../context/ViewerTargetContext";
import { useParams } from "next/navigation";

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

  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : "";

  const p = fetch(`${base}/api/content/signed-url?path=${encodeURIComponent(path)}`)
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

export default function RealViewer({ level, chapter, data }: Props) {
  const params = useParams();
  const currentLang = params?.lang as string;
  const [lang, setLang] = useState<StudyLang>("en");
  const { showTargetText } = useViewerTarget();

  const [audioUrl, setAudioUrl] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");

  // ✅ 실패 보호 상태
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const chapters = useMemo(
    () => Array.from({ length: 20 }, (_, i) => String(i + 1).padStart(3, "0")),
    []
  );

  const currentIndex = chapters.indexOf(chapter);
  const prev = currentIndex > 0 ? chapters[currentIndex - 1] : chapter;
  const next =
    currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : chapter;

  const descBlock = data.blocks.find(
    (b) => b.type === "description"
  ) as { type: "description"; sentences: Sentence[] } | undefined;

  // ✅ 수동 재시도 트리거
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadOnce = async () => {
      setStatus("loading");
      setErrorMsg("");
      setAudioUrl("");
      setImageUrl("");

      const manifestPath = `content/real/${currentLang}/${level}/${chapter}/manifest.json`;
      const manifestSignedUrl = await fetchSignedUrl(manifestPath);

      const manifestRes = await fetch(manifestSignedUrl, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!manifestRes.ok) throw new Error("Manifest fetch failed");

      const manifest = await manifestRes.json();

      const audioAsset = manifest.assets?.find((a: any) => a.kind === "audio");
      const imageAsset = manifest.assets?.find((a: any) => a.kind === "image");

      // audio
      if (audioAsset && !cancelled) {
        const audioPath = `content/real/${currentLang}/${level}/${chapter}/${audioAsset.path}`;
        const signedAudio = await fetchSignedUrl(audioPath);
        if (!cancelled) setAudioUrl(signedAudio);
      }

      // image
      if (imageAsset && !cancelled) {
        const imagePath = `content/real/${currentLang}/${level}/${chapter}/${imageAsset.path}`;
        const signedImage = await fetchSignedUrl(imagePath);
        if (!cancelled) setImageUrl(signedImage);
      }

      if (!cancelled) setStatus("ready");
    };

    const loadWithRetry = async () => {
      try {
        await loadOnce();
      } catch (e: any) {
        if (cancelled) return;
        // ✅ 1회 자동 재시도
        try {
          await new Promise((r) => setTimeout(r, 400));
          await loadOnce();
        } catch (e2: any) {
          if (cancelled) return;
          const msg =
            typeof e2?.message === "string"
              ? e2.message
              : "콘텐츠 로딩에 실패했습니다.";
          setErrorMsg(msg);
          setStatus("error");
          console.error("Signed URL load failed:", e2);
        }
      }
    };

    loadWithRetry();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [level, chapter, retryTick]);

  const LoadingBar = () => (
    <div
      style={{
        padding: "10px 12px",
        border: "1px solid #eee",
        borderRadius: 8,
        background: "#fafafa",
        color: "#444",
        fontSize: 14,
        marginBottom: 12,
      }}
    >
      로딩 중…
    </div>
  );

  const ErrorPanel = () => (
    <div
      style={{
        padding: "12px 12px",
        border: "1px solid #f2c5c5",
        borderRadius: 8,
        background: "#fff7f7",
        color: "#7a1f1f",
        fontSize: 14,
        marginBottom: 12,
      }}
    >
      <div style={{ marginBottom: 8 }}>
        콘텐츠를 불러오지 못했습니다. (네트워크/권한/서버 문제 가능)
      </div>
      <div style={{ color: "#8b3a3a", marginBottom: 10 }}>
        {errorMsg || "알 수 없는 오류"}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => setRetryTick((x) => x + 1)}
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          다시 시도
        </button>
        <Link
          href="/select-books"
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid #ddd",
            background: "#fff",
            color: "#333",
            textDecoration: "none",
          }}
        >
          라이브러리로
        </Link>
      </div>
    </div>
  );

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
          {/* ✅ 로딩/실패 보호: 오디오 컨트롤러는 url 있을 때만 */}
          {audioUrl ? <RealAudioController src={audioUrl} /> : null}
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
        {/* ✅ 로딩/에러 UI */}
        {status === "loading" && <LoadingBar />}
        {status === "error" && <ErrorPanel />}

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
            href={`/viewer/${currentLang}/real/${level}/${prev}`}
            style={buttonStyle(false)}
          >
            ← Prev
          </Link>

          <Link
            href={`/viewer/${currentLang}/real/${level}/${next}`}
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
              href={`/viewer/${currentLang}/real/${level}/${c}`}
              style={buttonStyle(c === chapter)}
            >
              {c}
            </Link>
          ))}
        </div>

        {/* 🖼 + 📝 콘텐츠 */}
        <section style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {/* ✅ 로딩 중엔 이미지가 비어도 레이아웃 흔들림 최소화 */}
          <div style={{ flex: "0 0 300px" }}>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt=""
                style={{ width: "100%", borderRadius: 8 }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: 200,
                  borderRadius: 8,
                  background: "#f3f3f3",
                }}
              />
            )}
          </div>

          {descBlock && (
            <div style={{ flex: "1 1 300px" }}>
              {descBlock.sentences.map((s, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  {showTargetText && <div>{s.texts.kr}</div>}
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