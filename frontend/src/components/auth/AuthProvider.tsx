"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { api, ApiError, setUnauthorizedHandler } from "@/lib/api";
import { authToken } from "@/lib/storage";
import type { AuthResponse, User } from "@/lib/types";

/** "error" = we have a token but the server could not be reached to check it. */
export type AuthStatus = "loading" | "signed-in" | "signed-out" | "error";

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Holds the signed-in user for the whole app. The session token lives in localStorage. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const clearSession = useCallback(() => {
    authToken.clear();
    setUser(null);
    setStatus("signed-out");
  }, []);

  const startSession = useCallback((response: AuthResponse) => {
    authToken.set(response.token);
    setUser(response.user);
    setStatus("signed-in");
  }, []);

  // On load: if we have a token, ask the server who it belongs to.
  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    const token = authToken.get();
    const check = token ? api.me() : Promise.reject(new ApiError("Not signed in", 401));
    check.then(
      (me) => {
        setUser(me);
        setStatus("signed-in");
      },
      (err) => {
        // A rejected token signs you out; a network problem keeps the token for a retry.
        if (err instanceof ApiError && err.status === 401) clearSession();
        else setStatus("error");
      },
    );
  }, [clearSession]);

  const signIn = useCallback(
    async (email: string, password: string) => startSession(await api.signIn({ email, password })),
    [startSession],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) =>
      startSession(await api.signUp({ name, email, password })),
    [startSession],
  );

  const signOut = useCallback(async () => {
    try {
      await api.signOut();
    } catch {
      // Already invalid on the server; clearing locally is enough.
    }
    clearSession();
  }, [clearSession]);

  return (
    <AuthContext.Provider value={{ user, status, signIn, signUp, signOut }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
