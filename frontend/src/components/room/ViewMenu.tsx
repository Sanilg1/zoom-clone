"use client";

import { Check, ChevronDown, LayoutGrid } from "lucide-react";
import { useRef, useState } from "react";

import { useDismiss } from "@/hooks/useDismiss";
import type { RoomView } from "./VideoGrid";

const VIEWS: { value: RoomView; label: string }[] = [
  { value: "gallery", label: "Gallery" },
  { value: "speaker", label: "Speaker" },
];

/** The "View" menu in the meeting's top-right corner (Gallery / Speaker). */
export function ViewMenu({ view, onChange }: { view: RoomView; onChange: (view: RoomView) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold hover:bg-room-hover ${open ? "bg-room-hover" : ""}`}
      >
        <LayoutGrid size={15} /> View <ChevronDown size={13} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-9 z-30 w-40 overflow-hidden rounded-xl border border-white/10 bg-room-panel py-1 shadow-2xl">
          {VIEWS.map(({ value, label }) => (
            <button
              key={value}
              role="menuitemradio"
              aria-checked={view === value}
              onClick={() => {
                onChange(value);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-room-hover"
            >
              {label}
              {view === value && <Check size={15} className="text-[#4c8dff]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
