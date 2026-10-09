"use client";

import { useEffect, useMemo, useRef } from "react";

/**
 * Plays one participant's audio. Audio has its own element, separate from the video tile, so a
 * person with their camera off (no video frames at all) is still heard, and a person who is both
 * in a tile and on the screen-share stage is not heard twice.
 */
export function RemoteAudio({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLAudioElement>(null);
  const audioOnly = useMemo(() => (stream ? new MediaStream(stream.getAudioTracks()) : null), [stream]);

  useEffect(() => {
    if (ref.current) ref.current.srcObject = audioOnly;
  }, [audioOnly]);

  return <audio ref={ref} autoPlay />;
}
