"use client";

import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { dayLabel, formatLongDate, formatMeetingCode, formatTime, invitationText } from "@/lib/format";
import type { HostedMeeting } from "@/lib/types";
import { useNow } from "@/hooks/useNow";

interface UpcomingMeetingsProps {
  meetings: HostedMeeting[];
  loading: boolean;
  onStart: (meeting: HostedMeeting) => void;
}

/** Right-hand card on the home screen: big clock, then the list of upcoming meetings. */
export function UpcomingMeetings({ meetings, loading, onStart }: UpcomingMeetingsProps) {
  const now = useNow();

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="relative h-36 bg-[linear-gradient(135deg,#0b5cff_0%,#1d3a8a_55%,#0f1d47_100%)] px-6 py-5 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(255,255,255,0.18),transparent_45%)]" />
        <p className="relative text-[44px] font-light leading-tight tabular-nums">
          {now ? formatTime(now) : " "}
        </p>
        <p className="relative text-sm opacity-90">{now ? formatLongDate(now) : " "}</p>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {loading ? (
          <p className="p-6 text-center text-sm text-ink-muted">Loading meetings…</p>
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-ink-muted">
            <CalendarDays size={36} strokeWidth={1.5} />
            <p className="text-sm">No upcoming meetings</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {meetings.map((meeting) => (
              <li key={meeting.code} className="flex items-start gap-3 px-5 py-4 hover:bg-surface/60">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-ink-muted">
                    {now ? dayLabel(meeting.start_time, now) : ""} · {formatTime(meeting.start_time)} –{" "}
                    {formatTime(meeting.end_time)}
                  </p>
                  <p className="mt-0.5 flex items-center gap-2 truncate font-bold">
                    {meeting.title}
                    {meeting.status === "live" && (
                      <span className="rounded bg-zoom-green/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#11893a]">
                        Live
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Meeting ID: {formatMeetingCode(meeting.code)}
                  </p>
                  <CopyButton text={invitationText(meeting)} className="mt-1.5 text-xs" />
                </div>
                <Button onClick={() => onStart(meeting)} className="h-8 px-3.5 text-[13px]">
                  Start
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
