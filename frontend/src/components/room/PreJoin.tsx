"use client";

import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { ZoomLogo } from "@/components/ui/icons";
import type { LocalMedia } from "@/hooks/useLocalMedia";
import { formatMeetingCode } from "@/lib/format";
import type { Meeting } from "@/lib/types";
import { VideoTile } from "./VideoTile";

interface PreJoinProps {
  meeting: Meeting;
  media: LocalMedia;
  defaultName: string;
  isHost: boolean;
  onJoin: (name: string) => Promise<void>;
}

/** Camera preview + name entry shown before entering the meeting. */
export function PreJoin({ meeting, media, defaultName, isHost, onJoin }: PreJoinProps) {
  const [typedName, setTypedName] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = typedName ?? defaultName;
  // Wait until the browser has answered the camera/mic permission prompt.
  const mediaReady = media.ready;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError("Please enter your name");
    setJoining(true);
    setError(null);
    try {
      await onJoin(name.trim());
    } catch (err) {
      setError((err as Error).message);
      setJoining(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-room text-white">
      <header className="flex h-14 items-center px-4 sm:px-6">
        <Link href="/" aria-label="Back to home">
          <ZoomLogo className="text-white!" />
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-8 p-4 sm:p-6 lg:grid-cols-[1fr_340px]">
        <div>
          <VideoTile
            tile={{
              id: 0,
              name: name || "You",
              stream: media.stream,
              isSelf: true,
              isHost,
              micOn: media.audioOn,
              videoOn: media.videoOn,
              reactions: [],
            }}
            className="aspect-video w-full"
          />
          <div className="mt-4 flex justify-center gap-3">
            <RoundToggle
              on={media.audioOn}
              disabled={!media.hasAudio}
              onClick={() => media.setAudioOn(!media.audioOn)}
              label={media.audioOn ? "Mute" : "Unmute"}
              icon={media.audioOn ? <Mic size={20} /> : <MicOff size={20} />}
            />
            <RoundToggle
              on={media.videoOn}
              disabled={!media.canUseVideo}
              onClick={() => void media.setVideoOn(!media.videoOn)}
              label={media.videoOn ? "Stop Video" : "Start Video"}
              icon={media.videoOn ? <Video size={20} /> : <VideoOff size={20} />}
            />
          </div>
          {media.error && <p className="mt-3 text-center text-sm text-[#ff8a8a]">{media.error}</p>}
          {media.warning && <p className="mt-3 text-center text-sm text-[#ffc46b]">{media.warning}</p>}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl bg-room-panel p-6">
          <div>
            <h1 className="text-xl font-bold">{meeting.title}</h1>
            <p className="mt-1 text-sm text-white/60">Meeting ID: {formatMeetingCode(meeting.code)}</p>
            {meeting.status === "live" && <p className="mt-1 text-sm text-zoom-green">Meeting in progress</p>}
          </div>
          <label className="flex flex-col gap-1.5 text-sm">
            Your name
            <input
              value={name}
              onChange={(e) => setTypedName(e.target.value)}
              maxLength={100}
              autoFocus
              className="h-10 rounded-lg border border-white/20 bg-transparent px-3 text-white outline-none focus:border-zoom-blue"
            />
          </label>
          {error && <p className="text-sm text-[#ff8a8a]">{error}</p>}
          <Button type="submit" disabled={!mediaReady || joining} className="h-10">
            {!mediaReady ? "Waiting for camera…" : joining ? "Joining…" : isHost ? "Start" : "Join"}
          </Button>
        </form>
      </main>
    </div>
  );
}

interface RoundToggleProps {
  on: boolean;
  disabled: boolean;
  onClick: () => void;
  label: string;
  icon: ReactNode;
}

function RoundToggle({ on, disabled, onClick, label, icon }: RoundToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
        on ? "bg-room-hover hover:bg-[#4a4a4a]" : "bg-zoom-red hover:bg-[#c51f1f]"
      }`}
    >
      {icon}
    </button>
  );
}
