"use client";

import { useMediaQuery } from "@/hooks/useMediaQuery";
import { VideoTile, type TileData } from "./VideoTile";

export type RoomView = "gallery" | "speaker";

interface VideoGridProps {
  tiles: TileData[];
  /** When someone shares their screen: that participant's tile and the screen stream. */
  presenter: { tile: TileData; stream: MediaStream | null } | null;
  view: RoomView;
  /** Who spoke most recently (shown large in Speaker view). */
  activeSpeakerId: number | null;
  onSpeaking: (participantId: number) => void;
}

// Height taken by the top bar and the toolbar, so the grid fits in the rest of the screen.
const CHROME_HEIGHT = 150;
// …plus the thumbnail strip in Speaker view.
const SPEAKER_CHROME_HEIGHT = 250;

function galleryColumns(count: number, mobile: boolean): number {
  if (mobile) return count <= 2 ? 1 : 2;
  return Math.ceil(Math.sqrt(count));
}

export function VideoGrid({ tiles, presenter, view, activeSpeakerId, onSpeaking }: VideoGridProps) {
  const mobile = useMediaQuery("(max-width: 640px)");

  // Screen share takes over the stage in every view.
  if (presenter) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-2 p-2 sm:flex-row">
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg bg-black">
          <VideoTile
            tile={{ ...presenter.tile, stream: presenter.stream, name: `${presenter.tile.name}'s screen` }}
            forceVideo
            fit="contain"
            className="h-full w-full"
          />
        </div>
        <div className="flex shrink-0 gap-2 overflow-auto sm:w-56 sm:flex-col">
          {tiles.map((tile) => (
            <VideoTile key={tile.id} tile={tile} onSpeaking={onSpeaking} className="aspect-video w-40 shrink-0 sm:w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Speaker view: whoever spoke last fills the stage; everyone else sits in a strip on top.
  if (view === "speaker" && tiles.length > 1) {
    const others = tiles.filter((t) => !t.isSelf);
    const stage = others.find((t) => t.id === activeSpeakerId) ?? others[0];
    const strip = tiles.filter((t) => t.id !== stage.id);
    return (
      <div className="flex h-full min-h-0 flex-col gap-2 p-2">
        <div className="flex shrink-0 justify-center gap-2 overflow-x-auto">
          {strip.map((tile) => (
            <VideoTile key={tile.id} tile={tile} onSpeaking={onSpeaking} className="aspect-video w-32 shrink-0 sm:w-44" />
          ))}
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <VideoTile
            tile={stage}
            onSpeaking={onSpeaking}
            className="aspect-video"
            style={{ width: `min(100%, calc((100dvh - ${SPEAKER_CHROME_HEIGHT}px) * 16 / 9))` }}
          />
        </div>
      </div>
    );
  }

  const columns = galleryColumns(tiles.length, mobile);
  const rows = Math.ceil(tiles.length / columns);

  return (
    <div className="flex h-full items-center justify-center p-2 sm:p-4">
      <div
        className="grid w-full gap-2"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          // Widest the grid can be while every 16:9 row still fits vertically.
          maxWidth: `calc((100dvh - ${CHROME_HEIGHT}px) / ${rows} * 16 / 9 * ${columns})`,
        }}
      >
        {tiles.map((tile) => (
          <VideoTile key={tile.id} tile={tile} onSpeaking={onSpeaking} className="aspect-video" />
        ))}
      </div>
    </div>
  );
}
