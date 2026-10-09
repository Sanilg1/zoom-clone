"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { ZoomLogo } from "@/components/ui/icons";
import type { ExitReason } from "@/hooks/useMeetingRoom";

const MESSAGES: Record<ExitReason, { title: string; canRejoin: boolean }> = {
  left: { title: "You left the meeting", canRejoin: true },
  ended: { title: "This meeting has been ended by host", canRejoin: false },
  removed: { title: "You have been removed from this meeting by the host", canRejoin: false },
  disconnected: { title: "You have been disconnected from the meeting", canRejoin: true },
};

export function EndScreen({ reason, onRejoin }: { reason: ExitReason; onRejoin: () => void }) {
  const router = useRouter();
  const { title, canRejoin } = MESSAGES[reason];

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-surface p-6 text-center">
      <ZoomLogo className="text-4xl" />
      <h1 className="max-w-md text-xl font-bold">{title}</h1>
      <div className="flex gap-3">
        {canRejoin && (
          <Button variant="secondary" onClick={onRejoin}>
            Rejoin
          </Button>
        )}
        <Button onClick={() => router.push("/")}>Back to home</Button>
      </div>
    </div>
  );
}
