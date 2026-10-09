"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** A single message shown for a few seconds, e.g. "The host has muted you". */
export function useToast(durationMs = 3000) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback(
    (text: string) => {
      setMessage(text);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setMessage(null), durationMs);
    },
    [durationMs],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  return [message, show] as const;
}
