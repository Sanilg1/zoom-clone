"use client";

import { useEffect, useState } from "react";

export interface LocalMedia {
  stream: MediaStream | null;
  audioOn: boolean;
  videoOn: boolean;
  hasAudio: boolean;
  hasVideo: boolean;
  /** Neither device could be opened (nothing to show or send). */
  error: string | null;
  /** Only one device works, or a device stopped while in use (e.g. camera unplugged). */
  warning: string | null;
  setAudioOn: (on: boolean) => void;
  setVideoOn: (on: boolean) => void;
}

async function acquireStream(): Promise<{ stream: MediaStream; warning: string | null }> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera and microphone need a secure (https) connection.");
  }
  // Try both devices first, then fall back to whichever one is available.
  const attempts: { constraints: MediaStreamConstraints; warning: string | null }[] = [
    { constraints: { audio: true, video: { width: { ideal: 1280 }, height: { ideal: 720 } } }, warning: null },
    { constraints: { audio: true }, warning: "Your camera could not be started. You can still join with audio." },
    { constraints: { video: true }, warning: "Your microphone could not be started. You can still join with video." },
  ];
  for (const { constraints, warning } of attempts) {
    try {
      return { stream: await navigator.mediaDevices.getUserMedia(constraints), warning };
    } catch {
      // try the next option
    }
  }
  throw new Error("Zoom can't access your camera or microphone. Check your browser permissions.");
}

const hasLiveTrack = (stream: MediaStream | null, kind: "audio" | "video") =>
  stream?.getTracks().some((track) => track.kind === kind && track.readyState === "live") ?? false;

/**
 * The user's camera and microphone. Muting and stopping video only disable the tracks, so they
 * can be turned back on instantly without asking for permission again.
 * When `enabled` becomes false the devices are released (camera light turns off).
 */
export function useLocalMedia(enabled: boolean, initial: { audio: boolean; video: boolean }): LocalMedia {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [audioOn, setAudioOn] = useState(initial.audio);
  const [videoOn, setVideoOn] = useState(initial.video);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let acquired: MediaStream | null = null;

    acquireStream()
      .then((result) => {
        if (cancelled) {
          result.stream.getTracks().forEach((track) => track.stop());
          return;
        }
        acquired = result.stream;
        setStream(result.stream);
        setWarning(result.warning);
        setError(null);
      })
      .catch((err: Error) => !cancelled && setError(err.message));

    return () => {
      cancelled = true;
      acquired?.getTracks().forEach((track) => track.stop());
      setStream(null);
    };
  }, [enabled]);

  // A device can stop on its own (unplugged, taken by another app, permission revoked).
  // Our own track.stop() calls do not fire "ended", so this only catches those cases.
  useEffect(() => {
    if (!stream) return;
    const onEnded = (event: Event) => {
      const kind = (event.target as MediaStreamTrack).kind;
      setWarning(kind === "video" ? "Your camera stopped working." : "Your microphone stopped working.");
    };
    const tracks = stream.getTracks();
    tracks.forEach((track) => track.addEventListener("ended", onEnded));
    return () => tracks.forEach((track) => track.removeEventListener("ended", onEnded));
  }, [stream]);

  // Recomputed on every render; the "ended" handler above triggers one when a device stops.
  const hasAudio = hasLiveTrack(stream, "audio");
  const hasVideo = hasLiveTrack(stream, "video");
  const effectiveAudioOn = audioOn && hasAudio;
  const effectiveVideoOn = videoOn && hasVideo;

  useEffect(() => {
    stream?.getAudioTracks().forEach((track) => (track.enabled = effectiveAudioOn));
    stream?.getVideoTracks().forEach((track) => (track.enabled = effectiveVideoOn));
  }, [stream, effectiveAudioOn, effectiveVideoOn]);

  return {
    stream,
    audioOn: effectiveAudioOn,
    videoOn: effectiveVideoOn,
    hasAudio,
    hasVideo,
    error,
    warning,
    setAudioOn,
    setVideoOn,
  };
}
