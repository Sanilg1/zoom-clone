"use client";

import { Info, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { LocalMedia } from "@/hooks/useLocalMedia";
import { useMeetingRoom, type ExitReason } from "@/hooks/useMeetingRoom";
import { useNow } from "@/hooks/useNow";
import { useScreenShare } from "@/hooks/useScreenShare";
import { useToast } from "@/hooks/useToast";
import { api } from "@/lib/api";
import type { Meeting, Participant } from "@/lib/types";
import { ChatPanel } from "./ChatPanel";
import { ControlBar } from "./ControlBar";
import { MeetingInfo } from "./MeetingInfo";
import { ParticipantsPanel, type PanelParticipant } from "./ParticipantsPanel";
import { VideoGrid } from "./VideoGrid";
import type { TileData } from "./VideoTile";

interface MeetingRoomProps {
  meeting: Meeting;
  self: Participant;
  hostKey: string | null;
  media: LocalMedia;
  onExit: (reason: ExitReason) => void;
}

type Panel = "participants" | "chat" | null;

function elapsed(since: string | null, now: Date | null): string {
  if (!since || !now) return "";
  const total = Math.max(0, Math.floor((now.getTime() - new Date(since).getTime()) / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

export function MeetingRoom({ meeting, self, hostKey, media, onExit }: MeetingRoomProps) {
  const isHost = self.role === "host";
  const { setAudioOn } = media;
  const [toast, showToast] = useToast();
  const [panel, setPanel] = useState<Panel>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [seenMessages, setSeenMessages] = useState(0);
  const now = useNow();

  const onMutedByHost = useCallback(() => {
    setAudioOn(false);
    showToast("The host has muted you");
  }, [setAudioOn, showToast]);

  const room = useMeetingRoom({ code: meeting.code, self, localStream: media.stream, onMutedByHost, onExit });
  const cameraTrack = media.stream?.getVideoTracks()[0] ?? null;
  const screen = useScreenShare(room.setOutgoingVideo, cameraTrack);
  const sharing = screen.screenStream !== null;

  // Tell everyone else when our mic, camera or screen share changes.
  const { sendMediaState, connected } = room;
  useEffect(() => {
    if (connected) {
      sendMediaState({ is_muted: !media.audioOn, is_video_on: media.videoOn, is_sharing_screen: sharing });
    }
  }, [connected, sendMediaState, media.audioOn, media.videoOn, sharing]);

  // ---------- derived view data ----------

  const reactionsFor = (id: number) => room.reactions.filter((r) => r.participantId === id).map((r) => r.emoji);

  const selfTile: TileData = {
    id: self.id,
    name: self.display_name,
    stream: media.stream,
    isSelf: true,
    isHost,
    micOn: media.audioOn,
    videoOn: media.videoOn,
    reactions: reactionsFor(self.id),
  };
  const peerTiles: TileData[] = room.peers.map(({ participant, stream }) => ({
    id: participant.id,
    name: participant.display_name,
    stream,
    isSelf: false,
    isHost: participant.role === "host",
    micOn: !participant.is_muted,
    // While sharing, their outgoing video is the screen, shown on the big stage instead.
    videoOn: participant.is_video_on && !participant.is_sharing_screen,
    reactions: reactionsFor(participant.id),
  }));
  const tiles = [selfTile, ...peerTiles];

  const remotePresenter = room.peers.find((p) => p.participant.is_sharing_screen);
  const presenter = sharing
    ? { tile: selfTile, stream: screen.screenStream }
    : remotePresenter
      ? { tile: peerTiles.find((t) => t.id === remotePresenter.participant.id)!, stream: remotePresenter.stream }
      : null;

  const panelParticipants: PanelParticipant[] = [
    { id: self.id, name: self.display_name, isSelf: true, isHost, micOn: media.audioOn, videoOn: media.videoOn },
    ...room.peers.map(({ participant: p }) => ({
      id: p.id,
      name: p.display_name,
      isSelf: false,
      isHost: p.role === "host",
      micOn: !p.is_muted,
      videoOn: p.is_video_on,
    })),
  ];

  const messagesFromOthers = room.messages.filter((m) => m.participant_id !== self.id).length;
  const unread = panel === "chat" ? 0 : messagesFromOthers - seenMessages;

  // ---------- actions ----------

  function togglePanel(next: "participants" | "chat") {
    if (panel === "chat") setSeenMessages(messagesFromOthers);
    setPanel((current) => (current === next ? null : next));
  }

  async function toggleShare() {
    if (sharing) return screen.stop();
    if (remotePresenter) return showToast(`${remotePresenter.participant.display_name} is already sharing`);
    try {
      await screen.start();
    } catch (err) {
      if ((err as Error).name !== "NotAllowedError") showToast((err as Error).message);
    }
  }

  async function hostAction(action: (key: string) => Promise<void>, success?: string) {
    if (!hostKey) return;
    try {
      await action(hostKey);
      if (success) showToast(success);
    } catch (err) {
      showToast((err as Error).message);
    }
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(meeting.invite_url);
      showToast("Invite link copied to clipboard");
    } catch {
      window.prompt("Copy the invite link:", meeting.invite_url);
    }
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-room text-white">
      <header className="relative flex h-10 shrink-0 items-center justify-between px-2">
        <button
          onClick={() => setInfoOpen((open) => !open)}
          className="flex items-center gap-1 rounded p-1.5 text-zoom-green hover:bg-room-hover"
          aria-label="Meeting information"
        >
          <ShieldCheck size={18} />
          <Info size={16} className="text-white/80" />
        </button>
        {infoOpen && <MeetingInfo meeting={meeting} participantId={self.id} />}
        <p className="truncate px-2 text-xs text-white/70">{meeting.title}</p>
        <p className="px-2 text-xs tabular-nums text-white/70">{elapsed(meeting.started_at, now)}</p>
      </header>

      {media.warning && (
        <p className="shrink-0 bg-[#5c4410] py-1.5 text-center text-xs font-bold text-[#ffd98a] sm:text-sm">
          {media.warning}
        </p>
      )}

      {sharing && (
        <div className="flex shrink-0 items-center justify-center gap-3 bg-[#1f7a3c] py-1.5 text-xs font-bold sm:text-sm">
          You are screen sharing
          <button onClick={screen.stop} className="rounded bg-zoom-red px-2.5 py-0.5 hover:bg-[#c51f1f]">
            Stop Share
          </button>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1">
        <main className="min-w-0 flex-1" onClick={() => setInfoOpen(false)}>
          <VideoGrid tiles={tiles} presenter={presenter} />
        </main>

        {panel === "participants" && (
          <ParticipantsPanel
            participants={panelParticipants}
            canModerate={isHost && hostKey !== null}
            onClose={() => setPanel(null)}
            onInvite={copyInvite}
            onMute={(id) => hostAction((key) => api.muteParticipant(meeting.code, id, key))}
            onRemove={(id) => hostAction((key) => api.removeParticipant(meeting.code, id, key))}
            onMuteAll={() => hostAction((key) => api.muteAll(meeting.code, key), "All participants have been muted")}
          />
        )}
        {panel === "chat" && (
          <ChatPanel
            messages={room.messages}
            selfId={self.id}
            onSend={room.sendChat}
            onClose={() => {
              setSeenMessages(messagesFromOthers);
              setPanel(null);
            }}
          />
        )}

        {toast && (
          <div className="pointer-events-none absolute left-1/2 top-3 z-40 -translate-x-1/2 rounded-lg bg-black/80 px-4 py-2 text-sm shadow-lg">
            {toast}
          </div>
        )}
      </div>

      <ControlBar
        micOn={media.audioOn}
        videoOn={media.videoOn}
        canUseMic={media.hasAudio}
        canUseVideo={media.hasVideo}
        sharing={sharing}
        participantCount={tiles.length}
        unreadMessages={unread}
        activePanel={panel}
        isHost={isHost}
        onToggleMic={() => media.setAudioOn(!media.audioOn)}
        onToggleVideo={() => media.setVideoOn(!media.videoOn)}
        onToggleShare={toggleShare}
        onTogglePanel={togglePanel}
        onReaction={room.sendReaction}
        onLeave={room.leave}
        onEndForAll={() => hostAction((key) => api.endMeeting(meeting.code, key))}
      />
    </div>
  );
}
