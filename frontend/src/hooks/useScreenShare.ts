"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Screen sharing: asks the browser for a screen or window and sends it as our video. When sharing
 * stops (our button or the browser's own "Stop sharing"), `screenStream` becomes null and the
 * meeting room switches the outgoing video back to the camera.
 */
export function useScreenShare(setOutgoingVideo: (track: MediaStreamTrack | null) => Promise<void>) {
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScreenStream(null);
  }, []);

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
