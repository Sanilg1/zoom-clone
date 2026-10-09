"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { api } from "@/lib/api";
import { hostKeys } from "@/lib/storage";
import type { HostedMeeting } from "@/lib/types";
import { useResetOnHide } from "./useResetOnHide";

/** Starting a meeting as its host: remember the host key for this tab, then open the room. */
export function useStartMeeting() {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useResetOnHide(() => setStarting(false));

  const enterAsHost = useCallback(
    (meeting: HostedMeeting) => {
      hostKeys.set(meeting.code, meeting.host_key);
      router.push(`/meeting/${meeting.code}`);
    },
    [router],
  );

  const startInstantMeeting = useCallback(async () => {
    setStarting(true);
    setError(null);
    try {
      enterAsHost(await api.createInstantMeeting());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start a meeting");
      setStarting(false);
    }
  }, [enterAsHost]);

  return { startInstantMeeting, enterAsHost, starting, error };
}
