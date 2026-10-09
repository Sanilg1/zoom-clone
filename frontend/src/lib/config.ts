export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

// ws://… for http://…, wss://… for https://…
export const WS_URL = API_URL.replace(/^http/, "ws");

// Public STUN lets peers discover their public address. A TURN server is only needed on strict
// networks (corporate firewalls, some mobile carriers) and can be added through env variables.
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  ...(process.env.NEXT_PUBLIC_TURN_URL
    ? [
        {
          urls: process.env.NEXT_PUBLIC_TURN_URL,
          username: process.env.NEXT_PUBLIC_TURN_USERNAME,
          credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
        },
      ]
    : []),
];

// Public demo account seeded by the backend (backend/app/config.py), so reviewers can sign in quickly.
export const DEMO_ACCOUNT = { email: "sanil@zoomclone.dev", password: "zoomdemo123" };
