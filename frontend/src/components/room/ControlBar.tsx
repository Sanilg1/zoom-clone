"use client";

import { MessageSquare, Mic, MicOff, MonitorUp, Users, Video, VideoOff } from "lucide-react";
import { useState, type ReactNode } from "react";

import { ReactionsIcon } from "@/components/ui/icons";

export const REACTIONS = ["👏", "👍", "❤️", "😂", "😮", "🎉"];

interface ControlBarProps {
  micOn: boolean;
  videoOn: boolean;
  canUseMic: boolean;
  canUseVideo: boolean;
  sharing: boolean;
  participantCount: number;
  unreadMessages: number;
  activePanel: "participants" | "chat" | null;
  isHost: boolean;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onToggleShare: () => void;
  onTogglePanel: (panel: "participants" | "chat") => void;
  onReaction: (emoji: string) => void;
  onLeave: () => void;
  onEndForAll: () => void;
}

/** The toolbar along the bottom of the meeting, laid out like Zoom's. */
export function ControlBar(props: ControlBarProps) {
  const [menu, setMenu] = useState<"reactions" | "leave" | null>(null);
  const toggleMenu = (name: "reactions" | "leave") => setMenu((current) => (current === name ? null : name));

  return (
    <footer className="relative z-20 flex h-[68px] shrink-0 items-center justify-between gap-1 bg-room px-2 text-white sm:px-4">
      <div className="flex">
        <ToolButton
          label={props.micOn ? "Mute" : "Unmute"}
          onClick={props.onToggleMic}
          disabled={!props.canUseMic}
          icon={props.micOn ? <Mic size={22} /> : <MicOff size={22} className="text-zoom-red" />}
        />
        <ToolButton
          label={props.videoOn ? "Stop Video" : "Start Video"}
          onClick={props.onToggleVideo}
          disabled={!props.canUseVideo}
          icon={props.videoOn ? <Video size={22} /> : <VideoOff size={22} className="text-zoom-red" />}
        />
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
        <div className="relative">
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
                      setMenu(null);
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
      </div>

      <div className="relative">
        <button
          onClick={() => toggleMenu("leave")}
          className="rounded-lg bg-zoom-red px-3 py-1.5 text-sm font-bold hover:bg-[#c51f1f] sm:px-4"
        >
          {props.isHost ? "End" : "Leave"}
        </button>
        {menu === "leave" && (
          <Popover className="right-0 w-56">
            <div className="flex flex-col gap-2 p-3">
              {props.isHost && (
                <button
                  onClick={props.onEndForAll}
                  className="rounded-lg bg-zoom-red py-2 text-sm font-bold hover:bg-[#c51f1f]"
                >
                  End Meeting for All
                </button>
              )}
              <button
                onClick={props.onLeave}
                className={`rounded-lg py-2 text-sm font-bold ${
                  props.isHost ? "bg-room-hover hover:bg-[#4a4a4a]" : "bg-zoom-red hover:bg-[#c51f1f]"
                }`}
              >
                Leave Meeting
              </button>
            </div>
          </Popover>
        )}
      </div>
    </footer>
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
      className={`flex min-w-[56px] flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-white/90 transition-colors hover:bg-room-hover disabled:opacity-40 sm:min-w-[72px] ${
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
