import { Clock, Users } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { formatDate, formatDuration, formatMeetingCode, formatTime, invitationText } from "@/lib/format";
import type { Meeting } from "@/lib/types";

interface MeetingDetailsProps {
  meeting: Meeting;
  onStart?: () => void;
  onDelete?: () => void;
}

export function MeetingDetails({ meeting, onStart, onDelete }: MeetingDetailsProps) {
  const ended = meeting.status === "ended";
  const start = ended && meeting.started_at ? meeting.started_at : meeting.start_time;

  return (
    <article className="max-w-2xl">
      <h2 className="text-2xl font-bold">{meeting.title}</h2>
      <p className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
        <Clock size={15} />
        {formatDate(start)}, {formatTime(start)} – {formatTime(ended && meeting.ended_at ? meeting.ended_at : meeting.end_time)}
        {!ended && ` (${formatDuration(meeting.duration_minutes)})`}
      </p>
      {ended && (
        <p className="mt-1 flex items-center gap-2 text-sm text-ink-muted">
          <Users size={15} /> {meeting.participant_count} participant{meeting.participant_count === 1 ? "" : "s"}
        </p>
      )}

      <p className="mt-4 text-sm">
        <span className="text-ink-muted">Meeting ID:</span>{" "}
        <span className="font-bold">{formatMeetingCode(meeting.code)}</span>
      </p>
      {meeting.description && <p className="mt-3 whitespace-pre-line text-sm">{meeting.description}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {onStart && <Button onClick={onStart}>Start</Button>}
        <CopyButton text={invitationText(meeting)} className="rounded-lg border border-line bg-white px-4 py-2 hover:no-underline" />
        {onDelete && (
          <Button variant="secondary" onClick={onDelete}>
            Delete
          </Button>
        )}
      </div>

      <section className="mt-8 rounded-xl border border-line bg-white p-5">
        <h3 className="mb-2 text-sm font-bold">Meeting invitation</h3>
        <pre className="whitespace-pre-wrap break-all font-sans text-sm text-ink-muted">{invitationText(meeting)}</pre>
      </section>
    </article>
  );
}
