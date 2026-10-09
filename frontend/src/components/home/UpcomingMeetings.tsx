"use client";

import { CalendarDays } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { useNow } from "@/hooks/useNow";
import { dayLabel, formatMeetingCode, formatTime, invitationText } from "@/lib/format";
import type { HostedMeeting } from "@/lib/types";

interface UpcomingMeetingsProps {
  meetings: HostedMeeting[];
  loading: boolean;
  onStart: (meeting: HostedMeeting) => void;
  onSchedule: () => void;
}

/** Home's main card: upcoming meetings grouped by day, each with Start and Copy invitation. */
export function UpcomingMeetings({ meetings, loading, onStart, onSchedule }: UpcomingMeetingsProps) {
  const now = useNow(60_000);

  // Group consecutive meetings by their day label ("Today", "Tomorrow", "Sat, Oct 10").
  const groups: { label: string; items: HostedMeeting[] }[] = [];
  for (const meeting of meetings) {
    const label = now ? dayLabel(meeting.start_time, now) : "";
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(meeting);
    else groups.push({ label, items: [meeting] });
  }

  return (
    <section className="rounded-2xl border border-line bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <h2 className="text-[15px] font-bold">Upcoming meetings</h2>
        <Link href="/meetings" className="text-sm font-bold text-zoom-blue hover:underline">
          View all
        </Link>
      </header>

      {loading ? (
        <p className="p-8 text-center text-sm text-ink-muted">Loading meetings…</p>
      ) : meetings.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center text-ink-muted">
          <CalendarDays size={36} strokeWidth={1.5} />
          <p className="text-sm">No upcoming meetings</p>
          <Button variant="secondary" onClick={onSchedule} className="h-8 text-[13px]">
            Schedule a meeting
          </Button>
        </div>
      ) : (
        <div className="max-h-[460px] overflow-y-auto">
          {groups.map((group) => (
            <div key={group.label + group.items[0].code}>
              <p className="bg-surface px-5 py-1.5 text-xs font-bold text-ink-muted">{group.label}</p>
              <ul className="divide-y divide-line">
                {group.items.map((meeting) => (
                  <li key={meeting.code} className="flex items-start gap-4 px-5 py-3.5">
                    <div className="w-[72px] shrink-0 pt-0.5 text-sm tabular-nums">
                      <p className="font-bold">{formatTime(meeting.start_time)}</p>
                      <p className="text-xs text-ink-muted">{formatTime(meeting.end_time)}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate font-bold">
                        {meeting.title}
                        {meeting.status === "live" && (
                          <span className="rounded bg-zoom-green/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#11893a]">
                            Live
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-muted">Meeting ID: {formatMeetingCode(meeting.code)}</p>
                      <CopyButton text={invitationText(meeting)} className="mt-1 text-xs" />
                    </div>
                    <Button onClick={() => onStart(meeting)} className="h-8 px-4 text-[13px]">
                      Start
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
