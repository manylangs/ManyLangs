"use client";

import { useEffect, useRef, useState } from "react";
import AudioPlayer from "@/components/audio/AudioPlayer";

type Props = {
  lang: string;
  level: string;
  chapter: string;
};

export default function IdiomAudioController({
  lang,
  level,
  chapter,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [audioSrc, setAudioSrc] = useState("");
  const [cuesSrc, setCuesSrc] = useState("");

  const [cues, setCues] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);

  /* storage path */

  const base =
    `content/idiom/${lang}/${level}/${chapter}/audio`;

  const file =
    `idiom_${level}_${chapter}`;

  const langAudio =
    `https://firebasestorage.googleapis.com/v0/b/manylangs-55fd3.firebasestorage.app/o/${encodeURIComponent(`${base}/${file}.wav`)}?alt=media`;

  const krAudio =
    `https://firebasestorage.googleapis.com/v0/b/manylangs-55fd3.firebasestorage.app/o/${encodeURIComponent(`content/idiom/kr/${level}/${chapter}/audio/${file}.wav`)}?alt=media`;

  const langCues =
    `https://firebasestorage.googleapis.com/v0/b/manylangs-55fd3.firebasestorage.app/o/${encodeURIComponent(`${base}/${file}.cues.json`)}?alt=media`;

  const krCues =
    `https://firebasestorage.googleapis.com/v0/b/manylangs-55fd3.firebasestorage.app/o/${encodeURIComponent(`content/idiom/kr/${level}/${chapter}/audio/${file}.cues.json`)}?alt=media`;

  /* audio 존재 여부 확인 */

  useEffect(() => {
    let cancelled = false;

    async function resolveAudio() {
      try {
        const res = await fetch(langCues);

        if (res.ok) {
          setAudioSrc(langAudio);
          setCuesSrc(langCues);
          return;
        }
      } catch {}

      if (!cancelled) {
        setAudioSrc(krAudio);
        setCuesSrc(krCues);
      }
    }

    resolveAudio();

    return () => {
      cancelled = true;
    };
  }, [langAudio]);

  /* cues load */

  useEffect(() => {
    if (!cuesSrc) return;

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

    const target = Math.max(0, cues[next] / 1000 - 0.07);

    el.pause();
    el.currentTime = target;

    requestAnimationFrame(() => {
      el.play().catch(() => {});
    });

    setIndex(next);
  };

  if (!audioSrc) return null;

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
      <AudioPlayer
        key={audioSrc}
        ref={audioRef}
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