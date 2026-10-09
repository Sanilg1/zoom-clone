"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";

import { AuthField, AuthLayout, OrDivider, PasswordField } from "@/components/auth/AuthLayout";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeNextPath } from "@/components/auth/RequireAuth";
import { Button } from "@/components/ui/Button";
import { useResetOnHide } from "@/hooks/useResetOnHide";
import { DEMO_ACCOUNT } from "@/lib/config";

export default function SignInPage() {
  return (
    <AuthLayout title="Sign in" switchPrompt="New to Zoom?" switchLabel="Sign up free" switchHref="/signup">
      <Suspense>
        <SignInForm />
      </Suspense>
    </AuthLayout>
  );
}

function SignInForm() {
  const { signIn, status } = useAuth();
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Leaving this page (signed in or not) should not keep the password or a stale error.
  useResetOnHide(() => {
    setPassword("");
    setError(null);
    setBusy(false);
  });

  // Already signed in (e.g. opened /signin directly): go straight on.
  useEffect(() => {
    if (status === "signed-in") router.replace(next);
  }, [status, router, next]);

  async function submit(emailValue: string, passwordValue: string) {
    setBusy(true);
    setError(null);
    try {
      await signIn(emailValue, passwordValue);
      router.replace(next);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password) return setError("Enter your email and password");
    void submit(email, password);
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthField
          id="signin-email"
          label="Email address"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
        />
        <PasswordField
          id="signin-password"
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-zoom-red">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy} className="h-11 text-[15px]">
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <OrDivider />

      <Button
        variant="secondary"
        disabled={busy}
        className="h-11"
        onClick={() => {
          setEmail(DEMO_ACCOUNT.email);
          setPassword(DEMO_ACCOUNT.password);
          void submit(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password);
        }}
      >
        Use demo account
      </Button>
      <p className="text-center text-xs text-ink-muted">
        Demo: {DEMO_ACCOUNT.email} / {DEMO_ACCOUNT.password}
      </p>
    </div>
  );
}
