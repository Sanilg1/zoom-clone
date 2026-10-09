// Small wrappers around browser storage. Storage can throw (private mode, blocked cookies),
// so every access is guarded and the app keeps working without it.

const hostKeyName = (code: string) => `zoom.hostKey.${code}`;
const DISPLAY_NAME = "zoom.displayName";

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/**
 * The host key is kept per browser tab (sessionStorage), so the tab that started a meeting is
 * the host while a second tab opened from the invite link joins as a normal attendee.
 */
export const hostKeys = {
  get: (code: string) => safe(() => sessionStorage.getItem(hostKeyName(code)), null),
  set: (code: string, key: string) => safe(() => sessionStorage.setItem(hostKeyName(code), key), undefined),
};

export const rememberedName = {
  get: () => safe(() => localStorage.getItem(DISPLAY_NAME), null),
  set: (name: string) => safe(() => localStorage.setItem(DISPLAY_NAME, name), undefined),
};
