"use client";

import { CalendarDays, MonitorUp, Plus, Video } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ActionTile } from "@/components/home/ActionTile";
import { Greeting } from "@/components/home/Greeting";
import { RecentMeetings } from "@/components/home/RecentMeetings";
import { UpcomingMeetings } from "@/components/home/UpcomingMeetings";
import { AppHeader } from "@/components/layout/AppHeader";
import { MeetingDialogs, type MeetingDialog } from "@/components/meetings/MeetingDialogs";
import { useDashboardMeetings } from "@/hooks/useDashboardMeetings";
import { useResetOnHide } from "@/hooks/useResetOnHide";
import { useStartMeeting } from "@/hooks/useStartMeeting";

export default function HomePage() {
  return (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  );
}

/** Home, laid out like Zoom's 2026 web home: greeting, quick shortcuts, upcoming and recent meetings. */
function Dashboard() {
  const { user } = useAuth();
  const { upcoming, recent, loading, error, reload } = useDashboardMeetings();
  const { startInstantMeeting, enterAsHost, starting, error: startError } = useStartMeeting();
  const [dialog, setDialog] = useState<MeetingDialog>(null);
  useResetOnHide(() => setDialog(null));

  const bannerError = startError ?? error;

  return (
    <>
      <AppHeader
        onNewMeeting={startInstantMeeting}
        onJoin={() => setDialog("join")}
        onSchedule={() => setDialog("schedule")}
      />

      <main className="mx-auto flex max-w-[1100px] flex-col gap-7 px-4 py-8 sm:px-6 lg:py-10">
        <Greeting name={user?.name} />

        {bannerError && (
          <p className="rounded-lg border border-zoom-red/30 bg-zoom-red/5 px-4 py-3 text-sm text-zoom-red">{bannerError}</p>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <ActionTile label="New meeting" icon={Video} color="orange" filled onClick={startInstantMeeting} disabled={starting} />
          <ActionTile label="Join" icon={Plus} color="blue" onClick={() => setDialog("join")} />
          <ActionTile label="Schedule" icon={CalendarDays} color="blue" onClick={() => setDialog("schedule")} />
          <ActionTile label="Share screen" icon={MonitorUp} color="blue" onClick={() => setDialog("share")} />
        </div>

        {/* minmax(0, …) lets the cards shrink on phones instead of being widened by long titles. */}
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <UpcomingMeetings
            meetings={upcoming}
            loading={loading}
            onStart={enterAsHost}
            onSchedule={() => setDialog("schedule")}
          />
          <RecentMeetings meetings={recent} loading={loading} />
        </div>
      </main>

      <MeetingDialogs dialog={dialog} userName={user?.name} onClose={() => setDialog(null)} onScheduled={reload} />
    </>
  );
}
