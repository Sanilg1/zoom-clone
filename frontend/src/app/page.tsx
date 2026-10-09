"use client";

import { CalendarDays, MonitorUp, Plus, Video } from "lucide-react";
import { useState } from "react";

import { ActionTile } from "@/components/home/ActionTile";
import { RecentMeetings } from "@/components/home/RecentMeetings";
import { UpcomingMeetings } from "@/components/home/UpcomingMeetings";
import { Navbar } from "@/components/layout/Navbar";
import { JoinMeetingModal } from "@/components/meetings/JoinMeetingModal";
import { ScheduleMeetingModal } from "@/components/meetings/ScheduleMeetingModal";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDashboardMeetings } from "@/hooks/useDashboardMeetings";
import { useResetOnHide } from "@/hooks/useResetOnHide";
import { useStartMeeting } from "@/hooks/useStartMeeting";

type Dialog = "join" | "share" | "schedule" | null;

export default function HomePage() {
  const user = useCurrentUser();
  const { upcoming, recent, loading, error, reload } = useDashboardMeetings();
  const { startInstantMeeting, enterAsHost, starting, error: startError } = useStartMeeting();
  const [dialog, setDialog] = useState<Dialog>(null);
  useResetOnHide(() => setDialog(null));

  const closeDialog = () => setDialog(null);
  const bannerError = startError ?? error;

  return (
    <>
      <Navbar user={user} />

      <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 lg:py-14">
        {bannerError && (
          <p className="mb-6 rounded-lg border border-zoom-red/30 bg-zoom-red/5 px-4 py-3 text-sm text-zoom-red">
            {bannerError}
          </p>
        )}

        {/* Phones: tiles, upcoming, recent. Desktop: tiles above recent on the left, upcoming on the right. */}
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_440px] lg:gap-x-12 lg:gap-y-10">
          <div className="lg:col-start-1 lg:row-start-1">
            <div className="mx-auto grid w-full max-w-[360px] grid-cols-2 gap-x-6 gap-y-8 pt-2 lg:mt-6">
              <ActionTile
                label="New meeting"
                icon={Video}
                color="orange"
                filled
                onClick={startInstantMeeting}
                disabled={starting}
              />
              <ActionTile label="Join" icon={Plus} color="blue" onClick={() => setDialog("join")} />
              <ActionTile label="Schedule" icon={CalendarDays} color="blue" onClick={() => setDialog("schedule")} />
              <ActionTile label="Share screen" icon={MonitorUp} color="blue" onClick={() => setDialog("share")} />
            </div>
          </div>

          <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <UpcomingMeetings meetings={upcoming} loading={loading} onStart={enterAsHost} />
          </div>

          <div className="lg:col-start-1 lg:row-start-2">
            <RecentMeetings meetings={recent} loading={loading} />
          </div>
        </div>
      </main>

      {(dialog === "join" || dialog === "share") && (
        <JoinMeetingModal
          title={dialog === "share" ? "Share screen" : "Join meeting"}
          defaultName={user?.name}
          onClose={closeDialog}
        />
      )}
      {dialog === "schedule" && (
        <ScheduleMeetingModal hostName={user?.name ?? "My"} onClose={closeDialog} onScheduled={reload} />
      )}
    </>
  );
}
