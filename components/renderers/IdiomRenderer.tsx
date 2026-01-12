"use client";

import { useEffect, useRef, useState } from "react";

type CuesData = {
  setStartsMs?: number[];
};

type Props = {
  lang: string;    // "kr"
  level: string;   // "a1"
  chapter: string; // "001"
};

export default function IdiomAudioController({
  lang,
  level,
  chapter,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [cues, setCues] = useState<CuesData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // ✅ idiom 전용 경로 (확정)
  const audioSrc =
    `/audio/idiom/${lang}/${level}/idiom_${level}_${chapter}.wav`;

  const cuesSrc =
    `/audio/idiom/${lang}/${level}/idiom_${level}_${chapter}.cues.json`;

  /* cues.json 로드 + 구조 검증 */
  useEffect(() => {
    fetch(cuesSrc)
      .then((res) => {
        if (!res.ok) throw new Error("cues fetch failed");
        return res.json();
      })
      .then((data) => {
        if (data && Array.isArray(data.setStartsMs)) {
          setCues({ setStartsMs: data.setStartsMs });
        } else {
          setCues(null);
        }
      })
      .catch(() => setCues(null));
  }, [cuesSrc]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const reset = () => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current.play();
    setIsPlaying(true);
  };

  const jumpTo = (index: number) => {
    if (
      !audioRef.current ||
      !cues ||
      !Array.isArray(cues.setStartsMs)
    )
      return;

    const ms = cues.setStartsMs[index];
    if (typeof ms !== "number") return;

    audioRef.current.currentTime = ms / 1000;
    audioRef.current.play();
    setIsPlaying(true);
  };

  return (
    <div
      style={{
        padding: 12,
        border: "1px solid #ddd",
        borderRadius: 8,
      }}
    >
      <audio
        ref={audioRef}
        src={audioSrc}
        onEnded={() => setIsPlaying(false)}
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={togglePlay}>
          {isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>
        <button onClick={reset}>⟲ Reset</button>
      </div>

      {Array.isArray(cues?.setStartsMs) && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {cues!.setStartsMs!.map((_, idx) => (
            <button key={idx} onClick={() => jumpTo(idx)}>
              {idx + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
