"use client";

import { useEffect, useRef, useState } from "react";
import AudioPlayer from "@/components/audio/AudioPlayer";

type Props = {
  lang: string;
  level: string;
  chapter: string;
};

export default function ConversationAudioController({
  lang,
  level,
  chapter,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [cues, setCues] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);

  const audioSrc = `/audio/${lang}/conversation/${level}/conversation_${level}_${chapter}.wav`;
  const cuesSrc = `/audio/${lang}/conversation/${level}/conversation_${level}_${chapter}.cues.json`;

  useEffect(() => {
    let cancelled = false;

    async function loadCues() {
      setReady(false);
      setIndex(0);

      try {
        const res = await fetch(cuesSrc);
        const json = await res.json();

        if (!cancelled) {
          setCues(json.setStartMs || []);
          setReady(true);
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Failed to load cues:", e);
          setCues([]);
          setReady(false);
        }
      }
    }

    loadCues();
    return () => {
      cancelled = true;
    };
  }, [cuesSrc]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    el.pause();
    el.currentTime = 0;
    el.load();
  }, [audioSrc]);

  const seekTo = (next: number) => {
    const el = audioRef.current;
    if (!el) return;
    if (next < 0 || next >= cues.length) return;

    el.currentTime = cues[next] / 1000;
    el.play().catch(() => {});
    setIndex(next);
  };

  return (
    <section
      style={{
        position: "sticky",
        top: 64,              // 🔥 헤더 높이에 맞게 (60~68 사이 조정 가능)
        zIndex: 900,
        background: "#fff",
        paddingTop: 8,
        paddingBottom: 8,
        borderBottom: "1px solid #eee",
      }}
    >
      <AudioPlayer
        key={audioSrc}
        ref={audioRef}
        src={audioSrc}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginTop: 12,
        }}
      >
        <button
          disabled={!ready || index === 0}
          onClick={() => seekTo(index - 1)}
          style={{
            padding: "10px 12px",
            minHeight: "44px",
            fontSize: 13,
            fontWeight: 500,
            borderRadius: 8,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          ◀ Prev
        </button>

        {ready && cues.length > 0 && (
          <div
            style={{
              fontWeight: 600,
              fontSize: 13,
              minHeight: "44px",
              display: "flex",
              alignItems: "center",
              whiteSpace: "nowrap",
            }}
          >
            {index + 1} / {cues.length}
          </div>
        )}

        <button
          disabled={!ready || index >= cues.length - 1}
          onClick={() => seekTo(index + 1)}
          style={{
            padding: "10px 12px",
            minHeight: "44px",
            fontSize: 13,
            fontWeight: 500,
            borderRadius: 8,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Next ▶
        </button>
      </div>
    </section>
  );
}