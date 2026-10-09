"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { JoinMeetingForm } from "@/components/meetings/JoinMeetingForm";
import { ZoomLogo } from "@/components/ui/icons";
import { useAuth } from "@/components/auth/AuthProvider";

/** Standalone join page (like zoom.us/join), also reachable as /join?code=… */
export default function JoinPage() {
  return (
    <div className="min-h-dvh">
      <header className="flex h-14 items-center border-b border-line bg-white px-6">
        <Link href="/" aria-label="Zoom home">
          <ZoomLogo />
        </Link>
      </header>
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="mb-6 text-center text-2xl font-bold">Join meeting</h1>
        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <Suspense>
            <JoinFormWithParams />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

function JoinFormWithParams() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  return <JoinMeetingForm defaultCode={searchParams.get("code") ?? ""} defaultName={user?.name} />;
}
