"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  lang: string;
  level: string;
  chapter: string;
  dialogueCount?: number;
};

export default function ConversationAudioController({
  lang,
  level,
  chapter,
  dialogueCount,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [cues, setCues] = useState<number[]>([]);
  const [index, setIndex] = useState(0);

  // ✅ conversation 파일명: conversation_001.wav / conversation_001.cues.json
  const audioSrc = `/audio/conversation/${lang}/${level}/conversation_${chapter}.wav`;
  const cuesSrc = `/audio/conversation/${lang}/${level}/conversation_${chapter}.cues.json`;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIndex(0);
      try {
        const res = await fetch(cuesSrc);
        const json = await res.json();

        // ✅ 가능한 모든 키 대응
        const list =
          json.cues ||
          json.setStartMs ||
          json.startsMs ||
          json.startMs ||
          json.times ||
          [];

        if (!cancelled) setCues(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setCues([]);
      }
    })();

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

  const total = (typeof dialogueCount === "number" && dialogueCount > 0)
    ? dialogueCount
    : cues.length;

  const seekTo = (nextIndex: number) => {
    const el = audioRef.current;
    if (!el) return;

    // cues가 없으면 이동 불가
    if (!cues.length) return;
    if (nextIndex < 0 || nextIndex >= cues.length) return;

    el.currentTime = cues[nextIndex] / 1000;
    el.play().catch(() => {});
    setIndex(nextIndex);
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
        <button disabled={index === 0 || !cues.length} onClick={() => seekTo(index - 1)}>
          ◀
        </button>

        <span style={{ fontWeight: 600 }}>
          {index + 1} / {total || "—"}
        </span>

        <button
          disabled={!cues.length || index >= cues.length - 1}
          onClick={() => seekTo(index + 1)}
        >
          ▶
        </button>
      </div>
    </section>
  );
}
