"use client";

import AudioPlayer from "@/components/audio/AudioPlayer";

type Props = {
  src: string;
};

export default function RealAudioController({ src }: Props) {
  return (
    <div
      style={{
        position: "sticky",
        top: 100,          // 🔥 헤더 기준 통일
        zIndex: 900,
        background: "#fff",
        paddingTop: 8,
        paddingBottom: 8,
        borderBottom: "1px solid #eee",
      }}
    >
      <AudioPlayer key={src} src={src} />
    </div>
  );
}