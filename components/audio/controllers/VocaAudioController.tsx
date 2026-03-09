"use client";

import { useEffect, useRef, useState } from "react";
import AudioPlayer from "@/components/audio/AudioPlayer";

type Props = {
  src: string;
  cuesSrc?: string;
};

export default function VocaAudioController({ src, cuesSrc }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [cues, setCues] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCues() {
      if (!cuesSrc) {
        setCues([]);
        setReady(false);
        return;
      }

      setReady(false);
      setIndex(0);

      try {
        const res = await fetch(cuesSrc);
        const json = await res.json();

        if (!cancelled) {
          const list = Array.isArray(json.setStartMs)
            ? json.setStartMs
            : Array.isArray(json.sets)
            ? json.sets.map((s: any) => s.start_ms)
            : [];

          setCues(list);
          setReady(true);
        }
      } catch {
        if (!cancelled) {
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
  }, [src]);

  const seekTo = (next: number) => {
    const el = audioRef.current;
    if (!el) return;

    if (next < 0 || next >= cues.length) return;

    el.currentTime = cues[next] / 1000;
    el.play().catch(() => {});
    setIndex(next);
  };

  if (!src) return null;

  return (
    <section
      style={{
        position: "sticky",
        top: 100,
        zIndex: 900,
        background: "#fff",
        paddingTop: 8,
        paddingBottom: 8,
        borderBottom: "1px solid #eee",
      }}
    >
      <AudioPlayer ref={audioRef} src={src} />

      {cues.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 12,
          }}
        >
          <button
            disabled={!ready || index === 0}
            onClick={() => seekTo(index - 1)}
          >
            ◀ Prev
          </button>

          <div>
            {index + 1} / {cues.length}
          </div>

          <button
            disabled={!ready || index >= cues.length - 1}
            onClick={() => seekTo(index + 1)}
          >
            Next ▶
          </button>
        </div>
      )}
    </section>
  );
}