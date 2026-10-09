// Small wrappers around browser storage. Storage can throw (private mode, blocked cookies),
// so every access is guarded and the app keeps working without it.

const hostKeyName = (code: string) => `zoom.hostKey.${code}`;
const DISPLAY_NAME = "zoom.displayName";
const AUTH_TOKEN = "zoom.authToken";
const SIGNED_OUT = "zoom.signedOut";

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
  clear: (code: string) => safe(() => sessionStorage.removeItem(hostKeyName(code)), undefined),
};

export const rememberedName = {
  get: () => safe(() => localStorage.getItem(DISPLAY_NAME), null),
  set: (name: string) => safe(() => localStorage.setItem(DISPLAY_NAME, name), undefined),
};

/** Session token from sign-in. localStorage keeps you signed in across tabs and restarts. */
export const authToken = {
  get: () => safe(() => localStorage.getItem(AUTH_TOKEN), null),
  set: (token: string) => safe(() => localStorage.setItem(AUTH_TOKEN, token), undefined),
  clear: () => safe(() => localStorage.removeItem(AUTH_TOKEN), undefined),
};

/**
 * Set when the user clicks Sign out. Without it, protected pages sign in as the demo user
 * automatically (the brief assumes a logged-in user); with it, they show the sign-in page.
 */
export const signedOutFlag = {
  get: () => safe(() => localStorage.getItem(SIGNED_OUT) === "1", false),
  set: () => safe(() => localStorage.setItem(SIGNED_OUT, "1"), undefined),
  clear: () => safe(() => localStorage.removeItem(SIGNED_OUT), undefined),
};
