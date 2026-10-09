"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { Spinner } from "@/components/ui/Spinner";
import { useLocalMedia } from "@/hooks/useLocalMedia";
import { useResetOnHide } from "@/hooks/useResetOnHide";
import type { ExitReason } from "@/hooks/useMeetingRoom";
import { api } from "@/lib/api";
import { rememberedName, hostKeys } from "@/lib/storage";
import type { Meeting, Participant } from "@/lib/types";
import { EndScreen } from "./EndScreen";
import { MeetingRoom } from "./MeetingRoom";
import { PreJoin } from "./PreJoin";

type Stage =
  | { kind: "pre-join" }
  | { kind: "in-meeting"; self: Participant; meeting: Meeting }
  | { kind: "exited"; reason: ExitReason };

/**
 * /meeting/[code]: checks the meeting exists, then moves through
 * pre-join (preview + name) → in the meeting → exit screen.
 */
export function MeetingFlow() {
  const { code } = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>({ kind: "pre-join" });
  // Leaving this page closes the meeting connection, so coming back starts again at pre-join.
  useResetOnHide(() => setStage({ kind: "pre-join" }));
  // Name used last time, so "Rejoin" keeps it.
  const [joinedName, setJoinedName] = useState<string | null>(null);
  // The host key lives in this tab's sessionStorage: set when the meeting was created or started
  // here, replaced if the host hands the role to us, cleared if we hand it to someone else.
  const [hostKey, setHostKey] = useState(() => hostKeys.get(code));

  function updateHostKey(key: string | null) {
    if (key) hostKeys.set(code, key);
    else hostKeys.clear(code);
    setHostKey(key);
  }

  const media = useLocalMedia(meeting !== null && stage.kind !== "exited", {
    audio: searchParams.get("audio") !== "off",
    video: searchParams.get("video") !== "off",
  });

  useEffect(() => {
    api
      .getMeeting(code)
      .then(setMeeting)
      .catch((err: Error) => setLoadError(err.message));
  }, [code]);

  async function join(name: string) {
    const response = await api.joinMeeting(code, {
      display_name: name,
      host_key: hostKey ?? undefined,
      is_muted: !media.audioOn,
      is_video_on: media.videoOn,
    });
    setJoinedName(name);
    setStage({ kind: "in-meeting", self: response.participant, meeting: response.meeting });
  }

  if (loadError) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-bold">{loadError}</h1>
        <Link href="/" className="font-bold text-zoom-blue hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-room text-white">
        <Spinner size={32} />
      </div>
    );
  }

  if (stage.kind === "exited") {
    return <EndScreen reason={stage.reason} onRejoin={() => setStage({ kind: "pre-join" })} />;
  }

  if (stage.kind === "in-meeting") {
    return (
      <MeetingRoom
        meeting={stage.meeting}
        self={stage.self}
        hostKey={hostKey}
        media={media}
        onHostKey={updateHostKey}
        onExit={(reason) => setStage({ kind: "exited", reason })}
      />
    );
  }

  const hostName = hostKey ? user?.name : undefined;
  const defaultName =
    joinedName ?? hostName ?? searchParams.get("name") ?? rememberedName.get() ?? user?.name ?? "";
  return (
    <PreJoin
      meeting={meeting}
      media={media}
      defaultName={defaultName}
      isHost={hostKey !== null}
      onJoin={join}
    />
  );
}
