"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Screen sharing: asks the browser for a screen/window, sends it in place of the camera, and
 * switches back to the camera when sharing stops (from our button or the browser's own one).
 */
export function useScreenShare(
  setOutgoingVideo: (track: MediaStreamTrack | null) => Promise<void>,
  cameraTrack: MediaStreamTrack | null,
) {
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    const display = streamRef.current;
    if (!display) return;
    display.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScreenStream(null);
    void setOutgoingVideo(cameraTrack);
  }, [setOutgoingVideo, cameraTrack]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("Screen sharing is not supported on this device");
    }
    const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const track = display.getVideoTracks()[0];
    track.addEventListener("ended", stop);
    streamRef.current = display;
    setScreenStream(display);
    await setOutgoingVideo(track);
  }, [setOutgoingVideo, stop]);

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  return { screenStream, start, stop };
}
