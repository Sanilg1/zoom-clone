"use client";

import { MicOff } from "lucide-react";
import { useEffect, useRef } from "react";

import { MicLevelIcon } from "@/components/ui/icons";
import { SPEAKING_LEVEL, useAudioLevel } from "@/hooks/useAudioLevel";

export interface TileData {
  id: number;
  name: string;
  stream: MediaStream | null;
  isSelf: boolean;
  isHost: boolean;
  micOn: boolean;
  videoOn: boolean;
  reactions: string[];
}

interface VideoTileProps {
  tile: TileData;
  /** Show the stream even if the camera flag is off (used for screen shares). */
  forceVideo?: boolean;
  fit?: "cover" | "contain";
  className?: string;
}

export function VideoTile({ tile, forceVideo = false, fit = "cover", className = "" }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const level = useAudioLevel(tile.stream, tile.micOn);
  const speaking = level >= SPEAKING_LEVEL;
  const showVideo = forceVideo || tile.videoOn;

  useEffect(() => {
    const video = videoRef.current;
    if (video && video.srcObject !== tile.stream) video.srcObject = tile.stream;
  }, [tile.stream]);

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-room-tile ring-inset transition-shadow ${
        speaking ? "ring-[3px] ring-zoom-green" : ""
      } ${className}`}
    >
      {/* Video only: sound is played by <RemoteAudio>, so this element is always muted. */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"} ${
          tile.isSelf && !forceVideo ? "mirror" : ""
        } ${showVideo ? "" : "invisible"}`}
      />

      {!showVideo && (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <span className="truncate text-center text-xl font-bold text-white sm:text-3xl">{tile.name}</span>
        </div>
      )}

      <div className="absolute bottom-1.5 left-1.5 flex max-w-[calc(100%-12px)] items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
        {tile.micOn ? (
          <MicLevelIcon level={level} size={13} className="shrink-0" />
        ) : (
          <MicOff size={12} className="shrink-0 text-zoom-red" />
        )}
        <span className="truncate">{tile.name}</span>
      </div>

      <div className="pointer-events-none absolute bottom-7 left-2 flex gap-1">
        {tile.reactions.map((emoji, index) => (
          <span key={index} className="animate-float-up text-3xl">
            {emoji}
          </span>
        ))}
      </div>
    </div>
  );
}
