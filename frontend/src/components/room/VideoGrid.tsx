"use client";

import { useMediaQuery } from "@/hooks/useMediaQuery";
import { VideoTile, type TileData } from "./VideoTile";

interface VideoGridProps {
  tiles: TileData[];
  /** When someone shares their screen: that participant's tile and the screen stream. */
  presenter: { tile: TileData; stream: MediaStream | null } | null;
}

// Height taken by the top bar and the toolbar, so the grid fits in the rest of the screen.
const CHROME_HEIGHT = 150;

function galleryColumns(count: number, mobile: boolean): number {
  if (mobile) return count <= 2 ? 1 : 2;
  return Math.ceil(Math.sqrt(count));
}

export function VideoGrid({ tiles, presenter }: VideoGridProps) {
  const mobile = useMediaQuery("(max-width: 640px)");

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
            <VideoTile key={tile.id} tile={tile} className="aspect-video w-40 shrink-0 sm:w-full" />
          ))}
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
          <VideoTile key={tile.id} tile={tile} className="aspect-video" />
        ))}
      </div>
    </div>
  );
}
