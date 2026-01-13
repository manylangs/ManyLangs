"use client";

import { useEffect, useRef, useState } from "react";

type Cue = {
  set: number;
  start_ms: number;
};

type Props = {
  lang: string;
  level: string;
  chapter: string;
};

export default function VocaAudioController({
  lang,
  level,
  chapter,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [cues, setCues] = useState<Cue[]>([]);
  const [currentSet, setCurrentSet] = useState(0);

  const audioSrc = `/audio/${lang}/voca/${level}/voca_${level}_${chapter}.wav`;
  const cueSrc = `/audio/${lang}/voca/${level}/voca_${level}_${chapter}.cues.json`;

  useEffect(() => {
    fetch(cueSrc)
      .then((r) => r.json())
      .then((json) => setCues(json.sets ?? []))
      .catch(() => setCues([]));
  }, [cueSrc]);

  const playSet = (index: number) => {
    if (!audioRef.current) return;
    const cue = cues[index];
    if (!cue) return;

    audioRef.current.currentTime = cue.start_ms / 1000;
    audioRef.current.play();
    setCurrentSet(index);
  };

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "#fff",
        borderBottom: "1px solid #eee",
        padding: "12px 24px",
      }}
    >
      <audio ref={audioRef} src={audioSrc} />

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={() => playSet(currentSet - 1)} disabled={currentSet <= 0}>
          ◀ Prev
        </button>

        <button onClick={() => playSet(currentSet)}>▶ Play</button>

        <button
          onClick={() => playSet(currentSet + 1)}
          disabled={currentSet >= cues.length - 1}
        >
          Next ▶
        </button>

        <span>
          Set {currentSet + 1} / {cues.length}
        </span>
      </div>
    </div>
  );
}
