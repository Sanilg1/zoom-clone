// Shapes returned by the FastAPI backend (see backend/app/schemas.py).

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_color: string;
  timezone: string;
}

export type MeetingType = "instant" | "scheduled";
export type MeetingStatus = "scheduled" | "live" | "ended";
export type ParticipantRole = "host" | "attendee";

export interface Meeting {
  code: string;
  title: string;
  description: string;
  meeting_type: MeetingType;
  status: MeetingStatus;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  host: User;
  participant_count: number;
  invite_url: string;
}

/** Only returned to the meeting's creator. */
export interface HostedMeeting extends Meeting {
  host_key: string;
}

export interface Participant {
  id: number;
  display_name: string;
  role: ParticipantRole;
  is_muted: boolean;
  is_video_on: boolean;
  is_sharing_screen: boolean;
  joined_at: string;
}

export interface ChatMessage {
  id: number;
  participant_id: number;
  sender_name: string;
  body: string;
  sent_at: string;
}

export interface JoinResponse {
  participant: Participant;
  meeting: Meeting;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ScheduleMeetingInput {
  title: string;
  description: string;
  start_time: string; // ISO 8601 with offset
  duration_minutes: number;
}

/** Messages the server pushes over the meeting WebSocket (see backend/app/events.py). */
export type ServerEvent =
  | { type: "room-state"; participants: Participant[] }
  | { type: "participant-joined"; participant: Participant }
  | { type: "participant-updated"; participant: Participant }
  | { type: "participant-left"; participant_id: number }
  | { type: "signal"; from: number; data: SignalData }
  | { type: "chat"; message: ChatMessage }
  | { type: "reaction"; participant_id: number; emoji: string }
  | { type: "host-granted"; host_key: string }
  | { type: "muted-by-host" }
  | { type: "removed" }
  | { type: "meeting-ended" };

export type SignalData =
  | { sdp: RTCSessionDescriptionInit }
  | { candidate: RTCIceCandidateInit };
