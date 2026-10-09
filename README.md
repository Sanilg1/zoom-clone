# Zoom Clone

A video conferencing web app modelled on Zoom's web client. You can start an instant meeting, join with a
meeting ID or invite link, schedule meetings, and hold real audio/video calls in the browser with chat,
reactions, screen sharing and host controls.

- **Frontend:** Next.js 16 (App Router, React 19, TypeScript, Tailwind CSS 4), all pages are client-rendered
- **Backend:** Python, FastAPI, SQLAlchemy 2
- **Database:** SQLite
- **Real-time:** WebSockets (FastAPI) for presence, chat and signalling; WebRTC for audio/video

## Features

**Demo account:** `sanil@zoomclone.dev` / `zoomdemo123` (or click **Use demo account** on the sign-in page).
You can also create your own account. Joining a meeting from an invite link does not need an account.

| Area | What works |
|---|---|
| Sign in / sign up (bonus) | Create an account (name, email, password) or sign in; the dashboard and Meetings tab need an account, joining a meeting does not; sign out from the profile menu |
| Home dashboard | Zoom-style top bar (Home / Meetings tabs, search, settings, profile menu), the four action tiles (New meeting, Join, Schedule, Share screen), clock card with upcoming meetings, recent meetings |
| Instant meeting | One click creates a meeting with a unique 11-digit ID and an invite link (`/j/<id>`), then opens the room as host |
| Join meeting | By meeting ID (`845 1234 5678`, with or without spaces) or by pasting the invite link; display name required; the meeting's existence is checked before joining; options to join muted or with video off |
| Schedule meeting | Topic, description, date and time pickers, duration, time zone; the meeting ID and link are generated and saved, and the meeting appears under Upcoming with Start / Copy invitation / Delete |
| Meetings tab | Upcoming and Previous lists with a details pane and the full invitation text |
| Meeting room | Camera/mic preview before joining, gallery view, live video and audio between participants, mute (mic icon shows your live voice level) / stop video (releases the camera), speaking highlight, participants panel, chat with unread badge, reactions, screen share (presenter layout), meeting info popover, elapsed timer; menus close on an outside click or Escape |
| Device problems | If the camera or mic can't start, you join with whichever device works and see why; if a device stops mid-meeting (unplugged, taken by another app) a banner appears and others see your name instead of a frozen tile |
| Host controls (bonus) | Mute a participant, mute all, remove a participant, **make another participant host**, end the meeting for everyone; a host who leaves while others stay picks a new host first ("Assign and Leave") |
| Responsive (bonus) | Dashboard, meetings tab and meeting room adapt to phone, tablet and desktop widths |

## Running locally

Requirements: Python 3.11+ and Node.js 20+.

**Backend** (http://localhost:8000, API docs at http://localhost:8000/docs)

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The database file `zoom_clone.db` is created and filled with sample data on first start.
To reset it: `python -m app.seed --reset`.

**Frontend** (http://localhost:3000)

```bash
cd frontend
npm install
npm run dev
```

The frontend calls `http://localhost:8000` by default; set `NEXT_PUBLIC_API_URL` to change it (see `frontend/.env.example`).

**Trying a call:** sign in with the demo account, click **New meeting** and then **Start**. Copy the invite link from the info icon (top left) or
Participants → Invite, and open it in a second browser window or on another device.

## Configuration

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | frontend | `http://localhost:8000` | Backend URL (WebSocket URL is derived from it) |
| `NEXT_PUBLIC_TURN_URL`, `_USERNAME`, `_CREDENTIAL` | frontend | none | Optional TURN server for very restrictive networks |
| `FRONTEND_URL` | backend | `http://localhost:3000` | Used to build invite links |
| `CORS_ORIGINS` | backend | `FRONTEND_URL` | Comma-separated origins allowed to call the API |
| `DATABASE_URL` | backend | `sqlite:///./zoom_clone.db` | SQLAlchemy database URL |
| `DEMO_PASSWORD` | backend | `zoomdemo123` | Password of the seeded demo account |
| `SESSION_DAYS` | backend | `30` | How long a sign-in lasts |

## Deployment

- **Backend on Render:** create a Blueprint from this repo (it reads `render.yaml`), or a Web Service with root
  directory `backend`, build command `pip install -r requirements.txt` and start command
  `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Set `FRONTEND_URL` to the Vercel URL.
- **Frontend on Vercel:** import the repo with root directory `frontend` and set `NEXT_PUBLIC_API_URL` to the
  Render URL.

Browsers only allow camera and microphone access on `https://` pages (or localhost), which both hosts provide.

## Architecture

```
 Browser A ──REST (create/join/schedule)──▶ FastAPI ──▶ SQLite
    │  ▲                                      ▲
    │  └──────── WebSocket /ws/meetings/{id} ─┤  presence, chat, reactions, host actions,
    │                                         │  and relays WebRTC offers/answers/ICE candidates
    │  ┌──────── WebSocket ───────────────────┘
    ▼  │
 Browser B ◀═══════ WebRTC audio/video (peer to peer) ═══════▶ Browser A
```

- The server never carries media. It stores meetings and participants, and relays the small signalling
  messages WebRTC needs to set up direct connections between browsers.
- Each participant connects directly to every other participant (a "mesh"). Whoever joins sends an offer to
  everyone already in the room, and those already there only answer. Since only one side offers, the two can
  never send offers at the same time. This works well for small meetings (about 2–6 people).
- Screen sharing swaps the outgoing video track (`RTCRtpSender.replaceTrack`), so no renegotiation is needed.

### Code layout

```
backend/app/
  main.py            app setup, CORS, startup (create tables + seed)
  config.py          environment settings
  db.py              engine, session, UTC datetime column type
  models.py          SQLAlchemy models (schema below)
  schemas.py         Pydantic request/response models
  deps.py            who is calling: reads the session token (required or optional)
  events.py          JSON messages sent over the WebSocket
  routers/           auth.py (sign up/in/out), meetings.py (REST), users.py, ws.py (WebSocket)
  services/          auth.py (passwords, sessions), meetings.py (business rules), rooms.py (open sockets)
  seed.py            sample data

frontend/src/
  app/               routes: / (home), /meetings, /signin, /signup, /join, /meeting/[code];
                     /j/[code] redirects to the meeting
  components/
    auth/            auth context (signed-in user), sign-in guard, sign-in/up page layout
    home/            action tiles, upcoming and recent meeting cards
    meetings/        join form/modal, schedule modal, meeting details
    room/            pre-join, meeting room, video grid/tile, control bar, chat, participants, end screen
    layout/, ui/     navbar, buttons, modal, avatar, icons
  hooks/             data fetching, local media, meeting room (WebSocket + WebRTC), screen share, …
  lib/               API client, types, formatting, storage, PeerMesh (WebRTC connections)
```

## Database schema

```
users 1 ──── * sessions          (user_id, cascade delete)
users 1 ──── * meetings          (host_id)
meetings 1 ── * participants     (meeting_id, cascade delete)
users 1 ──── * participants      (user_id, nullable: guests have no account)
meetings 1 ── * chat_messages    (meeting_id, cascade delete)
participants 1 ─ * chat_messages (participant_id)
```

| Table | Columns |
|---|---|
| `users` | `id` PK, `name`, `email` UNIQUE, `password_hash` (scrypt; null for seeded sample attendees), `avatar_color`, `timezone`, `created_at` |
| `sessions` | `id` PK, `user_id` FK→users indexed, `token_hash` UNIQUE + indexed (SHA-256 of the session token), `created_at`, `expires_at` |
| `meetings` | `id` PK, `code` UNIQUE + indexed (11-digit public ID), `host_key` (secret for host rights), `title`, `description`, `host_id` FK→users, `meeting_type` (`instant`/`scheduled`), `status` (`scheduled`/`live`/`ended`), `start_time` indexed, `duration_minutes`, `created_at`, `started_at`, `ended_at` |
| `participants` | `id` PK, `meeting_id` FK→meetings, `user_id` FK→users nullable, `display_name`, `role` (`host`/`attendee`), `is_muted`, `is_video_on`, `is_sharing_screen`, `is_removed`, `joined_at`, `left_at`; index on (`meeting_id`, `left_at`) for "who is in the meeting now" |
| `chat_messages` | `id` PK, `meeting_id` FK→meetings indexed, `participant_id` FK→participants, `body`, `sent_at` |

Design notes:

- **A participant row is one session**, not one person: each time someone joins, a new row is created with its
  own `joined_at`/`left_at`. That keeps a full attendance history, and "currently in the meeting" is simply
  `left_at IS NULL AND NOT is_removed`.
- **Guests do not need accounts**, so `participants.user_id` is nullable and `display_name` is stored on the row.
- **Meeting lifecycle:** `scheduled` → `live` (first join) → `ended` (host ends it, or the last person leaves).
  Rejoining an ended meeting makes it live again, as with a recurring Zoom meeting ID.
- **Upcoming** = scheduled meetings that are not ended and whose end time is in the future.
  **Recent** = ended meetings the user hosted or attended.
- **Times are stored as UTC.** SQLite has no time zones, so a custom column type stores naive UTC and returns
  timezone-aware values; the browser formats them in the user's local time zone.
- **Passwords and tokens are never stored as given:** passwords as salted scrypt hashes, session tokens as their
  SHA-256 hash, so a copy of the database cannot be used to sign in.
- Enums are stored as short strings, and SQLite foreign keys are switched on (`PRAGMA foreign_keys=ON`).

## API

Dashboard endpoints (create, schedule, upcoming, recent, delete, `/api/me`) need `Authorization: Bearer <token>`.
Looking up and joining a meeting work without it.

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create an account `{name, email, password}` → `{token, user}` |
| POST | `/api/auth/signin` | Sign in `{email, password}` → `{token, user}` |
| POST | `/api/auth/signout` | End this session |
| GET | `/api/me` | The signed-in user |
| POST | `/api/meetings/instant` | Create an instant meeting → includes `host_key` |
| POST | `/api/meetings` | Schedule a meeting `{title, description, start_time, duration_minutes}` |
| GET | `/api/meetings/upcoming` | Upcoming meetings of the user |
| GET | `/api/meetings/recent` | Recent (ended) meetings |
| GET | `/api/meetings/{code}` | Meeting details, 404 if the ID is not valid |
| DELETE | `/api/meetings/{code}` | Delete a meeting (its host only) |
| POST | `/api/meetings/{code}/join` | Join with `{display_name, host_key?, is_muted, is_video_on}` → participant |
| POST | `/api/meetings/{code}/end` | Host: end for everyone |
| POST | `/api/meetings/{code}/mute-all` | Host: mute everyone else |
| POST | `/api/meetings/{code}/participants/{id}/mute` | Host: mute one participant |
| POST | `/api/meetings/{code}/participants/{id}/make-host` | Host: hand the host role to this participant |
| POST | `/api/meetings/{code}/participants/{id}/remove` | Host: remove one participant |
| WS | `/ws/meetings/{code}?participant_id=…` | Live room channel (see `backend/app/routers/ws.py`) |

## Assumptions and limitations

- **Sign-in uses a bearer token**, not a cookie: the frontend and backend are on different domains (Vercel and
  Render), and browsers increasingly block cookies across sites. The token is kept in `localStorage`. There is no
  password reset or email verification.
- **Host rights** come from a random `host_key` returned only when the meeting is created (or listed on the
  owner's dashboard). The tab that starts the meeting keeps it in `sessionStorage`, so opening the invite link in
  another tab or browser joins as a normal attendee. Host-only endpoints check this key. **Make host** replaces the
  key and sends the new one only to the new host, so the previous host loses host rights.
- If the host's connection drops (rather than leaving through Leave Meeting), the meeting continues without a
  host until the owner starts it again from the dashboard.
- Rooms are tracked in memory, so the backend runs as a **single process**. Scaling out would need a shared
  pub/sub (for example Redis) for the WebSocket messages.
- The mesh design suits small meetings. Large meetings would need a media server (SFU).
- Only a public STUN server is configured. On networks that block direct connections, calls need a TURN server
  (supported through the `NEXT_PUBLIC_TURN_*` variables).
- On free hosting tiers the SQLite file is temporary: it is recreated and seeded again after a redeploy or
  restart. A persistent disk or a hosted database would fix that.
- Recording, waiting rooms and breakout rooms are not implemented.
