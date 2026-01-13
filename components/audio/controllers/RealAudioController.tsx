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
        top: 0,
        zIndex: 100,
        background: "#fff",
        padding: "8px 0",
        borderBottom: "1px solid #eee",
        marginBottom: 12,
      }}
    >
      <AudioPlayer key={src} src={src} />
    </div>
  );
}
