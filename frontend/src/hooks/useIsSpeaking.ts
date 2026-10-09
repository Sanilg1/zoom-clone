"use client";

import { useEffect, useState } from "react";

const LEVEL_THRESHOLD = 0.04; // RMS of the waveform, 0..1
const POLL_MS = 200;

let sharedContext: AudioContext | null = null;

/** True while the stream's audio is loud enough to count as talking (for the speaker highlight). */
export function useIsSpeaking(stream: MediaStream | null, enabled: boolean): boolean {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    const track = stream?.getAudioTracks()[0];
    if (!enabled || !track || typeof AudioContext === "undefined") return;

    sharedContext ??= new AudioContext();
    const context = sharedContext;
    void context.resume();

    const source = context.createMediaStreamSource(new MediaStream([track]));
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);

    const timer = setInterval(() => {
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const sample of samples) {
        const centered = (sample - 128) / 128;
        sum += centered * centered;
      }
      setSpeaking(Math.sqrt(sum / samples.length) > LEVEL_THRESHOLD);
    }, POLL_MS);

    return () => {
      clearInterval(timer);
      source.disconnect();
    };
  }, [stream, enabled]);

  return enabled && speaking;
}
