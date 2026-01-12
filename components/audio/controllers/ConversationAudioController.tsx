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

  const audioSrc = `/audio/conversation/${lang}/${level}/conversation_${level}_${chapter}.wav`;
  const cuesSrc  = `/audio/conversation/${lang}/${level}/conversation_${level}_${chapter}.cues.json`;

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
     오디오 완전 리셋
     ========================= */
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    el.pause();
    el.currentTime = 0;
    el.load();
  }, [audioSrc]);

  /* =========================
     정확한 set 이동
     ========================= */
  const seekTo = (nextIndex: number) => {
    const el = audioRef.current;
    if (!el) return;
    if (nextIndex < 0 || nextIndex >= cues.length) return;

    el.currentTime = cues[nextIndex] / 1000;
    el.play().catch(() => {});
    setIndex(nextIndex);
  };

  return (
    <section>
      <AudioPlayer
        key={audioSrc}
        ref={audioRef}
        src={audioSrc}
        title="Conversation Audio"
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginTop: 8,
        }}
      >
        {/* ◀ 이전 */}
        <button
          disabled={!ready || index === 0}
          onClick={() => seekTo(index - 1)}
        >
          ◀ Previous Dialogue
        </button>

        {/* 📊 현재 / 전체 */}
        {ready && cues.length > 0 && (
          <div style={{ fontWeight: 600 }}>
            Dialogue {index + 1} / {cues.length}
          </div>
        )}

        {/* ▶ 다음 */}
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
