"use client";

import { useNow } from "@/hooks/useNow";
import { formatLongDate, formatTime } from "@/lib/format";

function partOfDay(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** "Good afternoon, Sanil" with today's date and the time, at the top of Home. */
export function Greeting({ name }: { name?: string }) {
  const now = useNow(30_000);
  const firstName = name?.split(" ")[0];

  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-[26px] font-bold leading-tight sm:text-[30px]">
        {now ? partOfDay(now.getHours()) : "Welcome"}
        {firstName ? `, ${firstName}` : ""}
      </h1>
      <p className="text-sm text-ink-muted tabular-nums">{now ? `${formatLongDate(now)} · ${formatTime(now)}` : " "}</p>
    </div>
  );
}
