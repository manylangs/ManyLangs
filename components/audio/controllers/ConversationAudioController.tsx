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

  /* =========================
     ✅ Idiom과 동일한 규칙
     (경로만 conversation)
     ========================= */
  const audioSrc = `/audio/${lang}/conversation/${level}/conversation_${level}_${chapter}.wav`;
  const cuesSrc  = `/audio/${lang}/conversation/${level}/conversation_${level}_${chapter}.cues.json`;

  /* =========================
     cues.json 로드
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

  /* =========================
     오디오 완전 리셋
     (Idiom과 완전 동일)
     ========================= */
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    el.pause();
    el.currentTime = 0;
    el.load();
  }, [audioSrc]);

  /* =========================
     정확한 세트 이동
     ========================= */
  const seekTo = (next: number) => {
    const el = audioRef.current;
    if (!el) return;
    if (next < 0 || next >= cues.length) return;

    el.currentTime = cues[next] / 1000;
    el.play().catch(() => {});
    setIndex(next);
  };

  return (
    <section>
      {/* 🔊 AudioPlayer — Idiom과 100% 동일 */}
      <AudioPlayer
        key={audioSrc}
        ref={audioRef}
        src={audioSrc}
      />

      {/* ▶ 컨트롤 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginTop: 8,
        }}
      >
        {/* 이전 */}
        <button
          disabled={!ready || index === 0}
          onClick={() => seekTo(index - 1)}
        >
          ◀ Previous Dialogue
        </button>

        {/* 현재 / 전체 */}
        {ready && cues.length > 0 && (
          <div style={{ fontWeight: 600 }}>
            Dialogue {index + 1} / {cues.length}
          </div>
        )}

        {/* 다음 */}
        <button
          disabled={!ready || index >= cues.length - 1}
          onClick={() => seekTo(index + 1)}
        >
          Next Dialogue ▶
        </button>
      </div>
    </section>
  );
}
