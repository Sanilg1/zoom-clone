"use client";

import { Mic, MicOff, Video, VideoOff } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { SidePanel } from "./SidePanel";

export interface PanelParticipant {
  id: number;
  name: string;
  isSelf: boolean;
  isHost: boolean;
  micOn: boolean;
  videoOn: boolean;
}

interface ParticipantsPanelProps {
  participants: PanelParticipant[];
  canModerate: boolean;
  onClose: () => void;
  onInvite: () => void;
  onMute: (id: number) => void;
  onRemove: (id: number) => void;
  onMuteAll: () => void;
}

export function ParticipantsPanel({
  participants,
  canModerate,
  onClose,
  onInvite,
  onMute,
  onRemove,
  onMuteAll,
}: ParticipantsPanelProps) {
  return (
    <SidePanel
      title={`Participants (${participants.length})`}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onInvite} className="rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:bg-room-hover">
            Invite
          </button>
          {canModerate && (
            <button onClick={onMuteAll} className="rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:bg-room-hover">
              Mute All
            </button>
          )}
        </div>
      }
    >
      <ul className="py-1">
        {participants.map((p) => {
          const tags = [p.isHost && "Host", p.isSelf && "me"].filter(Boolean).join(", ");
          const moderatable = canModerate && !p.isSelf && !p.isHost;
          return (
            <li key={p.id} className="group flex items-center gap-2.5 px-4 py-2 hover:bg-room-hover">
              <Avatar name={p.name} size={30} color="#4a4a4a" />
              <span className="min-w-0 flex-1 truncate text-sm">
                {p.name}
                {tags && <span className="text-white/50"> ({tags})</span>}
              </span>

              {moderatable && (
                <span className="hidden gap-1 group-hover:flex">
                  {p.micOn && (
                    <button onClick={() => onMute(p.id)} className="rounded bg-zoom-blue px-2 py-0.5 text-xs font-bold">
                      Mute
                    </button>
                  )}
                  <button onClick={() => onRemove(p.id)} className="rounded bg-room-panel px-2 py-0.5 text-xs font-bold ring-1 ring-white/20">
                    Remove
                  </button>
                </span>
              )}
              <span className={`flex gap-2 ${moderatable ? "group-hover:hidden" : ""}`}>
                {p.micOn ? <Mic size={16} /> : <MicOff size={16} className="text-zoom-red" />}
                {p.videoOn ? <Video size={16} /> : <VideoOff size={16} className="text-zoom-red" />}
              </span>
            </li>
          );
        })}
      </ul>
    </SidePanel>
  );
}
