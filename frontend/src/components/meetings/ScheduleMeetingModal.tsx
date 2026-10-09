"use client";

import { CircleCheck } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";
import { formatDate, formatDuration, formatMeetingCode, formatTime, invitationText } from "@/lib/format";
import type { HostedMeeting } from "@/lib/types";

interface ScheduleMeetingModalProps {
  hostName: string;
  onClose: () => void;
  onScheduled: (meeting: HostedMeeting) => void;
}

// "00:00", "00:15", … "23:45"
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const value = `${String(Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`;
  return { value, label: formatTime(new Date(`2000-01-01T${value}`)) };
});

const toDateInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** The next quarter hour after now, the default start for a new meeting. */
function nextSlot(): Date {
  const d = new Date();
  d.setMinutes(Math.ceil((d.getMinutes() + 1) / 15) * 15, 0, 0);
  return d;
}

export function ScheduleMeetingModal({ hostName, onClose, onScheduled }: ScheduleMeetingModalProps) {
  const [initial] = useState(nextSlot);
  const [title, setTitle] = useState(`${hostName}'s Zoom Meeting`);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(toDateInput(initial));
  const [time, setTime] = useState(
    `${String(initial.getHours()).padStart(2, "0")}:${String(initial.getMinutes()).padStart(2, "0")}`,
  );
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scheduled, setScheduled] = useState<HostedMeeting | null>(null);

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const start = new Date(`${date}T${time}`); // interpreted in the browser's time zone
    const duration = hours * 60 + minutes;

    if (!title.trim()) return setError("Please enter a topic");
    if (Number.isNaN(start.getTime())) return setError("Please choose a valid date and time");
    if (start.getTime() < Date.now() - 60_000) return setError("Start time must be in the future");
    if (duration < 15) return setError("Duration must be at least 15 minutes");

    setSaving(true);
    setError(null);
    try {
      const meeting = await api.scheduleMeeting({
        title: title.trim(),
        description: description.trim(),
        start_time: start.toISOString(),
        duration_minutes: duration,
      });
      setScheduled(meeting);
      onScheduled(meeting);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (scheduled) {
    return (
      <Modal
        title="Meeting scheduled"
        onClose={onClose}
        width={480}
        footer={<Button onClick={onClose}>Done</Button>}
      >
        <div className="flex flex-col items-center gap-2 pb-3 text-center">
          <CircleCheck size={44} className="text-zoom-green" />
          <p className="text-lg font-bold">{scheduled.title}</p>
          <p className="text-sm text-ink-muted">
            {formatDate(scheduled.start_time)}, {formatTime(scheduled.start_time)} –{" "}
            {formatTime(scheduled.end_time)} ({formatDuration(scheduled.duration_minutes)})
          </p>
        </div>
        <dl className="grid grid-cols-[110px_1fr] gap-y-2 rounded-lg bg-surface p-4 text-sm">
          <dt className="text-ink-muted">Meeting ID</dt>
          <dd className="font-bold">{formatMeetingCode(scheduled.code)}</dd>
          <dt className="text-ink-muted">Invite link</dt>
          <dd className="break-all text-zoom-blue">{scheduled.invite_url}</dd>
        </dl>
        <CopyButton text={invitationText(scheduled)} className="mt-3" />
      </Modal>
    );
  }

  return (
    <Modal
      title="Schedule meeting"
      onClose={onClose}
      width={520}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="schedule-form" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <form id="schedule-form" onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
        <Field label="Topic">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="input"
            autoFocus
          />
        </Field>

        <Field label="Description (optional)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={3}
            className="input h-auto resize-none py-2"
            placeholder="Add a description"
          />
        </Field>

        <Field label="When">
          <div className="flex flex-wrap gap-2">
            <input
              type="date"
              value={date}
              min={toDateInput(new Date())}
              onChange={(e) => setDate(e.target.value)}
              className="input w-auto flex-1"
              aria-label="Date"
            />
            <select value={time} onChange={(e) => setTime(e.target.value)} className="input w-auto" aria-label="Time">
              {TIME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </Field>

        <Field label="Duration">
          <div className="flex items-center gap-2">
            <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className="input w-20" aria-label="Hours">
              {Array.from({ length: 25 }, (_, h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <span className="text-ink-muted">hr</span>
            <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="input w-20" aria-label="Minutes">
              {[0, 15, 30, 45].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <span className="text-ink-muted">min</span>
          </div>
        </Field>

        <Field label="Time zone">
          <p className="text-ink">{timeZone}</p>
        </Field>

        <Field label="Meeting ID">
          <p className="text-ink">Generate automatically</p>
        </Field>

        {error && <p className="text-zoom-red">{error}</p>}
      </form>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-bold text-ink">{label}</span>
      {children}
    </div>
  );
}
