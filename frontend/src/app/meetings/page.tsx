"use client";

import { CalendarDays, Plus, RotateCw } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Navbar } from "@/components/layout/Navbar";
import { MeetingDetails } from "@/components/meetings/MeetingDetails";
import { ScheduleMeetingModal } from "@/components/meetings/ScheduleMeetingModal";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDashboardMeetings } from "@/hooks/useDashboardMeetings";
import { useNow } from "@/hooks/useNow";
import { useResetOnHide } from "@/hooks/useResetOnHide";
import { useStartMeeting } from "@/hooks/useStartMeeting";
import { api } from "@/lib/api";
import { dayLabel, formatDate, formatTime } from "@/lib/format";
import type { Meeting } from "@/lib/types";

type Tab = "upcoming" | "previous";

/** Zoom's "Meetings" tab: a list on the left, the selected meeting's details on the right. */
export default function MeetingsPage() {
  const user = useCurrentUser();
  const now = useNow(60_000);
  const { upcoming, recent, loading, error, reload } = useDashboardMeetings();
  const { enterAsHost } = useStartMeeting();
  const [tab, setTab] = useState<Tab>("upcoming");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);
  useResetOnHide(() => setScheduling(false));

  const list: Meeting[] = tab === "upcoming" ? upcoming : recent;
  const selected = list.find((m) => m.code === selectedCode) ?? list[0] ?? null;
  const selectedHosted = upcoming.find((m) => m.code === selected?.code) ?? null;

  async function handleDelete(code: string) {
    if (!window.confirm("Delete this meeting? Invitees will no longer be able to join it.")) return;
    try {
      await api.deleteMeeting(code);
      setSelectedCode(null);
      await reload();
    } catch (err) {
      window.alert((err as Error).message);
    }
  }

  return (
    <div className="flex h-dvh flex-col">
      <Navbar user={user} />

      <div className="mx-auto flex min-h-0 w-full max-w-[1280px] flex-1 flex-col md:flex-row">
        <aside className="flex min-h-0 flex-col border-line bg-white md:w-[340px] md:border-r">
          <div className="flex items-center justify-between px-4 pb-2 pt-4">
            <h1 className="text-lg font-bold">Meetings</h1>
            <div className="flex gap-1">
              <IconButton label="Refresh" onClick={reload}>
                <RotateCw size={17} />
              </IconButton>
              <IconButton label="Schedule a meeting" onClick={() => setScheduling(true)}>
                <Plus size={19} />
              </IconButton>
            </div>
          </div>

          <div className="mx-4 mb-2 grid grid-cols-2 rounded-lg bg-surface p-1 text-sm font-bold">
            {(["upcoming", "previous"] as const).map((value) => (
              <button
                key={value}
                onClick={() => {
                  setTab(value);
                  setSelectedCode(null);
                }}
                className={`rounded-md py-1.5 capitalize ${tab === value ? "bg-white text-ink shadow-sm" : "text-ink-muted"}`}
              >
                {value}
              </button>
            ))}
          </div>

          <ul className="max-h-[40vh] overflow-y-auto md:max-h-none md:flex-1">
            {loading && <li className="p-6 text-center text-sm text-ink-muted">Loading…</li>}
            {!loading && list.length === 0 && (
              <li className="flex flex-col items-center gap-2 p-10 text-sm text-ink-muted">
                <CalendarDays size={32} strokeWidth={1.5} />
                {tab === "upcoming" ? "No upcoming meetings" : "No previous meetings"}
              </li>
            )}
            {list.map((meeting) => {
              const when = tab === "upcoming" ? meeting.start_time : (meeting.ended_at ?? meeting.start_time);
              return (
                <li key={meeting.code}>
                  <button
                    onClick={() => setSelectedCode(meeting.code)}
                    className={`w-full border-l-[3px] px-4 py-3 text-left ${
                      selected?.code === meeting.code
                        ? "border-zoom-blue bg-zoom-blue-light"
                        : "border-transparent hover:bg-surface"
                    }`}
                  >
                    <p className="text-xs text-ink-muted">
                      {now ? dayLabel(when, now) : formatDate(when)} · {formatTime(when)}
                    </p>
                    <p className="truncate text-sm font-bold">{meeting.title}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <main className="min-h-0 flex-1 overflow-y-auto p-6 md:p-10">
          {error && <p className="mb-4 text-sm text-zoom-red">{error}</p>}
          {selected ? (
            <MeetingDetails
              meeting={selected}
              onStart={selectedHosted ? () => enterAsHost(selectedHosted) : undefined}
              onDelete={selectedHosted ? () => handleDelete(selected.code) : undefined}
            />
          ) : (
            !loading && <p className="pt-20 text-center text-ink-muted">Select a meeting to see its details</p>
          )}
        </main>
      </div>

      {scheduling && (
        <ScheduleMeetingModal
          hostName={user?.name ?? "My"}
          onClose={() => setScheduling(false)}
          onScheduled={(meeting) => {
            setTab("upcoming");
            setSelectedCode(meeting.code);
            void reload();
          }}
        />
      )}
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="rounded-lg p-1.5 text-ink-muted hover:bg-surface hover:text-ink"
    >
      {children}
    </button>
  );
}
