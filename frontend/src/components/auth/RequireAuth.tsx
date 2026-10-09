"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "./AuthProvider";

/** Renders its children only for a signed-in user; otherwise sends them to the sign-in page. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "signed-out") router.replace(`/signin?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);

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

  return (
    <div className="flex min-h-dvh items-center justify-center text-ink-muted">
      <Spinner size={28} />
    </div>
  );
}

/** Only allow redirects to paths inside this app (never to another site). */
export function safeNextPath(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
