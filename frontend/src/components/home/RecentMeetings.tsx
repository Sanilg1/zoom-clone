import { Clock, Users } from "lucide-react";

import { CopyButton } from "@/components/ui/CopyButton";
import { formatDate, formatDuration, formatMeetingCode, formatTime } from "@/lib/format";
import type { Meeting } from "@/lib/types";

interface RecentMeetingsProps {
  meetings: Meeting[];
  loading: boolean;
}

function actualMinutes(meeting: Meeting): number {
  if (!meeting.started_at || !meeting.ended_at) return meeting.duration_minutes;
  const ms = new Date(meeting.ended_at).getTime() - new Date(meeting.started_at).getTime();
  return Math.max(1, Math.round(ms / 60_000));
}

export function RecentMeetings({ meetings, loading }: RecentMeetingsProps) {
  return (
    <section className="rounded-2xl border border-line bg-white shadow-sm">
      <h2 className="border-b border-line px-5 py-3.5 text-[15px] font-bold">Recent meetings</h2>
      {loading ? (
        <p className="p-6 text-center text-sm text-ink-muted">Loading…</p>
      ) : meetings.length === 0 ? (
        <p className="p-6 text-center text-sm text-ink-muted">No recent meetings</p>
      ) : (
        <ul className="divide-y divide-line">
          {meetings.map((meeting) => (
            <li key={meeting.code} className="flex items-center gap-3 px-5 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zoom-blue-light text-zoom-blue">
                <Clock size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{meeting.title}</p>
                <p className="text-xs text-ink-muted">
                  {formatDate(meeting.ended_at ?? meeting.start_time)},{" "}
                  {formatTime(meeting.started_at ?? meeting.start_time)} ·{" "}
                  {formatDuration(actualMinutes(meeting))} · ID {formatMeetingCode(meeting.code)}
                </p>
              </div>
              <span className="hidden items-center gap-1 text-xs text-ink-muted sm:flex" title="Participants">
                <Users size={14} /> {meeting.participant_count}
              </span>
              <CopyButton text={meeting.invite_url} label="Copy link" className="text-xs" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
