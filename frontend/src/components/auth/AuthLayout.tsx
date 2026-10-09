"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useState, type InputHTMLAttributes, type ReactNode } from "react";

import { ZoomLogo } from "@/components/ui/icons";

interface AuthLayoutProps {
  title: string;
  /** e.g. "New to Zoom?" + "Sign up free" linking to /signup */
  switchPrompt: string;
  switchLabel: string;
  switchHref: string;
  children: ReactNode;
}

/** Page shell for sign-in and sign-up, laid out like Zoom's account pages. */
export function AuthLayout({ title, switchPrompt, switchLabel, switchHref, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="flex h-16 items-center justify-between border-b border-line px-4 sm:px-8">
        <Link href="/" aria-label="Zoom home">
          <ZoomLogo />
        </Link>
        <p className="text-sm text-ink-muted">
          <span className="hidden sm:inline">{switchPrompt} </span>
          <Link href={switchHref} className="font-bold text-zoom-blue hover:underline">
            {switchLabel}
          </Link>
        </p>
      </header>
      <main className="flex flex-1 justify-center px-4 py-12 sm:py-20">
        <div className="flex w-full max-w-[400px] flex-col gap-6">
          <h1 className="text-center text-[28px] font-bold">{title}</h1>
          {children}
        </div>
      </main>
    </div>
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

// The hint sits outside the <label> and is linked with aria-describedby, so screen readers
// announce "Password" as the field's name and read the hint as its description.
function FieldHint({ id, hint }: { id?: string; hint?: string }) {
  return hint ? (
    <p id={`${id}-hint`} className="text-xs text-ink-muted">
      {hint}
    </p>
  ) : null;
}

export function AuthField({ label, hint, id, ...props }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <input id={id} aria-describedby={hint ? `${id}-hint` : undefined} className="input h-11" {...props} />
      <FieldHint id={id} hint={hint} />
    </div>
  );
}

export function PasswordField({ label, hint, id, ...props }: FieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <span className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="input h-11 pr-11"
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-ink-muted hover:text-ink"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
      <FieldHint id={id} hint={hint} />
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs text-ink-muted">
      <span className="h-px flex-1 bg-line" />
      or
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
