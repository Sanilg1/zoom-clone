"use client";

import { useEffect, useState } from "react";

/**
 * The current time, refreshed every `intervalMs`. Starts as null so the server render and the
 * first client render match (the server's clock and time zone differ from the browser's).
 */
export function useNow(intervalMs = 1000): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [intervalMs]);

  return now;
}
