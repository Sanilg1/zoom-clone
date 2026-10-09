"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface LocalMedia {
  /** Mic + camera tracks currently open (a new object whenever a track is added or removed). */
  stream: MediaStream | null;
  /** The live camera track, or null while video is off. */
  videoTrack: MediaStreamTrack | null;
  audioOn: boolean;
  videoOn: boolean;
  hasAudio: boolean;
  /** A camera exists and is not busy starting, so the video button can be used. */
  canUseVideo: boolean;
  /** The first permission request has finished (with or without devices). */
  ready: boolean;
  /** Neither device could be opened (nothing to show or send). */
  error: string | null;
  /** Only one device works, or a device stopped while in use (e.g. camera unplugged). */
  warning: string | null;
  setAudioOn: (on: boolean) => void;
  setVideoOn: (on: boolean) => Promise<void>;
}

const VIDEO_CONSTRAINTS: MediaTrackConstraints = { width: { ideal: 1280 }, height: { ideal: 720 } };

async function hasCamera(): Promise<boolean> {
  try {
    return (await navigator.mediaDevices.enumerateDevices()).some((d) => d.kind === "videoinput");
  } catch {
    return false;
  }
}

interface Acquired {
  audio: MediaStreamTrack | null;
  video: MediaStreamTrack | null;
  cameraAvailable: boolean;
  warning: string | null;
}

/** Opens the mic, and the camera too if `withVideo`, falling back to whichever device works. */
async function acquire(withVideo: boolean): Promise<Acquired> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera and microphone need a secure (https) connection.");
  }
  const attempts: { constraints: MediaStreamConstraints; warning: string | null }[] = withVideo
    ? [
        { constraints: { audio: true, video: VIDEO_CONSTRAINTS }, warning: null },
        { constraints: { audio: true }, warning: "Your camera could not be started. You can still join with audio." },
        { constraints: { video: VIDEO_CONSTRAINTS }, warning: "Your microphone could not be started. You can still join with video." },
      ]
    : [{ constraints: { audio: true }, warning: null }];

  for (const { constraints, warning } of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const video = stream.getVideoTracks()[0] ?? null;
      return {
        audio: stream.getAudioTracks()[0] ?? null,
        video,
        cameraAvailable: video !== null || (await hasCamera()),
        warning,
      };
    } catch {
      // try the next option
    }
  }
  // Joining with video off and no usable mic: the camera may still be turned on later.
  if (!withVideo && (await hasCamera())) {
    return { audio: null, video: null, cameraAvailable: true, warning: "Your microphone could not be started." };
  }
  throw new Error("Zoom can't access your camera or microphone. Check your browser permissions.");
}

/**
 * The user's microphone and camera.
 * - Mute only disables the mic track, so unmuting is instant.
 * - Stop Video stops the camera track, which releases the camera (its light turns off);
 *   Start Video asks for the camera again.
 * When `enabled` becomes false both devices are released.
 */
export function useLocalMedia(enabled: boolean, initial: { audio: boolean; video: boolean }): LocalMedia {
  const [audioTrack, setAudioTrack] = useState<MediaStreamTrack | null>(null);
  const [videoTrack, setVideoTrack] = useState<MediaStreamTrack | null>(null);
  const [cameraAvailable, setCameraAvailable] = useState(false);
  const [startingVideo, setStartingVideo] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [audioOn, setAudioOn] = useState(initial.audio);
  const [, setDeviceChange] = useState(0); // bumped when a device stops, to re-render

  // Latest tracks, so cleanup and the "ended" handler can reach them without re-running effects.
  const videoRef = useRef<MediaStreamTrack | null>(null);
  const audioRef = useRef<MediaStreamTrack | null>(null);
  const initialVideo = useRef(initial.video);

  const onTrackEnded = useCallback((event: Event) => {
    const track = event.target as MediaStreamTrack;
    if (track.kind === "video") {
      setWarning("Your camera stopped working.");
      if (videoRef.current === track) {
        videoRef.current = null;
        setVideoTrack(null);
      }
    } else {
      setWarning("Your microphone stopped working.");
      setDeviceChange((n) => n + 1);
    }
  }, []);

  const adoptVideo = useCallback(
    (track: MediaStreamTrack | null) => {
      videoRef.current = track;
      track?.addEventListener("ended", onTrackEnded);
      setVideoTrack(track);
    },
    [onTrackEnded],
  );

  // Open the devices when enabled; release everything when disabled or unmounted.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    acquire(initialVideo.current)
      .then((result) => {
        if (cancelled) {
          result.audio?.stop();
          result.video?.stop();
          return;
        }
        audioRef.current = result.audio;
        result.audio?.addEventListener("ended", onTrackEnded);
        setAudioTrack(result.audio);
        adoptVideo(result.video);
        setCameraAvailable(result.cameraAvailable);
        setWarning(result.warning);
        setError(null);
        setReady(true);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setReady(true);
      });

    return () => {
      cancelled = true;
      audioRef.current?.stop();
      videoRef.current?.stop();
      audioRef.current = null;
      videoRef.current = null;
      setAudioTrack(null);
      setVideoTrack(null);
      setReady(false);
    };
  }, [enabled, adoptVideo, onTrackEnded]);

  const setVideoOn = useCallback(
    async (on: boolean) => {
      if (!on) {
        videoRef.current?.stop(); // releases the camera
        videoRef.current = null;
        setVideoTrack(null);
        return;
      }
      if (videoRef.current || startingVideo) return;
      setStartingVideo(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS });
        adoptVideo(stream.getVideoTracks()[0]);
        setWarning(null);
      } catch {
        setWarning("Your camera could not be started. Check that no other app is using it.");
      } finally {
        setStartingVideo(false);
      }
    },
    [adoptVideo, startingVideo],
  );

  const hasAudio = audioTrack?.readyState === "live";
  const effectiveAudioOn = audioOn && hasAudio;

  // Mute = disable the mic track (re-run when a new track arrives, too).
  useEffect(() => {
    if (audioRef.current) audioRef.current.enabled = effectiveAudioOn;
  }, [audioTrack, effectiveAudioOn]);

  const stream = useMemo(() => {
    const tracks = [audioTrack, videoTrack].filter((t): t is MediaStreamTrack => t !== null);
    return tracks.length ? new MediaStream(tracks) : null;
  }, [audioTrack, videoTrack]);

  return {
    stream,
    videoTrack,
    audioOn: effectiveAudioOn,
    videoOn: videoTrack !== null,
    hasAudio,
    canUseVideo: cameraAvailable && !startingVideo,
    ready,
    error,
    warning,
    setAudioOn,
    setVideoOn,
  };
}
