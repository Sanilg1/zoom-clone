"use client";

import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { HostedMeeting, Meeting } from "@/lib/types";

/** Upcoming and recent meetings for the dashboard, with a `reload` for after changes. */
export function useDashboardMeetings() {
  const [upcoming, setUpcoming] = useState<HostedMeeting[]>([]);
  const [recent, setRecent] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(
    () =>
      Promise.all([api.upcomingMeetings(), api.recentMeetings()]).then(
        ([upcomingMeetings, recentMeetings]) => {
          setUpcoming(upcomingMeetings);
          setRecent(recentMeetings);
          setError(null);
          setLoading(false);
        },
        (err: Error) => {
          setError(err.message);
          setLoading(false);
        },
      ),
    [],
  );

  useEffect(() => {
    reload();
  }, [reload]);

  return { upcoming, recent, loading, error, reload };
}
