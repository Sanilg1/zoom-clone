"use client";

import { ShieldCheck } from "lucide-react";

import { CopyButton } from "@/components/ui/CopyButton";
import { formatMeetingCode } from "@/lib/format";
import type { Meeting } from "@/lib/types";

/** The popover behind the shield icon in the top-left corner of the meeting. */
export function MeetingInfo({ meeting, participantId }: { meeting: Meeting; participantId: number }) {
  return (
    <div className="absolute left-2 top-11 z-30 w-[min(340px,calc(100vw-16px))] rounded-xl border border-white/10 bg-room-panel p-4 text-sm text-white shadow-2xl">
      <p className="mb-3 text-base font-bold">{meeting.title}</p>
      <dl className="grid grid-cols-[96px_1fr] gap-y-2">
        <dt className="text-white/60">Meeting ID</dt>
        <dd>{formatMeetingCode(meeting.code)}</dd>
        <dt className="text-white/60">Host</dt>
        <dd>{meeting.host.name}</dd>
        <dt className="text-white/60">Invite link</dt>
        <dd className="min-w-0">
          <p className="truncate">{meeting.invite_url}</p>
          <CopyButton text={meeting.invite_url} label="Copy link" className="mt-1 text-[#4c8dff]" />
        </dd>
        <dt className="text-white/60">Participant ID</dt>
        <dd>{participantId}</dd>
        <dt className="text-white/60">Encryption</dt>
        <dd className="flex items-center gap-1 text-zoom-green">
          <ShieldCheck size={15} /> Enabled
        </dd>
      </dl>
    </div>
  );
}
