"use client";

import { ChevronDown, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useRef, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { useDismiss } from "@/hooks/useDismiss";
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
  onMakeHost: (id: number) => void;
  onRemove: (id: number) => void;
  onMuteAll: () => void;
}

export function ParticipantsPanel({ participants, canModerate, onClose, onInvite, onMuteAll, ...actions }: ParticipantsPanelProps) {
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
        {participants.map((p) => (
          <ParticipantRow key={p.id} participant={p} canModerate={canModerate && !p.isSelf && !p.isHost} {...actions} />
        ))}
      </ul>
    </SidePanel>
  );
}

interface RowProps {
  participant: PanelParticipant;
  canModerate: boolean;
  onMute: (id: number) => void;
  onMakeHost: (id: number) => void;
  onRemove: (id: number) => void;
}

function ParticipantRow({ participant: p, canModerate, onMute, onMakeHost, onRemove }: RowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const rowRef = useRef<HTMLLIElement>(null);
  useDismiss(rowRef, menuOpen, () => setMenuOpen(false));

  const tags = [p.isHost && "Host", p.isSelf && "me"].filter(Boolean).join(", ");
  const choose = (action: (id: number) => void) => {
    setMenuOpen(false);
    action(p.id);
  };

  return (
    <li ref={rowRef} className="group relative flex items-center gap-2.5 px-4 py-2 hover:bg-room-hover">
      <Avatar name={p.name} size={30} color="#4a4a4a" />
      <span className="min-w-0 flex-1 truncate text-sm">
        {p.name}
        {tags && <span className="text-white/50"> ({tags})</span>}
      </span>

      {canModerate && (
        // Shown on hover with a mouse, like Zoom; always shown on touch screens (no hover there),
        // and kept visible while the More menu is open.
        <span className={`gap-1 ${menuOpen ? "flex" : "hidden group-hover:flex [@media(hover:none)]:flex"}`}>
          {p.micOn && (
            <button onClick={() => onMute(p.id)} className="rounded bg-zoom-blue px-2 py-0.5 text-xs font-bold">
              Mute
            </button>
          )}
          <button
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            className="flex items-center gap-0.5 rounded bg-room-panel px-2 py-0.5 text-xs font-bold ring-1 ring-white/20"
          >
            More <ChevronDown size={12} />
          </button>
        </span>
      )}
      <span className={`flex gap-2 ${canModerate ? (menuOpen ? "hidden" : "group-hover:hidden [@media(hover:none)]:hidden") : ""}`}>
        {p.micOn ? <Mic size={16} /> : <MicOff size={16} className="text-zoom-red" />}
        {p.videoOn ? <Video size={16} /> : <VideoOff size={16} className="text-zoom-red" />}
      </span>

      {menuOpen && (
        <div role="menu" className="absolute right-4 top-full z-10 w-36 overflow-hidden rounded-lg border border-white/10 bg-room shadow-xl">
          <button role="menuitem" onClick={() => choose(onMakeHost)} className="block w-full px-3 py-2 text-left text-sm hover:bg-room-hover">
            Make host
          </button>
          <button role="menuitem" onClick={() => choose(onRemove)} className="block w-full px-3 py-2 text-left text-sm text-[#ff8a8a] hover:bg-room-hover">
            Remove
          </button>
        </div>
      )}
    </li>
  );
}
