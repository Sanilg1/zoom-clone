"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { AuthField, AuthLayout, PasswordField } from "@/components/auth/AuthLayout";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { useResetOnHide } from "@/hooks/useResetOnHide";

const MIN_PASSWORD = 8;

export default function SignUpPage() {
  const { signUp, status } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useResetOnHide(() => {
    setPassword("");
    setError(null);
    setBusy(false);
  });

  useEffect(() => {
    if (status === "signed-in") router.replace("/");
  }, [status, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError("Enter your name");
    if (!email.trim()) return setError("Enter your email address");
    if (password.length < MIN_PASSWORD) return setError(`Password must be at least ${MIN_PASSWORD} characters`);

    setBusy(true);
    setError(null);
    try {
      await signUp(name.trim(), email.trim(), password);
      router.replace("/");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Create your account" switchPrompt="Already have an account?" switchLabel="Sign in" switchHref="/signin">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthField
          id="signup-name"
          label="Full name"
          autoComplete="name"
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <AuthField
          id="signup-email"
          label="Email address"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordField
          id="signup-password"
          label="Password"
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD} characters`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-zoom-red">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy} className="h-11 text-[15px]">
          {busy ? "Creating account…" : "Sign up"}
        </Button>
        <p className="text-center text-xs text-ink-muted">
          You can join meetings without an account. An account lets you start, schedule and keep track of
          meetings.
        </p>
      </form>
    </AuthLayout>
  );
}
