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

  const bucket = "manylangs-55fd3.firebasestorage.app";

  const audioPath =
    `content/conversation/${lang}/${level}/${chapter}/audio/conversation_${level}_${chapter}.wav`;

  const cuesPath =
    `content/conversation/${lang}/${level}/${chapter}/audio/conversation_${level}_${chapter}.cues.json`;

  const audioSrc =
    `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(audioPath)}?alt=media`;

  const cuesSrc =
    `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(cuesPath)}?alt=media`;

  /* cues load */
  useEffect(() => {

    let cancelled = false;

    async function loadCues() {

      setReady(false);
      setIndex(0);

      try {

        const res = await fetch(cuesSrc, { cache: "no-store" });

        if (!res.ok) {
          console.error("cue load failed:", cuesSrc);
          return;
        }

        const json = await res.json();

        if (!cancelled) {

          const list =
            json.setStartMs ??
            json.sets?.map((s: any) => s.start_ms) ??
            json.start_ms ??
            [];

          setCues(list);

          setCues(list);
          setReady(true);

        }

      } catch (e) {

        if (!cancelled) {
          console.error("cue parse error:", e);
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


  /* audio reset */
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
    el.play().catch(() => { });
    setIndex(next);

  };


  return (

    <section
      style={{
        position: "sticky",
        top: 64,
        zIndex: 900,
        background: "#fff",
        paddingTop: 8,
        paddingBottom: 8,
        borderBottom: "1px solid #eee",
      }}
    >

      <AudioPlayer
        ref={audioRef}
        key={audioSrc}
        src={audioSrc}
      />

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