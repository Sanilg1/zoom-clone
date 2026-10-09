"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { User } from "@/lib/types";

/** The logged-in user. The app has no login, so this is always the seeded default user. */
export function useCurrentUser(): User | null {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    api.me().then(setUser).catch(() => setUser(null));
  }, []);

  return user;
}
