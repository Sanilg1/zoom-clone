"use client";

import { useEffect, useState } from "react";

const POLL_MS = 100;
// RMS of normal speech is roughly 0.02-0.2; scale it so speaking fills most of the mic icon.
const GAIN = 5;
/** Level above which someone counts as speaking (drives the green tile border). */
export const SPEAKING_LEVEL = 0.2;

let sharedContext: AudioContext | null = null;

/**
 * Current loudness of the stream's audio, 0 (silent) to 1 (loud), updated 10 times a second.
 * Used for the mic level animation and the active-speaker highlight.
 */
export function useAudioLevel(stream: MediaStream | null, enabled: boolean): number {
  const [level, setLevel] = useState(0);

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
      const rms = Math.sqrt(sum / samples.length);
      // Round so React skips re-renders while the level is steady.
      setLevel(Math.min(1, Math.round(rms * GAIN * 10) / 10));
    }, POLL_MS);

    return () => {
      clearInterval(timer);
      source.disconnect();
    };
  }, [stream, enabled]);

  return enabled ? level : 0;
}
