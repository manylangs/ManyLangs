"use client";

import React, { forwardRef } from "react";

type Props = {
  src?: string;
};

const AudioPlayer = forwardRef<HTMLAudioElement, Props>(
  ({ src }, ref) => {
    if (!src) return null;

    return (
      <audio
        ref={ref}
        controls
        style={{ width: "100%" }}
      >
        <source src={src} />
      </audio>
    );
  }
);

AudioPlayer.displayName = "AudioPlayer";
export default AudioPlayer;
