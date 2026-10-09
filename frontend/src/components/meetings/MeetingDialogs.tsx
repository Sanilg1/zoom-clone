"use client";

import type { HostedMeeting } from "@/lib/types";
import { JoinMeetingModal } from "./JoinMeetingModal";
import { ScheduleMeetingModal } from "./ScheduleMeetingModal";

export type MeetingDialog = "join" | "share" | "schedule" | null;

interface MeetingDialogsProps {
  dialog: MeetingDialog;
  userName?: string;
  onClose: () => void;
  onScheduled: (meeting: HostedMeeting) => void;
}

/** The Join / Share screen / Schedule dialogs, opened from the header's + menu or the home shortcuts. */
export function MeetingDialogs({ dialog, userName, onClose, onScheduled }: MeetingDialogsProps) {
  if (dialog === "join" || dialog === "share") {
    return (
      <JoinMeetingModal title={dialog === "share" ? "Share screen" : "Join meeting"} defaultName={userName} onClose={onClose} />
    );
  }
  if (dialog === "schedule") {
    return <ScheduleMeetingModal hostName={userName ?? "My"} onClose={onClose} onScheduled={onScheduled} />;
  }
  return null;
}
