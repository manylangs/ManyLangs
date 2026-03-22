"use client";

import AudioPlayer from "@/components/audio/AudioPlayer";

type Props = {
  src: string;
};

export default function RealAudioController({ src }: Props) {
  const controllerHeight = 56;

  return (
    <div style={{ minHeight: controllerHeight, marginBottom: 12 }}>
      <div
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
        <AudioPlayer key={src} src={src} />
      </div>
    </div>
  );
}