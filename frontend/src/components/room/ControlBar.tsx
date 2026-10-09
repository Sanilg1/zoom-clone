"use client";

import {
  ChevronUp,
  Ellipsis,
  Info,
  LayoutGrid,
  MessageSquare,
  MicOff,
  MonitorUp,
  SlidersHorizontal,
  UserPlus,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

import { MicLevelIcon, ReactionsIcon } from "@/components/ui/icons";
import { useAudioLevel } from "@/hooks/useAudioLevel";
import { useDismiss } from "@/hooks/useDismiss";
import type { RoomView } from "./VideoGrid";

export const REACTIONS = ["👏", "👍", "❤️", "😂", "😮", "🎉"];

interface ControlBarProps {
  micOn: boolean;
  videoOn: boolean;
  canUseMic: boolean;
  canUseVideo: boolean;
  /** Our own mic stream, for the level animation on the Mute button. */
  micStream: MediaStream | null;
  sharing: boolean;
  participantCount: number;
  unreadMessages: number;
  activePanel: "participants" | "chat" | "settings" | null;
  isHost: boolean;
  /** Everyone else in the meeting (the host picks a new host from this list when leaving). */
  others: { id: number; name: string }[];
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onToggleShare: () => void;
  onTogglePanel: (panel: "participants" | "chat") => void;
  onReaction: (emoji: string) => void;
  onLeave: () => void;
  onAssignHostAndLeave: (participantId: number) => void;
  onEndForAll: () => void;
  /** Opens the right-hand Audio & video panel (the ^ next to Mute / Video). */
  onOpenSettings: () => void;
  view: RoomView;
  onToggleView: () => void;
  onInvite: () => void;
  onShowInfo: () => void;
}

type Menu = "reactions" | "more" | "leave" | "assign" | null;

/** The toolbar along the bottom of the meeting, laid out like Zoom's. */
export function ControlBar(props: ControlBarProps) {
  const [menu, setMenu] = useState<Menu>(null);
  const toggleMenu = (name: "reactions" | "more" | "leave") => setMenu((current) => (current === name ? null : name));
  const close = () => setMenu(null);

  // Each popup closes when you click anywhere outside it (or its button), or press Escape.
  const reactionsRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const leaveRef = useRef<HTMLDivElement>(null);
  useDismiss(reactionsRef, menu === "reactions", close);
  useDismiss(moreRef, menu === "more", close);
  useDismiss(leaveRef, menu === "leave" || menu === "assign", close);

  function handleLeave() {
    // Like Zoom: a host leaving while others stay picks who takes over.
    if (props.isHost && props.others.length > 0) setMenu("assign");
    else props.onLeave();
  }

  return (
    <footer className="relative z-20 flex h-[68px] shrink-0 items-center justify-between gap-1 bg-room px-2 text-white sm:px-4">
      <div className="flex">
        <div className="flex items-start">
          <ToolButton
            label={props.micOn ? "Mute" : "Unmute"}
            onClick={props.onToggleMic}
            disabled={!props.canUseMic}
            icon={props.micOn ? <LiveMicIcon stream={props.micStream} /> : <MicOff size={22} className="text-zoom-red" />}
          />
          <CaretButton label="Audio settings" onClick={props.onOpenSettings} />
        </div>
        <div className="flex items-start">
          <ToolButton
            label={props.videoOn ? "Stop Video" : "Start Video"}
            onClick={props.onToggleVideo}
            disabled={!props.canUseVideo}
            icon={props.videoOn ? <Video size={22} /> : <VideoOff size={22} className="text-zoom-red" />}
          />
          <CaretButton label="Video settings" onClick={props.onOpenSettings} />
        </div>
      </div>

      <div className="flex">
        <ToolButton
          label="Participants"
          active={props.activePanel === "participants"}
          onClick={() => props.onTogglePanel("participants")}
          icon={
            <span className="relative">
              <Users size={22} />
              <span className="absolute -right-3 -top-1 text-[10px] font-bold">{props.participantCount}</span>
            </span>
          }
        />
        <ToolButton
          label="Chat"
          active={props.activePanel === "chat"}
          onClick={() => props.onTogglePanel("chat")}
          icon={
            <span className="relative">
              <MessageSquare size={22} />
              {props.unreadMessages > 0 && (
                <span className="absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-zoom-red px-1 text-[10px] font-bold leading-4">
                  {props.unreadMessages}
                </span>
              )}
            </span>
          }
        />
        <ToolButton
          label={props.sharing ? "Stop Share" : "Share Screen"}
          onClick={props.onToggleShare}
          icon={<MonitorUp size={22} className={props.sharing ? "text-zoom-red" : "text-zoom-green"} />}
          className="hidden sm:flex"
        />
        <div className="relative" ref={reactionsRef}>
          <ToolButton
            label="Reactions"
            active={menu === "reactions"}
            onClick={() => toggleMenu("reactions")}
            icon={<ReactionsIcon size={22} />}
          />
          {menu === "reactions" && (
            <Popover className="left-1/2 -translate-x-1/2">
              <div className="flex gap-1 p-1">
                {REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      props.onReaction(emoji);
                      close();
                    }}
                    className="rounded-lg p-1.5 text-2xl hover:bg-room-hover"
                    aria-label={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </Popover>
          )}
        </div>
        <div className="relative" ref={moreRef}>
          <ToolButton label="More" active={menu === "more"} onClick={() => toggleMenu("more")} icon={<Ellipsis size={22} />} />
          {menu === "more" && (
            <Popover className="right-0 w-60 sm:left-1/2 sm:right-auto sm:-translate-x-1/2">
              <div role="menu" className="flex flex-col py-1.5">
                {[
                  { label: "Invite", icon: UserPlus, onClick: props.onInvite },
                  { label: "Meeting info", icon: Info, onClick: props.onShowInfo },
                  {
                    label: props.view === "gallery" ? "Switch to Speaker view" : "Switch to Gallery view",
                    icon: LayoutGrid,
                    onClick: props.onToggleView,
                  },
                  { label: "Audio & video settings", icon: SlidersHorizontal, onClick: props.onOpenSettings },
                ].map(({ label, icon: Icon, onClick }) => (
                  <button
                    key={label}
                    role="menuitem"
                    onClick={() => {
                      close();
                      onClick();
                    }}
                    className="flex items-center gap-3 px-4 py-2 text-left text-sm hover:bg-room-hover"
                  >
                    <Icon size={17} className="text-white/70" /> {label}
                  </button>
                ))}
              </div>
            </Popover>
          )}
        </div>
      </div>

      <div className="relative" ref={leaveRef}>
        <button
          onClick={() => toggleMenu("leave")}
          aria-expanded={menu === "leave" || menu === "assign"}
          className="rounded-lg bg-zoom-red px-3 py-1.5 text-sm font-bold hover:bg-[#c51f1f] sm:px-4"
        >
          {props.isHost ? "End" : "Leave"}
        </button>

        {menu === "leave" && (
          <Popover className="right-0 w-56">
            <div className="flex flex-col gap-2 p-3">
              {props.isHost && (
                <button onClick={props.onEndForAll} className="rounded-lg bg-zoom-red py-2 text-sm font-bold hover:bg-[#c51f1f]">
                  End Meeting for All
                </button>
              )}
              <button
                onClick={handleLeave}
                className={`rounded-lg py-2 text-sm font-bold ${
                  props.isHost ? "bg-room-hover hover:bg-[#4a4a4a]" : "bg-zoom-red hover:bg-[#c51f1f]"
                }`}
              >
                Leave Meeting
              </button>
            </div>
          </Popover>
        )}

        {menu === "assign" && (
          <Popover className="right-0 w-64">
            <div className="flex flex-col gap-1 p-3">
              <p className="px-1 pb-1 text-sm font-bold">Assign a new host</p>
              <p className="px-1 pb-2 text-xs text-white/60">Choose who takes over before you leave.</p>
              <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                {props.others.map((person) => (
                  <li key={person.id}>
                    <button
                      onClick={() => props.onAssignHostAndLeave(person.id)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-room-hover"
                    >
                      <span className="truncate">{person.name}</span>
                      <span className="shrink-0 text-xs font-bold text-[#4c8dff]">Assign and Leave</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button onClick={() => setMenu("leave")} className="mt-1 rounded-lg py-1.5 text-xs text-white/70 hover:bg-room-hover">
                Back
              </button>
            </div>
          </Popover>
        )}
      </div>
    </footer>
  );
}

/** Mic icon that fills with green as we speak. Its own component so only it re-renders 10×/second. */
function LiveMicIcon({ stream }: { stream: MediaStream | null }) {
  const level = useAudioLevel(stream, true);
  return <MicLevelIcon level={level} size={22} />;
}

/** The small ^ next to Mute and Start Video that opens the Audio & video panel. */
function CaretButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="mt-1 hidden rounded p-0.5 text-white/60 hover:bg-room-hover hover:text-white sm:block"
    >
      <ChevronUp size={14} />
    </button>
  );
}

interface ToolButtonProps {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}

function ToolButton({ label, icon, onClick, active, disabled, className = "" }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex min-w-[48px] flex-col items-center gap-1 rounded-lg px-1.5 py-1.5 sm:px-2 text-[11px] text-white/90 transition-colors hover:bg-room-hover disabled:opacity-40 sm:min-w-[72px] ${
        active ? "bg-room-hover" : ""
      } ${className}`}
    >
      {icon}
      <span className="hidden whitespace-nowrap sm:block">{label}</span>
    </button>
  );
}

function Popover({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`absolute bottom-[calc(100%+10px)] rounded-xl border border-white/10 bg-room-panel shadow-2xl ${className}`}>
      {children}
    </div>
  );
}
