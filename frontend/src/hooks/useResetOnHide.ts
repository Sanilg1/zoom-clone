"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Next.js (with cacheComponents) keeps visited pages mounted but hidden, using React's <Activity>,
 * so their state survives navigation. Effects still clean up when a page is hidden, so this runs
 * `reset` at that moment. Use it for transient UI (open dialogs, menus, "Joining…" spinners) that
 * should not still be showing when the user comes back.
 */
export function useResetOnHide(reset: () => void) {
  const resetRef = useRef(reset);
  useLayoutEffect(() => {
    resetRef.current = reset;
  });
  useLayoutEffect(() => () => resetRef.current(), []);
}
