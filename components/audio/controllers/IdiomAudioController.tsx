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

  /* audio path */
  const langAudio =
    `/audio/${lang}/idiom/${level}/idiom_${level}_${chapter}.wav`;

  const krAudio =
    `/audio/kr/idiom/${level}/idiom_${level}_${chapter}.wav`;

  const langCues =
    `/audio/${lang}/idiom/${level}/idiom_${level}_${chapter}.cues.json`;

  const krCues =
    `/audio/kr/idiom/${level}/idiom_${level}_${chapter}.cues.json`;

  /* 🔥 audio 존재 여부 확인 */
  useEffect(() => {

    let cancelled = false;

    async function resolveAudio() {

      try {

        const res = await fetch(langAudio, { method: "HEAD" });

        if (!cancelled && res.ok) {

          setAudioSrc(langAudio);
          setCuesSrc(langCues);

          return;

        }

      } catch {}

      /* fallback → KR */

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

    el.currentTime = cues[next] / 1000;

    el.play().catch(() => {});

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