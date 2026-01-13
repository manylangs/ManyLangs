"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  lang: string;
  level: string;
  chapter: string;
};

export default function IdiomAudioController({ lang, level, chapter }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevAudioSrc = useRef<string | null>(null);

  const [cues, setCues] = useState<number[]>([]);
  const [index, setIndex] = useState(0);

  const base = `idiom_${level}_${chapter}`;
  const audioSrc = `/audio/${lang}/idiom/${level}/${base}.wav`;
  const cuesSrc = `/audio/${lang}/idiom/${level}/${base}.cues.json`;

  /* cues.json 로드 (Idiom 전용, 세트 기준) */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(cuesSrc);
        const text = await res.text();

        if (text.trim().startsWith("<")) {
          throw new Error("Idiom cues not found");
        }

        const json = JSON.parse(text);

        let list: number[] = [];

        // ✅ Idiom 실제 패턴 대응
        if (Array.isArray(json.setStartMs)) {
          list = json.setStartMs;
        } else if (
          json.setStartMs &&
          typeof json.setStartMs === "object"
        ) {
          list = Object.values(json.setStartMs);
        } else if (Array.isArray(json.sets)) {
          // 🔥 핵심 추가
          list = json.sets
            .map((s: any) => s.setStartMs)
            .filter((v: any) => typeof v === "number");
        }

        if (!cancelled) {
          setCues(list);
          setIndex(0);
        }
      } catch (e) {
        console.error("❌ Idiom cues load failed:", cuesSrc, e);
        if (!cancelled) setCues([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cuesSrc]);

  /* 파일 변경 시에만 reset */
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    if (prevAudioSrc.current !== audioSrc) {
      el.pause();
      el.currentTime = 0;
      el.load();
      prevAudioSrc.current = audioSrc;
    }
  }, [audioSrc]);

  const total = cues.length;

  const seekTo = (next: number) => {
    const el = audioRef.current;
    if (!el) return;
    if (!total) return;
    if (next < 0 || next >= total) return;

    el.currentTime = cues[next] / 1000;
    el.play().catch(() => {});
    setIndex(next);
  };

  return (
    <section style={{ marginTop: 12 }}>
      <audio
        ref={audioRef}
        src={audioSrc}
        controls
        style={{ width: "100%", marginBottom: 8 }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          disabled={index === 0 || !total}
          onClick={() => seekTo(index - 1)}
        >
          ◀
        </button>

        <span style={{ fontWeight: 600 }}>
          {total ? `${index + 1} / ${total}` : "- / -"}
        </span>

        <button
          disabled={!total || index >= total - 1}
          onClick={() => seekTo(index + 1)}
        >
          ▶
        </button>
      </div>
    </section>
  );
}
