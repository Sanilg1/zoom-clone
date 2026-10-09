"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { signedOutFlag } from "@/lib/storage";
import { useAuth } from "./AuthProvider";

const SLOW_SERVER_HINT_MS = 4000;

/**
 * Renders its children only for a signed-in user.
 * Someone without a session is signed in as the demo user automatically (the brief assumes a
 * logged-in default user). Only after an explicit Sign out does it show the sign-in page instead.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, signInDemo } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const autoSignInStarted = useRef(false);

  useEffect(() => {
    // Once signed in, allow another automatic sign-in later (e.g. after the session expires).
    if (status === "signed-in") autoSignInStarted.current = false;
    if (status !== "signed-out") return;
    const toSignIn = () => router.replace(`/signin?next=${encodeURIComponent(pathname)}`);
    if (signedOutFlag.get()) return toSignIn();
    if (autoSignInStarted.current) return;
    autoSignInStarted.current = true;
    signInDemo().catch(toSignIn);
  }, [status, signInDemo, router, pathname]);

  if (status === "signed-in") return children;

  if (status === "error") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="font-bold">Can&apos;t reach the server right now.</p>
        <p className="max-w-sm text-sm text-ink-muted">
          It may be waking up, which can take up to a minute. Check your connection and try again.
        </p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </div>
    );
  }

  return <LoadingScreen />;
}

/** Spinner that explains the wait if it takes long (the free server sleeps when idle). */
function LoadingScreen() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_SERVER_HINT_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center text-ink-muted">
      <Spinner size={28} />
      {slow && <p className="max-w-xs text-sm">Starting the server. This can take up to a minute after a quiet period.</p>}
    </div>
  );
}

/** Only allow redirects to paths inside this app (never to another site). */
export function safeNextPath(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
