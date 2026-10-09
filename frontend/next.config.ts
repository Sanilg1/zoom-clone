import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Strict Mode mounts every component twice in development. In the meeting room that would open
  // a WebSocket, close it (which the server treats as "participant left") and open another, so it
  // is turned off.
  reactStrictMode: false,
  async redirects() {
    // Invite links look like /j/84512345678, the same shape as Zoom's.
    return [{ source: "/j/:code", destination: "/meeting/:code", permanent: false }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
