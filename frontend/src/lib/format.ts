/** "84512345678" -> "845 1234 5678", the way Zoom displays meeting IDs. */
export function formatMeetingCode(code: string): string {
  return code.length === 11
    ? `${code.slice(0, 3)} ${code.slice(3, 7)} ${code.slice(7)}`
    : code.replace(/(\d{3})(\d{3})(\d+)/, "$1 $2 $3");
}

/**
 * Accepts a meeting ID ("845 1234 5678") or an invite link ("https://…/j/84512345678")
 * and returns the bare digits, or null if it does not look like a meeting ID.
 */
export function parseMeetingCode(input: string): string | null {
  const trimmed = input.trim();
  const fromLink = trimmed.match(/\/j\/(\d+)/);
  const digits = fromLink ? fromLink[1] : trimmed.replace(/[\s-]/g, "");
  return /^\d{9,11}$/.test(digits) ? digits : null;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export const formatTime = (iso: string | Date) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export const formatDate = (iso: string | Date) =>
  new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

export const formatLongDate = (date: Date) =>
  date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/** "Today", "Tomorrow" or "Sat, Oct 10" – used to group the upcoming meetings list. */
export function dayLabel(iso: string, now: Date): string {
  const day = new Date(iso);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(day) - startOfDay(now)) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return formatDate(iso);
}

/** The text copied by "Copy invitation", modelled on Zoom's invite. */
export function invitationText(meeting: {
  title: string;
  host: { name: string };
  start_time: string;
  meeting_type: string;
  invite_url: string;
  code: string;
}): string {
  const scheduled = meeting.meeting_type === "scheduled";
  const lines = [`${meeting.host.name} is inviting you to a ${scheduled ? "scheduled " : ""}Zoom meeting.`, ""];
  lines.push(`Topic: ${meeting.title}`);
  if (scheduled) {
    lines.push(`Time: ${formatDate(meeting.start_time)}, ${formatTime(meeting.start_time)}`);
  }
  lines.push("", "Join Zoom Meeting", meeting.invite_url, "", `Meeting ID: ${formatMeetingCode(meeting.code)}`);
  return lines.join("\n");
}
