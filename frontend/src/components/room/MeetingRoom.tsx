"use client";

import { Info, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useDismiss } from "@/hooks/useDismiss";
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
import { RemoteAudio } from "./RemoteAudio";
import { SettingsPanel } from "./SettingsPanel";
import { VideoGrid, type RoomView } from "./VideoGrid";
import { ViewMenu } from "./ViewMenu";
import type { TileData } from "./VideoTile";

interface MeetingRoomProps {
  meeting: Meeting;
  self: Participant;
  hostKey: string | null;
  media: LocalMedia;
  onHostKey: (hostKey: string | null) => void;
  onExit: (reason: ExitReason) => void;
}

type Panel = "participants" | "chat" | "settings" | null;

function elapsed(since: string | null, now: Date | null): string {
  if (!since || !now) return "";
  const total = Math.max(0, Math.floor((now.getTime() - new Date(since).getTime()) / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

export function MeetingRoom({ meeting, self: joinedAs, hostKey, media, onHostKey, onExit }: MeetingRoomProps) {
  const { setAudioOn } = media;
  const [toast, showToast] = useToast();
  const [panel, setPanel] = useState<Panel>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);
  useDismiss(infoRef, infoOpen, () => setInfoOpen(false));
  const [seenMessages, setSeenMessages] = useState(0);
  const now = useNow();

  const onMutedByHost = useCallback(() => {
    setAudioOn(false);
    showToast("The host has muted you");
  }, [setAudioOn, showToast]);

  const handleHostKey = useCallback(
    (key: string | null) => {
      onHostKey(key);
      if (key) showToast("You are now the host");
    },
    [onHostKey, showToast],
  );

  const room = useMeetingRoom({
    code: meeting.code,
    self: joinedAs,
    localStream: media.stream,
    onMutedByHost,
    onHostKey: handleHostKey,
    onExit,
  });
  const self = room.self; // kept up to date by the server (e.g. role after a host handover)
  const isHost = self.role === "host";
  const screen = useScreenShare(room.setOutgoingVideo);
  const sharing = screen.screenStream !== null;

  // Send the camera to everyone (or nothing while it is off). Screen sharing takes over the
  // outgoing video while it runs; when it stops, this puts the camera back.
  // Same for the microphone (it changes when another one is picked in Audio & video settings).
  const { setOutgoingAudio } = room;
  useEffect(() => {
    void setOutgoingAudio(media.audioTrack);
  }, [media.audioTrack, setOutgoingAudio]);

  const [view, setView] = useState<RoomView>("gallery");
  // Last remote participant heard speaking: the big tile in Speaker view.
  const [activeSpeakerId, setActiveSpeakerId] = useState<number | null>(null);

  const { setOutgoingVideo } = room;
  useEffect(() => {
    if (!sharing) void setOutgoingVideo(media.videoTrack);
  }, [media.videoTrack, sharing, setOutgoingVideo]);

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

  function openSettings() {
    if (panel === "chat") setSeenMessages(messagesFromOthers);
    setPanel("settings");
  }

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

  /** Runs a host-only API call with our host key; returns whether it succeeded. */
  async function hostAction(action: (key: string) => Promise<void>, success?: string): Promise<boolean> {
    if (!hostKey) return false;
    try {
      await action(hostKey);
      if (success) showToast(success);
      return true;
    } catch (err) {
      showToast((err as Error).message);
      return false;
    }
  }

  const nameOf = (id: number) => room.peers.find((p) => p.participant.id === id)?.participant.display_name ?? "They";

  function makeHost(id: number) {
    return hostAction((key) => api.makeHost(meeting.code, id, key), `${nameOf(id)} is now the host`);
  }

  async function assignHostAndLeave(id: number) {
    if (await makeHost(id)) room.leave();
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
      {/* 2026 layout: title on the left; meeting details and View in the upper right. */}
      <header className="relative flex h-10 shrink-0 items-center justify-between gap-2 px-3">
        <div className="flex min-w-0 items-center gap-2 text-xs text-white/70">
          <ShieldCheck size={16} className="shrink-0 text-zoom-green" aria-label="Encrypted" />
          <span className="truncate">{meeting.title}</span>
          <span className="shrink-0 tabular-nums">{elapsed(meeting.started_at, now)}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <div ref={infoRef} className="relative">
            <button
              onClick={() => setInfoOpen((open) => !open)}
              className={`rounded-md p-1.5 text-white/80 hover:bg-room-hover ${infoOpen ? "bg-room-hover" : ""}`}
              aria-label="Meeting information"
              aria-expanded={infoOpen}
            >
              <Info size={17} />
            </button>
            {infoOpen && <MeetingInfo meeting={meeting} participantId={self.id} />}
          </div>
          <ViewMenu view={view} onChange={setView} />
        </div>
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
        <main className="min-w-0 flex-1">
          <VideoGrid
            tiles={tiles}
            presenter={presenter}
            view={view}
            activeSpeakerId={activeSpeakerId}
            onSpeaking={setActiveSpeakerId}
          />
          {room.peers.map(({ participant, stream }) => (
            <RemoteAudio key={participant.id} stream={stream} />
          ))}
        </main>

        {panel === "participants" && (
          <ParticipantsPanel
            participants={panelParticipants}
            canModerate={isHost && hostKey !== null}
            onClose={() => setPanel(null)}
            onInvite={copyInvite}
            onMute={(id) => hostAction((key) => api.muteParticipant(meeting.code, id, key))}
            onMakeHost={makeHost}
            onRemove={(id) => hostAction((key) => api.removeParticipant(meeting.code, id, key))}
            onMuteAll={() => hostAction((key) => api.muteAll(meeting.code, key), "All participants have been muted")}
          />
        )}
        {panel === "settings" && <SettingsPanel media={media} onClose={() => setPanel(null)} />}
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
        canUseVideo={media.canUseVideo}
        micStream={media.stream}
        sharing={sharing}
        participantCount={tiles.length}
        unreadMessages={unread}
        activePanel={panel}
        isHost={isHost}
        onToggleMic={() => media.setAudioOn(!media.audioOn)}
        onToggleVideo={() => void media.setVideoOn(!media.videoOn)}
        onToggleShare={toggleShare}
        onTogglePanel={togglePanel}
        onReaction={room.sendReaction}
        onLeave={room.leave}
        others={room.peers.map(({ participant: p }) => ({ id: p.id, name: p.display_name }))}
        onAssignHostAndLeave={assignHostAndLeave}
        onEndForAll={() => hostAction((key) => api.endMeeting(meeting.code, key))}
        onOpenSettings={openSettings}
        view={view}
        onToggleView={() => setView((v) => (v === "gallery" ? "speaker" : "gallery"))}
        onInvite={copyInvite}
        onShowInfo={() => setInfoOpen(true)}
      />
    </div>
  );
}
