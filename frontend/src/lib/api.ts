import { API_URL } from "./config";
import type {
  HostedMeeting,
  JoinResponse,
  Meeting,
  ScheduleMeetingInput,
  User,
} from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
    });
  } catch {
    throw new ApiError("Unable to reach the server. Please check your connection.", 0);
  }

  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    // FastAPI returns {detail: "message"} or {detail: [{msg: "..."}]} for validation errors.
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail) && body.detail[0]?.msg) return body.detail[0].msg;
  } catch {
    // fall through
  }
  return `Request failed (${response.status})`;
}

const post = <T>(path: string, body: unknown = {}) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body) });

export const api = {
  me: () => request<User>("/api/me"),

  upcomingMeetings: () => request<HostedMeeting[]>("/api/meetings/upcoming"),
  recentMeetings: () => request<Meeting[]>("/api/meetings/recent"),
  getMeeting: (code: string) => request<Meeting>(`/api/meetings/${encodeURIComponent(code)}`),

  createInstantMeeting: () => post<HostedMeeting>("/api/meetings/instant"),
  scheduleMeeting: (input: ScheduleMeetingInput) => post<HostedMeeting>("/api/meetings", input),
  deleteMeeting: (code: string) => request<void>(`/api/meetings/${code}`, { method: "DELETE" }),

  joinMeeting: (
    code: string,
    body: { display_name: string; host_key?: string; is_muted: boolean; is_video_on: boolean },
  ) => post<JoinResponse>(`/api/meetings/${code}/join`, body),

  // Host controls
  endMeeting: (code: string, hostKey: string) =>
    post<void>(`/api/meetings/${code}/end`, { host_key: hostKey }),
  muteAll: (code: string, hostKey: string) =>
    post<void>(`/api/meetings/${code}/mute-all`, { host_key: hostKey }),
  muteParticipant: (code: string, participantId: number, hostKey: string) =>
    post<void>(`/api/meetings/${code}/participants/${participantId}/mute`, { host_key: hostKey }),
  removeParticipant: (code: string, participantId: number, hostKey: string) =>
    post<void>(`/api/meetings/${code}/participants/${participantId}/remove`, { host_key: hostKey }),
};
