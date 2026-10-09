import { Suspense } from "react";

import { MeetingFlow } from "@/components/room/MeetingFlow";

export default function MeetingPage() {
  // MeetingFlow reads the URL (meeting code, ?name=…), which is only known in the browser.
  return (
    <Suspense fallback={<div className="min-h-dvh bg-room" />}>
      <MeetingFlow />
    </Suspense>
  );
}
