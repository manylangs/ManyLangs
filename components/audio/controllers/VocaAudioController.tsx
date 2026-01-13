"use client";

import { useEffect, useRef, useState } from "react";
import AudioPlayer from "@/components/audio/AudioPlayer";

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

  const [cues, setCues] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);

  // 🔁 Idiom → voca 경로만 변경
  const audioSrc = `/audio/${lang}/voca/${level}/voca_${level}_${chapter}.wav`;
  const cuesSrc = `/audio/${lang}/voca/${level}/voca_${level}_${chapter}.cues.json`;

  /* =========================
     cues.json 로드 (세트 전용)
     ========================= */
  useEffect(() => {
    let cancelled = false;

    async function loadCues() {
      setReady(false);
      setIndex(0);

      try {
        const res = await fetch(cuesSrc);
        const json = await res.json();
        if (!cancelled) {
          // Idiom과 동일한 필드명 사용
          setCues(
            Array.isArray(json.setStartMs)
              ? json.setStartMs
              : Array.isArray(json.sets)
                ? json.sets.map((s: any) => s.start_ms)
                : []
          );

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

  /* =========================
     오디오 리셋
     ========================= */
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    el.pause();
    el.currentTime = 0;
    el.load();
  }, [audioSrc]);

  /* =========================
     세트 이동
     ========================= */
  const seekTo = (next: number) => {
    const el = audioRef.current;
    if (!el) return;
    if (next < 0 || next >= cues.length) return;

    el.currentTime = cues[next] / 1000;
    el.play().catch(() => { });
    setIndex(next);
  };

  return (
    <section>
      {/* 🔊 오디오 플레이어 (Idiom과 동일) */}
      <AudioPlayer
        key={audioSrc}
        ref={audioRef}
        src={audioSrc}
      />

      {/* 🎛 컨트롤 UI (Idiom과 100% 동일) */}
      <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
        <button
          disabled={!ready || index === 0}
          onClick={() => seekTo(index - 1)}
        >
          ◀ Previous Set
        </button>

        {ready && cues.length > 0 && (
          <div style={{ fontWeight: 600 }}>
            Set {index + 1} / {cues.length}
          </div>
        )}

        <button
          disabled={!ready || index >= cues.length - 1}
          onClick={() => seekTo(index + 1)}
        >
          Next Set ▶
        </button>
      </div>
    </section>
  );
}
