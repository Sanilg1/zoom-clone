"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface LocalMedia {
  /** Mic + camera tracks currently open (a new object whenever a track is added or removed). */
  stream: MediaStream | null;
  /** The live camera track, or null while video is off. */
  videoTrack: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
  devices: { microphones: MediaDeviceInfo[]; cameras: MediaDeviceInfo[] };
  microphoneId: string | undefined;
  cameraId: string | undefined;
  switchMicrophone: (deviceId: string) => Promise<void>;
  switchCamera: (deviceId: string) => Promise<void>;
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
  const [devices, setDevices] = useState<LocalMedia["devices"]>({ microphones: [], cameras: [] });
  // Camera chosen in settings while video was off; used the next time video starts.
  const [preferredCameraId, setPreferredCameraId] = useState<string | null>(null);

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

  // Device names are only visible after permission is granted, so list them after opening.
  const refreshDevices = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices({
        microphones: list.filter((d) => d.kind === "audioinput" && d.deviceId),
        cameras: list.filter((d) => d.kind === "videoinput" && d.deviceId),
      });
    } catch {
      // keep the previous list
    }
  }, []);

  useEffect(() => {
    if (!enabled || !navigator.mediaDevices) return;
    navigator.mediaDevices.addEventListener("devicechange", refreshDevices);
    return () => navigator.mediaDevices.removeEventListener("devicechange", refreshDevices);
  }, [enabled, refreshDevices]);

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
        void refreshDevices();
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
  }, [enabled, adoptVideo, onTrackEnded, refreshDevices]);

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
        const camera = preferredCameraId;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: camera ? { ...VIDEO_CONSTRAINTS, deviceId: { exact: camera } } : VIDEO_CONSTRAINTS,
        });
        adoptVideo(stream.getVideoTracks()[0]);
        setWarning(null);
      } catch {
        setWarning("Your camera could not be started. Check that no other app is using it.");
      } finally {
        setStartingVideo(false);
      }
    },
    [adoptVideo, startingVideo, preferredCameraId],
  );

  const switchMicrophone = useCallback(
    async (deviceId: string) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId } } });
        const track = stream.getAudioTracks()[0];
        audioRef.current?.stop();
        audioRef.current = track;
        track.addEventListener("ended", onTrackEnded);
        setAudioTrack(track); // the mute effect below applies the current mute state to it
        setWarning(null);
      } catch {
        setWarning("That microphone could not be started.");
      }
    },
    [onTrackEnded],
  );

  const switchCamera = useCallback(
    async (deviceId: string) => {
      setPreferredCameraId(deviceId);
      const current = videoRef.current;
      if (!current) return; // video is off: used next time it starts
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { ...VIDEO_CONSTRAINTS, deviceId: { exact: deviceId } },
        });
        adoptVideo(stream.getVideoTracks()[0]);
        current.stop();
        setWarning(null);
      } catch {
        setWarning("That camera could not be started. Check that no other app is using it.");
      }
    },
    [adoptVideo],
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
    audioTrack,
    devices,
    microphoneId: audioTrack?.getSettings().deviceId,
    cameraId: videoTrack?.getSettings().deviceId ?? preferredCameraId ?? undefined,
    switchMicrophone,
    switchCamera,
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
